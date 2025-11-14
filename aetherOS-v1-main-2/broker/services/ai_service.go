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
	topicName := "ai:generate"
	topic := s.broker.GetTopic(topicName)
	// This is a simplification. A real service would use a dedicated channel
	// from the topic to avoid iterating over all clients. For now, we tap
	// into the broadcast channel for simplicity.
	log.Printf("AI Service listening on topic: %s", topicName)

	// This is not an ideal subscription method but will work for this architecture.
	// A proper implementation would have a dedicated subscription channel for services.
	broadcastChan := topic.GetBroadcastChan()

	for envelope := range broadcastChan {
		go s.handleRequest(envelope)
	}
}

func (s *AIService) handleRequest(env *aether.Envelope) {
	if env.Topic != "ai:generate" {
		return // Should not happen if subscribed correctly
	}

	log.Printf("AI Service processing message ID: %s", env.ID)

	prompt, ok := env.Payload.(string)
	if !ok {
		// Try to unmarshal from JSON if payload is not a simple string
		var payloadData map[string]interface{}
		payloadBytes, err := json.Marshal(env.Payload)
		if err != nil {
			log.Printf("error marshaling payload: %v", err)
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

	// Generate text using the AI module
	generatedText, err := s.aiModule.GenerateText(prompt)
	if err != nil {
		log.Printf("error generating text: %v", err)
		s.publishError(env, err.Error())
		return
	}

	// Publish the response
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
