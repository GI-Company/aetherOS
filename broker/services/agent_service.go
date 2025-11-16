
package services

import (
	"aether/broker/aether"
	"aether/broker/agent"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"regexp"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// AgentService handles the orchestration of multi-step AI tasks (TaskGraphs).
type AgentService struct {
	broker         *aether.Broker
	firestore      *firestore.Client // Add firestore client
	graphUpdateSub chan *aether.Envelope
}

// NewAgentService creates a new agent service.
func NewAgentService(broker *aether.Broker, firestore *firestore.Client) *AgentService {
	return &AgentService{
		broker:         broker,
		firestore:      firestore,
		graphUpdateSub: make(chan *aether.Envelope, 256),
	}
}

// Run starts the agent service's listeners.
func (s *AgentService) Run() {
	log.Println("Agent Service is running.")

	// Listen for new task graphs being created. This is the entry point for autonomous execution.
	graphCreatedTopic := s.broker.GetTopic("agent.taskgraph.created")
	go func(ch chan *aether.Envelope) {
		for envelope := range ch {
			s.graphUpdateSub <- envelope
		}
	}(graphCreatedTopic.GetBroadcastChan())

	// Listen for node completion events to trigger the next steps
	nodeCompletedTopic := s.broker.GetTopic("agent.tasknode.completed")
	go func(ch chan *aether.Envelope) {
		for envelope := range ch {
			s.graphUpdateSub <- envelope
		}
	}(nodeCompletedTopic.GetBroadcastChan())

	// Listen for node failure events to halt the graph
	nodeFailedTopic := s.broker.GetTopic("agent.tasknode.failed")
	go func(ch chan *aether.Envelope) {
		for envelope := range ch {
			s.graphUpdateSub <- envelope
		}
	}(nodeFailedTopic.GetBroadcastChan())

	// Start the main processing loop
	go s.processGraphUpdates()

	select {} // Keep the service alive
}

// processGraphUpdates is the main event loop for the agent, ensuring serial processing of graph state changes.
func (s *AgentService) processGraphUpdates() {
	for env := range s.graphUpdateSub {
		switch env.Topic {
		case "agent.taskgraph.created":
			s.handleGraphCreated(env)
		case "agent.tasknode.completed":
			s.handleNodeCompleted(env)
		case "agent.tasknode.failed":
			s.handleNodeFailed(env)
		}
	}
}

func (s *AgentService) getGraph(ctx context.Context, graphID string) (*agent.TaskGraph, error) {
	doc, err := s.firestore.Collection("taskGraphs").Doc(graphID).Get(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get task graph %s: %w", graphID, err)
	}
	var graph agent.TaskGraph
	if err := doc.DataTo(&graph); err != nil {
		return nil, fmt.Errorf("failed to decode task graph %s: %w", graphID, err)
	}
	return &graph, nil
}

func (s *AgentService) handleGraphCreated(env *aether.Envelope) {
	var payload struct {
		TaskGraph agent.TaskGraph `json:"taskGraph"`
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		log.Printf("Agent Service: failed to unmarshal task graph: %v", err)
		return
	}

	graph := payload.TaskGraph
	graph.Status = "pending"
	graph.NodeStates = make(map[string]*agent.TaskNodeStatus)
	graph.NodeResults = make(map[string]any)
	for _, node := range graph.Nodes {
		graph.NodeStates[node.ID] = &agent.TaskNodeStatus{
			NodeID: node.ID,
			Status: "pending",
		}
	}
	
	ctx := context.Background()
	_, err := s.firestore.Collection("taskGraphs").Doc(graph.ID).Set(ctx, graph)
	if err != nil {
		log.Printf("Agent Service: Failed to save new task graph %s to Firestore: %v", graph.ID, err)
		return
	}
	
	log.Printf("Agent Service: Registered and starting execution for new task graph ID %s", graph.ID)
	// AUTONOMOUS TRIGGER: Immediately start the execution process.
	s.publish(env, "agent.taskgraph.started", map[string]string{"graphId": graph.ID})
	s.evaluateAndRunNextNodes(graph.ID, env)
}

func (s *AgentService) handleNodeCompleted(env *aether.Envelope) {
	var payload struct {
		GraphID string `json:"graphId"`
		NodeID  string `json:"nodeId"`
		Result  any    `json:"result"` // Expect a result field
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		log.Printf("Agent Service: failed to unmarshal node completed payload: %v", err)
		return
	}

	graphID := payload.GraphID
	nodeID := payload.NodeID
	ctx := context.Background()
	graphRef := s.firestore.Collection("taskGraphs").Doc(graphID)

	err := s.firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(graphRef)
		if err != nil {
			return err
		}

		var graph agent.TaskGraph
		if err := doc.DataTo(&graph); err != nil {
			return err
		}
		
		if graph.NodeStates[nodeID] == nil {
			return fmt.Errorf("node %s not found in graph %s", nodeID, graphID)
		}

		graph.NodeStates[nodeID].Status = "completed"
		graph.NodeStates[nodeID].FinishedAt = time.Now().UnixMilli()
		graph.NodeResults[nodeID] = payload.Result

		return tx.Set(graphRef, graph)
	})

	if err != nil {
		log.Printf("Agent Service: Transaction failed for node completion (%s): %v", nodeID, err)
		return
	}

	log.Printf("Agent Service: Node %s in graph %s completed. Evaluating next steps.", nodeID, graphID)
	s.evaluateAndRunNextNodes(graphID, env)
}

