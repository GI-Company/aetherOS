
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
}

// NewAIService creates a new AI service.
func NewAIService(broker *aether.Broker, aiModule *aether.AIModule) *AIService {
	return &AIService{
		broker:   broker,
		aiModule: aiModule,
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

	responseEnv := &aether.Envelope{
		ID:        uuid.New().String(),
		Topic:     responseTopicName,
		Type:      "ai_response",
		Payload:   responseText, // The payload is now just the raw string
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

    