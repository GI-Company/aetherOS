
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
)

// AIService handles AI-related requests from the message bus.
type AIService struct {
	broker   *aether.Broker
	aiModule *aether.AIModule
	vfs      *aether.VFSModule // Still needed for summarization
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
	rawPayload := env.Payload

	switch env.Topic {
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
			err = genErr
		} else {
			responsePayload = map[string]string{"imageUrl": generatedImageURI}
		}

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
			s.publishError(env, "Could not read file for summarization: "+readErr.Error())
			return
		}
		summaryJSON, sumErr := s.aiModule.SummarizeCode(fileContent)
		if sumErr != nil {
			err = sumErr
		} else {
			// The summary is already a JSON string `{"summary":"..."}`
			var summaryMap map[string]string
			if jsonErr := json.Unmarshal([]byte(summaryJSON), &summaryMap); jsonErr != nil {
				err = jsonErr
			} else {
				responsePayload = map[string]interface{}{
					"summary":  summaryMap["summary"],
					"filePath": payloadData.FilePath,
				}
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
				// The AI service's only job is to create the graph.
				// The AgentService will handle orchestration.
				s.publishResponse(env, "agent.taskgraph.created", temp)
			}
		}
		return // Exit early, response is published separately

	default: // Handle all other text-based generation topics
		var payloadData map[string]string
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			s.publishError(env, "Invalid payload format for AI generation")
			return
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

	if env.Topic != "ai:agent" {
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