func (s *AgentService) handleNodeFailed(env *aether.Envelope) {
	var payload struct {
		GraphID string `json:"graphId"`
		NodeID  string `json:"nodeId"`
		Error   string `json:"error"`
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		log.Printf("Agent Service: failed to unmarshal node failed payload: %v", err)
		return
	}

	graphID := payload.GraphID
	nodeID := payload.NodeID
	ctx := context.Background()
	graphRef := s.firestore.Collection("taskGraphs").Doc(graphID)
	
	err := s.firestore.RunTransaction(ctx, func(ctx context.Context, tx *firestore.Transaction) error {
		doc, err := tx.Get(graphRef)
		if status.Code(err) == codes.NotFound {
			log.Printf("Agent Service: Graph %s not found for failed node %s. Ignoring.", graphID, nodeID)
			return nil
		}
		if err != nil {
			return err
		}
		
		var graph agent.TaskGraph
		if err := doc.DataTo(&graph); err != nil {
			return err
		}

		if graph.NodeStates[nodeID] != nil {
			graph.NodeStates[nodeID].Status = "failed"
			graph.NodeStates[nodeID].FinishedAt = time.Now().UnixMilli()
			graph.NodeStates[nodeID].Error = payload.Error
		}

		graph.Status = "failed"
		graph.FinishedAt = time.Now().UnixMilli()
		graph.Error = "Execution failed at node " + nodeID

		return tx.Set(graphRef, graph)
	})


	if err != nil {
		log.Printf("Agent Service: Transaction failed for node failure (%s): %v", nodeID, err)
		return
	}


	log.Printf("Agent Service: Node %s in graph %s FAILED. Halting graph execution.", nodeID, graphID)
	s.publish(env, "agent.taskgraph.failed", map[string]string{
		"graphId": graphID,
		"error":   "Execution failed at node " + nodeID,
	})
	// Do not run next nodes, the graph is now in a failed state.
}

// resolveInput resolves template variables in a node's input map.
func (s *AgentService) resolveInput(graph *agent.TaskGraph, input map[string]any) (map[string]any, error) {
	resolvedInput := make(map[string]any)
	re := regexp.MustCompile(`\{\{([a-zA-Z0-9_]+)\.output\}\}`)

	for key, val := range input {
		if strVal, ok := val.(string); ok {
			matches := re.FindStringSubmatch(strVal)
			if len(matches) > 1 {
				depNodeID := matches[1]
				depResult, ok := graph.NodeResults[depNodeID]
				if !ok {
					return nil, fmt.Errorf("dependency result for node '%s' not found", depNodeID)
				}

				// The result itself is a map like {"output": "some value"}
				resultMap, ok := depResult.(map[string]any)
				if !ok {
					return nil, fmt.Errorf("dependency result for node '%s' is not a map", depNodeID)
				}

				outputValue, ok := resultMap["output"]
				if !ok {
					return nil, fmt.Errorf("dependency result for node '%s' does not have an 'output' key", depNodeID)
				}

				// Replace the entire string with the output value.
				resolvedInput[key] = outputValue
			} else {
				resolvedInput[key] = val // No template found, use original value
			}
		} else {
			resolvedInput[key] = val // Not a string, use original value
		}
	}

	return resolvedInput, nil
}

