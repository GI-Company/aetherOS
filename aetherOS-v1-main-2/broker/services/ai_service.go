
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

	var generatedText string
	var err error

	// Special handling for file search payload
	if env.Topic == "ai:search:files" {
		var payloadData struct {
			Query          string   `json:"query"`
			AvailableFiles []string `json:"availableFiles"`
		}
		payloadBytes, _ := json.Marshal(env.Payload)
		if err := json.Unmarshal(payloadBytes, &payloadData); err != nil {
			log.Printf("error unmarshaling search payload: %v", err)
			s.publishError(env, "Invalid search payload format")
			return
		}
		generatedText, err = s.aiModule.SemanticFileSearch(payloadData.Query, payloadData.AvailableFiles)

	} else if env.Topic == "ai:summarize:code" {
		var payloadData struct {
			FilePath string `json:"filePath"`
		}
		payloadBytes, _ := json.Marshal(env.Payload)
		if err := json.Unmarshal(payloadBytes, &payloadData); err != nil {
			log.Printf("error unmarshaling summarize code payload: %v", err)
			s.publishError(env, "Invalid payload format")
			return
		}
		// Read file content using VFS module
		fileContent, readErr := s.vfs.Read(payloadData.FilePath)
		if readErr != nil {
			log.Printf("error reading file for summarization: %v", readErr)
			s.publishError(env, "Could not read file to summarize")
			return
		}
		generatedText, err = s.aiModule.SummarizeCode(fileContent)

	} else {
		// Standard prompt extraction for other topics
		var prompt string
		if p, ok := env.Payload.(string); ok {
			prompt = p
		} else {
			var payloadData map[string]interface{}
			payloadBytes, err := json.Marshal(env.Payload)
			if err != nil {
				log.Printf("error marshaling payload: %v", err)
				s.publishError(env, "Invalid payload format")
				return
			}
			if err := json.Unmarshal(payloadBytes, &payloadData); err == nil {
				if p, ok := payloadData["prompt"].(string); ok {
					prompt = p
				} else if p, ok := payloadData["topic"].(string); ok {
					prompt = p
				} else if p, ok := payloadData["description"].(string); ok {
					prompt = p
				} else if p, ok := payloadData["contentDescription"].(string); ok {
					prompt = p
				}
			}
		}

		if prompt == "" {
			log.Println("AI Service: received empty prompt")
			s.publishError(env, "Empty prompt received")
			return
		}

		// Route based on topic for non-search requests
		switch env.Topic {
		case "ai:generate":
			generatedText, err = s.aiModule.GenerateText(prompt)
		case "ai:generate:page":
			generatedText, err = s.aiModule.GenerateWebPage(prompt)
		case "ai:design:component":
			generatedText, err = s.aiModule.DesignComponent(prompt)
		case "ai:generate:palette":
			generatedText, err = s.aiModule.GenerateAdaptivePalette(prompt)
		case "ai:generate:accent":
			generatedText, err = s.aiModule.GenerateAccentColor(prompt)
		default:
			generatedText, err = s.aiModule.GenerateText(prompt)
		}
	}


	if err != nil {
		log.Printf("error processing AI request: %v", err)
		s.publishError(env, err.Error())
		return
	}

	s.publishResponse(env, generatedText)
}

func (s *AIService) publishResponse(originalEnv *aether.Envelope, responseText string) {
	responseTopicName := originalEnv.Topic + ":resp"
	responseTopic := s.broker.GetTopic(responseTopicName)

	// For summarization, the payload needs to include the original path for client-side matching
	var payload interface{}
	if originalEnv.Topic == "ai:summarize:code" {
		var originalPayload struct {
			FilePath string `json:"filePath"`
		}
		payloadBytes, _ := json.Marshal(originalEnv.Payload)
		json.Unmarshal(payloadBytes, &originalPayload)
		payload = map[string]interface{}{
			"summary":  responseText,
			"filePath": originalPayload.FilePath,
		}
	} else {
		payload = responseText
	}

	responseEnv := &aether.Envelope{
		ID:        uuid.New().String(),
		Topic:     responseTopicName,
		Type:      "ai_response",
		Payload:   payload,
		CreatedAt: time.Now(),
		Meta: map[string]string{
			"correlationId": originalEnv.ID,
		},
	}

	log.Printf("AI Service publishing response to topic: %s", responseTopicName)
	responseTopic.Publish(responseEnv)
}

func (s *AIService) publishError(originalEnv *aether.Envelope, errorMsg string) {
	errorTopicName := originalEnv.Topic + ":error"
	errorTopic := s.broker.GetTopic(errorTopicName)

	errorPayload := map[string]string{"error": errorMsg}

	errorEnv := &aether.Envelope{
		ID:        uuid.New().String(),
		Topic:     errorTopicName,
		Type:      "error",
		Payload:   errorPayload,
		CreatedAt: time.Now(),
		Meta: map[string]string{
			"correlationId": originalEnv.ID,
		},
	}
	log.Printf("AI Service publishing error to topic: %s", errorTopicName)
	errorTopic.Publish(errorEnv)
}

    