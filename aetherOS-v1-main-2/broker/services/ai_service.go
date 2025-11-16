
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
)

// AIService handles AI-related requests from the message bus.
type AIService struct {
	broker   *aether.Broker
	aiModule *aether.AIModule
	vfs      *aether.VFSModule // Add VFS module to read file contents
}

// NewAIService creates a new AI service.
func NewAIService(broker *aether.Broker, aiModule *aether.AIModule, vfs *aether.VFSModule) *AIService {
	return &AIService{
		broker:   broker,
		aiModule: aiModule,
		vfs:      vfs,
	}
}

// Run starts the AI service's listener for multiple topics.
func (s *AIService) Run() {
	aiTopics := []string{
		"ai:generate",
		"ai:generate:page",
		"ai:design:component",
		"ai:agent",
		"ai:search:files",
		"ai:generate:palette",
		"ai:generate:accent",
		"ai:summarize:code",
		"ai:generate:image",
		"agent:execute:node",
	}

	for _, topicName := range aiTopics {
		topic := s.broker.GetTopic(topicName)
		log.Printf("AI Service listening on topic: %s", topicName)
		broadcastChan := topic.GetBroadcastChan()

		go func(tName string, ch chan *aether.Envelope) {
			for envelope := range ch {
				go s.handleRequest(envelope)
			}
		}(topicName, broadcastChan)
	}
}

func (s *AIService) handleRequest(env *aether.Envelope) {
	log.Printf("AI Service processing message ID %s on topic %s", env.ID, env.Topic)

	var responsePayload interface{}
	var err error

	// The envelope is now clean, so env.Payload is the direct data we need.
	rawPayload := env.Payload

	// Route based on topic
	switch env.Topic {
	case "agent:execute:node":
		var payloadData struct {
			GraphID string         `json:"graphId"`
			NodeID  string         `json:"nodeId"`
			Tool    string         `json:"tool"`
			Input   map[string]any `json:"input"`
		}
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			s.publishError(env, "Invalid payload for agent:execute:node")
			return
		}

		s.publishResponse(env, "agent.tasknode.started", map[string]string{
			"graphId": payloadData.GraphID,
			"nodeId":  payloadData.NodeID,
		})

		var toolResult map[string]any
		var toolErr string = ""

		switch payloadData.Tool {
		case "vfs:read":
			if path, ok := payloadData.Input["path"].(string); ok {
				content, readErr := s.vfs.Read(path)
				if readErr != nil {
					toolErr = readErr.Error()
				} else {
					toolResult = map[string]any{"output": content}
				}
			}
		case "vfs:write":
			path, pathOk := payloadData.Input["path"].(string)
			content, contentOk := payloadData.Input["content"].(string)
			if pathOk && contentOk {
				writeErr := s.vfs.Write(path, []byte(content))
				if writeErr != nil {
					toolErr = writeErr.Error()
				} else {
					toolResult = map[string]any{"output": "File written successfully."}
				}
			}
		case "ai:summarize:code":
			if path, ok := payloadData.Input["filePath"].(string); ok {
				fileContent, readErr := s.vfs.Read(path)
				if readErr != nil {
					toolErr = readErr.Error()
				} else {
					summaryJSON, sumErr := s.aiModule.SummarizeCode(fileContent)
					if sumErr != nil {
						toolErr = sumErr.Error()
					} else {
						toolResult = map[string]any{"output": summaryJSON}
					}
				}
			}
		default:
			toolErr = "Unknown tool: " + payloadData.Tool
		}

		if toolErr != "" {
			s.publishResponse(env, "agent.tasknode.failed", map[string]string{
				"graphId": payloadData.GraphID,
				"nodeId":  payloadData.NodeID,
				"error":   toolErr,
			})
		} else {
			s.publishResponse(env, "agent.tasknode.completed", map[string]interface{}{
				"graphId": payloadData.GraphID,
				"nodeId":  payloadData.NodeID,
				"result":  toolResult,
			})
		}
		return // Exit early as we have handled the full lifecycle here

	case "ai:generate:image":
		var payloadData struct {
			Prompt string `json:"prompt"`
		}
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			s.publishError(env, "Invalid payload for image generation")
			return
		}
		generatedImageURI, genErr := s.aiModule.GenerateImage(payloadData.Prompt)
		if genErr != nil {
			s.publishError(env, genErr.Error())
			return
		}
		responsePayload = map[string]string{"imageUrl": generatedImageURI}

	case "ai:search:files":
		var payloadData struct {
			Query          string   `json:"query"`
			AvailableFiles []string `json:"availableFiles"`
		}
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			s.publishError(env, "Invalid payload for file search")
			return
		}
		jsonString, searchErr := s.aiModule.SemanticFileSearch(payloadData.Query, payloadData.AvailableFiles)
		if searchErr != nil {
			err = searchErr
		} else {
			var temp interface{}
			if unmarshalErr := json.Unmarshal([]byte(jsonString), &temp); unmarshalErr != nil {
				err = unmarshalErr
			} else {
				responsePayload = temp
			}
		}

	case "ai:summarize:code":
		var payloadData struct {
			FilePath string `json:"filePath"`
		}
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			s.publishError(env, "Invalid payload for code summarization")
			return
		}
		fileContent, readErr := s.vfs.Read(payloadData.FilePath)
		if readErr != nil {
			s.publishError(env, "Could not read file for summarization")
			return
		}
		summaryJSON, sumErr := s.aiModule.SummarizeCode(fileContent)
		if sumErr != nil {
			err = sumErr
		} else {
			responsePayload = map[string]interface{}{
				"summary":  summaryJSON,
				"filePath": payloadData.FilePath,
			}
		}

	case "ai:agent":
		var payloadData struct {
			Prompt string `json:"prompt"`
		}
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			s.publishError(env, "Invalid payload for agent request")
			return
		}

		graphJSON, graphErr := s.aiModule.GenerateTaskGraph(payloadData.Prompt)
		if graphErr != nil {
			err = graphErr
		} else {
			var temp interface{}
			if unmarshalErr := json.Unmarshal([]byte(graphJSON), &temp); unmarshalErr != nil {
				err = unmarshalErr
			} else {
				s.publishResponse(env, "agent.taskgraph.created", temp)
			}
		}
		return // Exit early, response is published separately by the agent service.

	default: // Handle all other text-based generation topics
		var payloadData map[string]string
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			var promptStr string
			if errStr := json.Unmarshal(rawPayload, &promptStr); errStr == nil {
				payloadData = map[string]string{"prompt": promptStr}
			} else {
				s.publishError(env, "Invalid payload format for AI generation")
				return
			}
		}

		prompt, ok := payloadData["prompt"]
		if !ok {
			if p, ok := payloadData["topic"]; ok {
				prompt = p
			} else if p, ok := payloadData["description"]; ok {
				prompt = p
			} else if p, ok := payloadData["contentDescription"]; ok {
				prompt = p
			}
		}

		if prompt == "" {
			s.publishError(env, "Empty prompt received")
			return
		}

		switch env.Topic {
		case "ai:generate":
			responsePayload, err = s.aiModule.GenerateText(prompt)
		case "ai:generate:page":
			responsePayload, err = s.aiModule.GenerateWebPage(prompt)
		case "ai:design:component":
			responsePayload, err = s.aiModule.DesignComponent(prompt)
		case "ai:generate:palette":
			responsePayload, err = s.aiModule.GenerateAdaptivePalette(prompt)
		case "ai:generate:accent":
			responsePayload, err = s.aiModule.GenerateAccentColor(prompt)
		default:
			responsePayload, err = s.aiModule.GenerateText(prompt)
		}
	}

	if err != nil {
		log.Printf("error processing AI request on topic %s: %v", env.Topic, err)
		s.publishError(env, err.Error())
		return
	}

	if env.Topic != "ai:agent" && env.Topic != "agent:execute:node" {
		responseTopicName := env.Topic + ":resp"
		s.publishResponse(env, responseTopicName, responsePayload)
	}
}

