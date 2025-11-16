
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// TaskExecutorService handles the actual execution of a single tool from a TaskGraph node.
type TaskExecutorService struct {
	broker      *aether.Broker
	vfs         *aether.VFSModule
	aiModule    *aether.AIModule
	permissions *aether.PermissionManager
}

// NewTaskExecutorService creates a new task executor service.
func NewTaskExecutorService(broker *aether.Broker, vfs *aether.VFSModule, aiModule *aether.AIModule, permissions *aether.PermissionManager) *TaskExecutorService {
	return &TaskExecutorService{
		broker:      broker,
		vfs:         vfs,
		aiModule:    aiModule,
		permissions: permissions,
	}
}

// Run starts the service's listener.
func (s *TaskExecutorService) Run() {
	topic := s.broker.GetTopic("agent:execute:node")
	log.Printf("Task Executor Service listening on topic: %s", "agent:execute:node")
	broadcastChan := topic.GetBroadcastChan()

	for envelope := range broadcastChan {
		go s.handleRequest(envelope)
	}
}

func (s *TaskExecutorService) handleRequest(env *aether.Envelope) {
	var payloadData struct {
		GraphID string         `json:"graphId"`
		NodeID  string         `json:"nodeId"`
		Tool    string         `json:"tool"`
		Input   map[string]any `json:"input"`
	}
	if err := json.Unmarshal(env.Payload, &payloadData); err != nil {
		s.publishError(env, payloadData.GraphID, payloadData.NodeID, "Invalid payload for agent:execute:node: "+err.Error())
		return
	}

	var meta struct {
		AppId string `json:"appId"`
	}
	if err := json.Unmarshal(env.Meta, &meta); err != nil {
		s.publishError(env, payloadData.GraphID, payloadData.NodeID, "Invalid metadata: could not determine origin app for permission check")
		return
	}
	appId := meta.AppId

	s.publish(env, "agent.tasknode.started", map[string]string{
		"graphId": payloadData.GraphID,
		"nodeId":  payloadData.NodeID,
	})

	log.Printf("Task Executor: Executing tool '%s' for node %s (requested by app: %s)", payloadData.Tool, payloadData.NodeID, appId)

	var toolResult map[string]any
	var toolErr string

	// Check permissions before executing the tool
	if !s.checkPermissionsForTool(appId, payloadData.Tool) {
		toolErr = fmt.Sprintf("Permission denied for app '%s' to use tool '%s'", appId, payloadData.Tool)
	} else {
		switch payloadData.Tool {
		case "vm:run":
			if wasm, ok := payloadData.Input["wasmBase64"].(string); ok {
				// Delegate to the ComputeService by publishing a message, inheriting metadata
				s.publish(env, "vm:create", map[string]any{"wasmBase64": wasm})
				toolResult = map[string]any{"output": "WASM execution started."}
			} else {
				toolErr = "Invalid input for vm:run: wasmBase64 must be a string."
			}

		case "vfs:read":
			if path, ok := payloadData.Input["path"].(string); ok {
				content, readErr := s.vfs.Read(path)
				if readErr != nil {
					toolErr = readErr.Error()
				} else {
					toolResult = map[string]any{"output": content}
				}
			} else {
				toolErr = "Invalid input for vfs:read: path must be a string."
			}

		case "vfs:write":
			path, pathOk := payloadData.Input["path"].(string)
			content, contentOk := payloadData.Input["content"].(string) // Assume content is now always a string after template resolution
			if pathOk && contentOk {
				writeErr := s.vfs.Write(path, []byte(content))
				if writeErr != nil {
					toolErr = writeErr.Error()
				} else {
					toolResult = map[string]any{"output": "File written successfully."}
				}
			} else {
				toolErr = "Invalid input for vfs:write: path and content must be strings."
			}

		case "ai:summarize:code": // Note: This tool name is kept for backward compatibility with existing graph generation logic
			if path, ok := payloadData.Input["filePath"].(string); ok {
				fileContent, readErr := s.vfs.Read(path)
				if readErr != nil {
					toolErr = readErr.Error()
				} else {
					summaryJSON, sumErr := s.aiModule.SummarizeCode(fileContent)
					if sumErr != nil {
						toolErr = sumErr.Error()
					} else {
						var summaryMap map[string]string
						if jsonErr := json.Unmarshal([]byte(summaryJSON), &summaryMap); jsonErr != nil {
							toolErr = "Failed to parse summary JSON: " + jsonErr.Error()
						} else {
							toolResult = map[string]any{"output": summaryMap["summary"]}
						}
					}
				}
			} else {
				toolErr = "Invalid input for ai:summarize:code: filePath must be a string."
			}
		default:
			toolErr = "Unknown tool: " + payloadData.Tool
		}
	}

	if toolErr != "" {
		log.Printf("Task Executor: FAILED tool '%s' for node %s: %s", payloadData.Tool, payloadData.NodeID, toolErr)
		s.publishError(env, payloadData.GraphID, payloadData.NodeID, toolErr)
	} else {
		log.Printf("Task Executor: COMPLETED tool '%s' for node %s", payloadData.Tool, payloadData.NodeID)
		s.publish(env, "agent.tasknode.completed", map[string]interface{}{
			"graphId": payloadData.GraphID,
			"nodeId":  payloadData.NodeID,
			"result":  toolResult,
		})
	}
}

func (s *TaskExecutorService) checkPermissionsForTool(appId string, toolName string) bool {
	switch toolName {
	case "vfs:read", "ai:summarize:code": // summarize needs to read
		return s.permissions.HasPermission(appId, "filesystem_read")
	case "vfs:write":
		return s.permissions.HasPermission(appId, "filesystem_write")
	case "vm:run":
		return s.permissions.HasPermission(appId, "vm_run")
	default:
		// By default, deny unknown tools.
		return false
	}
}

// publish is a helper to send messages to the bus.
func (s *TaskExecutorService) publish(originalEnv *aether.Envelope, topicName string, payload interface{}) {
	responseTopic := s.broker.GetTopic(topicName)
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Task Executor Service: Failed to marshal payload for topic %s: %v", topicName, err)
		return
	}

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       topicName,
		Type:        "executor_event",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
		Meta:        originalEnv.Meta,
	}

	responseTopic.Publish(responseEnv)
}

func (s *TaskExecutorService) publishError(originalEnv *aether.Envelope, graphId, nodeId, errorMsg string) {
	s.publish(originalEnv, "agent.tasknode.failed", map[string]string{
		"graphId": graphId,
		"nodeId":  nodeId,
		"error":   errorMsg,
	})
}

    