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

// Run starts the AI service's listener.
func (s *AIService) Run() {
	// List of AI-related topics to listen on
	aiTopics := []string{
		"ai:generate",
		"ai:agent",
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

	var prompt string
	// Standardize prompt extraction
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
			}
		}
	}

	if prompt == "" {
		log.Println("AI Service: received empty prompt")
		s.publishError(env, "Empty prompt received")
		return
	}

	// Route based on topic
	var generatedText string
	var err error

	switch env.Topic {
	case "ai:generate":
		generatedText, err = s.aiModule.GenerateText(prompt)
	// Add other cases for different AI flows here in the future
	// case "ai:agent":
	// 	generatedText, err = s.aiModule.ExecuteAgent(prompt)
	default:
		// For now, default all AI topics to GenerateText for simplicity
		generatedText, err = s.aiModule.GenerateText(prompt)
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
		Payload:   responseText,
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