func (s *AIService) publishResponse(originalEnv *aether.Envelope, topicName string, payload interface{}) {
	responseTopic := s.broker.GetTopic(topicName)

	responsePayloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Failed to marshal response payload: %v", err)
		s.publishError(originalEnv, "Internal server error: could not create response")
		return
	}

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       topicName,
		Type:        "ai_response",
		ContentType: "application/json",
		Payload:     responsePayloadBytes,
		CreatedAt:   time.Now(),
	}
	if originalEnv != nil {
		responseEnv.Meta = []byte(`{"correlationId": "` + originalEnv.ID + `"}`)
	}

	log.Printf("AI Service publishing response to topic: %s", topicName)
	responseTopic.Publish(responseEnv)
}

func (s *AIService) publishError(originalEnv *aether.Envelope, errorMsg string) {
	errorTopicName := originalEnv.Topic + ":error"
	errorTopic := s.broker.GetTopic(errorTopicName)

	errorPayload := map[string]string{"error": errorMsg}
	payloadBytes, _ := json.Marshal(errorPayload)

	errorEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       errorTopicName,
		Type:        "error",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
	}
	if originalEnv != nil {
		errorEnv.Meta = []byte(`{"correlationId": "` + originalEnv.ID + `"}`)
	}
	log.Printf("AI Service publishing error to topic: %s", errorTopicName)
	errorTopic.Publish(errorEnv)
}