// evaluateAndRunNextNodes checks the graph for nodes that can now be run and triggers them.
func (s *AgentService) evaluateAndRunNextNodes(graphID string, originalEnv *aether.Envelope) {
	ctx := context.Background()
	graph, err := s.getGraph(ctx, graphID)
	if err != nil {
		log.Printf("Agent Service: could not get graph %s for evaluation: %v", graphID, err)
		return
	}
	
	// If graph is already in a terminal state, do nothing.
	if graph.Status == "completed" || graph.Status == "failed" {
		return
	}

	nodesToRun := []agent.TaskNode{}
	allNodesComplete := true

	for _, node := range graph.Nodes {
		nodeStatus := graph.NodeStates[node.ID]

		if nodeStatus.Status != "completed" {
			allNodesComplete = false
		}

		if nodeStatus.Status == "pending" {
			dependenciesMet := true
			for _, depID := range node.DependsOn {
				if graph.NodeStates[depID].Status != "completed" {
					dependenciesMet = false
					break
				}
			}
			if dependenciesMet {
				nodesToRun = append(nodesToRun, node)
			}
		}
	}
	
	if len(nodesToRun) > 0 {
		for _, node := range nodesToRun {
			resolvedInput, err := s.resolveInput(graph, node.Input)
			if err != nil {
				log.Printf("Agent Service: FAILED to resolve inputs for node %s: %v", node.ID, err)
				failureEnv := &aether.Envelope{
					ID:        uuid.New().String(),
					Topic:     "agent.tasknode.failed",
					Type:      "agent_event",
					Payload:   []byte(fmt.Sprintf(`{"graphId":"%s", "nodeId":"%s", "error":"%s"}`, graphID, node.ID, err.Error())),
					CreatedAt: time.Now(),
				}
				s.handleNodeFailed(failureEnv)
				continue 
			}

			// Mark node as running in Firestore
			node.Input = resolvedInput
			updatePath := fmt.Sprintf("NodeStates.%s.Status", node.ID)
			startedPath := fmt.Sprintf("NodeStates.%s.StartedAt", node.ID)
			_, err = s.firestore.Collection("taskGraphs").Doc(graphID).Update(ctx, []firestore.Update{
				{Path: updatePath, Value: "running"},
				{Path: startedPath, Value: time.Now().UnixMilli()},
			})
			if err != nil {
				log.Printf("Agent Service: Failed to mark node %s as running: %v", node.ID, err)
				continue
			}

			log.Printf("Agent Service: Dispatching node %s for execution.", node.ID)
			s.publish(originalEnv, "agent:execute:node", map[string]interface{}{
				"graphId": graphID,
				"nodeId":  node.ID,
				"tool":    node.Tool,
				"input":   resolvedInput,
			})
		}
	} else if allNodesComplete {
		log.Printf("Agent Service: Graph %s has completed successfully.", graphID)
		s.firestore.Collection("taskGraphs").Doc(graphID).Update(ctx, []firestore.Update{
			{Path: "Status", Value: "completed"},
			{Path: "FinishedAt", Value: time.Now().UnixMilli()},
		})
		s.publish(originalEnv, "agent.taskgraph.completed", map[string]string{"graphId": graphID})
	}
}

// publish is a helper to send messages to the bus.
func (s *AgentService) publish(originalEnv *aether.Envelope, topicName string, payload interface{}) {
	responseTopic := s.broker.GetTopic(topicName)
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Agent Service: Failed to marshal payload for topic %s: %v", topicName, err)
		return
	}

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       topicName,
		Type:        "agent_event",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
	}
	if originalEnv != nil {
		metaMap := make(map[string]string)
		if originalEnv.ID != "" {
			metaMap["correlationId"] = originalEnv.ID
		}
		if graphIDProvider, ok := payload.(map[string]string); ok {
			if graphID, ok := graphIDProvider["graphId"]; ok {
				metaMap["graphId"] = graphID
			}
		} else if graphIDProvider, ok := payload.(map[string]interface{}); ok {
			if graphID, ok := graphIDProvider["graphId"].(string); ok {
				metaMap["graphId"] = graphID
			}
		}

		if len(metaMap) > 0 {
			metaBytes, _ := json.Marshal(metaMap)
			responseEnv.Meta = metaBytes
		}
	}

	responseTopic.Publish(responseEnv)
}
