
package services

import (
	"aether/broker/aether"
	"aether/broker/agent"
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// AgentService handles the orchestration of multi-step AI tasks (TaskGraphs).
type AgentService struct {
	broker *aether.Broker
	// In a real system, this would be backed by a persistent database (e.g., SQLite, Firestore).
	// For this prototype, we'll store graphs and their states in memory.
	activeGraphs   map[string]*agent.TaskGraph
	nodeStates     map[string]map[string]*agent.TaskNodeStatus
	mu             sync.RWMutex
	graphUpdateSub chan *aether.Envelope
}

// NewAgentService creates a new agent service.
func NewAgentService(broker *aether.Broker) *AgentService {
	return &AgentService{
		broker:       broker,
		activeGraphs: make(map[string]*agent.TaskGraph),
		nodeStates:   make(map[string]map[string]*agent.TaskNodeStatus),
		// A dedicated channel to serialize updates to graphs
		graphUpdateSub: make(chan *aether.Envelope, 256),
	}
}

// Run starts the agent service's listeners.
func (s *AgentService) Run() {
	log.Println("Agent Service is running.")

	// Listen for new task graphs being created
	graphCreatedTopic := s.broker.GetTopic("agent.taskgraph.created")
	go func(ch chan *aether.Envelope) {
		for envelope := range ch {
			s.graphUpdateSub <- envelope
		}
	}(graphCreatedTopic.GetBroadcastChan())

	// Listen for requests to execute a graph
	graphExecuteTopic := s.broker.GetTopic("agent:graph:execute")
	go func(ch chan *aether.Envelope) {
		for envelope := range ch {
			s.graphUpdateSub <- envelope
		}
	}(graphExecuteTopic.GetBroadcastChan())

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
		case "agent:graph:execute":
			s.handleGraphExecute(env)
		case "agent.tasknode.completed":
			s.handleNodeCompleted(env)
		case "agent.tasknode.failed":
			s.handleNodeFailed(env)
		}
	}
}

func (s *AgentService) handleGraphCreated(env *aether.Envelope) {
	var payload struct {
		TaskGraph agent.TaskGraph `json:"taskGraph"`
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		log.Printf("Agent Service: failed to unmarshal task graph: %v", err)
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	graphID := payload.TaskGraph.ID
	s.activeGraphs[graphID] = &payload.TaskGraph
	s.nodeStates[graphID] = make(map[string]*agent.TaskNodeStatus)
	for _, node := range payload.TaskGraph.Nodes {
		s.nodeStates[graphID][node.ID] = &agent.TaskNodeStatus{
			NodeID: node.ID,
			Status: "pending",
		}
	}
	log.Printf("Agent Service: Registered new task graph ID %s", graphID)
}

func (s *AgentService) handleGraphExecute(env *aether.Envelope) {
	var payload struct {
		GraphID string `json:"graphId"`
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		log.Printf("Agent Service: failed to unmarshal graph execute payload: %v", err)
		return
	}
	graphID := payload.GraphID

	s.mu.RLock()
	_, ok := s.activeGraphs[graphID]
	s.mu.RUnlock()

	if !ok {
		log.Printf("Agent Service: attempt to execute unknown graph ID %s", graphID)
		return
	}

	log.Printf("Agent Service: Starting execution for graph ID %s", graphID)
	s.publish(env, "agent.taskgraph.started", map[string]string{"graphId": graphID})
	// Trigger the first set of runnable nodes
	s.evaluateAndRunNextNodes(graphID, env)
}

func (s *AgentService) handleNodeCompleted(env *aether.Envelope) {
	var payload struct {
		GraphID string `json:"graphId"`
		NodeID  string `json:"nodeId"`
	}
	if err := json.Unmarshal(env.Payload, &payload); err != nil {
		log.Printf("Agent Service: failed to unmarshal node completed payload: %v", err)
		return
	}

	graphID := payload.GraphID
	nodeID := payload.NodeID

	s.mu.Lock()
	if _, ok := s.activeGraphs[graphID]; ok {
		s.nodeStates[graphID][nodeID].Status = "completed"
		s.nodeStates[graphID][nodeID].FinishedAt = time.Now().UnixMilli()
	}
	s.mu.Unlock()

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

	s.mu.Lock()
	if _, ok := s.activeGraphs[graphID]; ok {
		s.nodeStates[graphID][nodeID].Status = "failed"
		s.nodeStates[graphID][nodeID].FinishedAt = time.Now().UnixMilli()
		s.nodeStates[graphID][nodeID].Error = payload.Error
	}
	s.mu.Unlock()

	log.Printf("Agent Service: Node %s in graph %s FAILED. Halting graph execution.", nodeID, graphID)
	s.publish(env, "agent.taskgraph.failed", map[string]string{
		"graphId": graphID,
		"error":   "Execution failed at node " + nodeID,
	})
	// Do not run next nodes, the graph is now in a failed state.
}

// evaluateAndRunNextNodes checks the graph for nodes that can now be run and triggers them.
func (s *AgentService) evaluateAndRunNextNodes(graphID string, originalEnv *aether.Envelope) {
	s.mu.RLock()
	graph, ok := s.activeGraphs[graphID]
	if !ok {
		s.mu.RUnlock()
		return
	}

	nodesToRun := []agent.TaskNode{}
	allNodesComplete := true

	for _, node := range graph.Nodes {
		nodeStatus := s.nodeStates[graphID][node.ID]

		if nodeStatus.Status != "completed" {
			allNodesComplete = false
		}

		if nodeStatus.Status == "pending" {
			dependenciesMet := true
			for _, depID := range node.DependsOn {
				if s.nodeStates[graphID][depID].Status != "completed" {
					dependenciesMet = false
					break
				}
			}
			if dependenciesMet {
				nodesToRun = append(nodesToRun, node)
			}
		}
	}
	s.mu.RUnlock()

	if len(nodesToRun) > 0 {
		for _, node := range nodesToRun {
			s.mu.Lock()
			s.nodeStates[graphID][node.ID].Status = "running"
			s.nodeStates[graphID][node.ID].StartedAt = time.Now().UnixMilli()
			s.mu.Unlock()

			log.Printf("Agent Service: Dispatching node %s for execution.", node.ID)
			s.publish(originalEnv, "agent:execute:node", map[string]interface{}{
				"graphId": graphID,
				"nodeId":  node.ID,
				"tool":    node.Tool,
				"input":   node.Input, // Pass the full input map
			})
		}
	} else if allNodesComplete {
		log.Printf("Agent Service: Graph %s has completed successfully.", graphID)
		s.publish(originalEnv, "agent.taskgraph.completed", map[string]string{"graphId": graphID})
		// Clean up the completed graph from memory
		s.mu.Lock()
		delete(s.activeGraphs, graphID)
		delete(s.nodeStates, graphID)
		s.mu.Unlock()
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
		responseEnv.Meta = []byte(`{"correlationId": "` + originalEnv.ID + `"}`)
	}

	responseTopic.Publish(responseEnv)
}
