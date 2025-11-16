
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// AIService handles AI-related requests from the message bus.
type AIService struct {
	broker      *aether.Broker
	aiModule    *aether.AIModule
	permissions *aether.PermissionManager
}

// NewAIService creates a new AI service.
func NewAIService(broker *aether.Broker, aiModule *aether.AIModule, permissions *aether.PermissionManager) *AIService {
	return &AIService{
		broker:      broker,
		aiModule:    aiModule,
		permissions: permissions,
	}
}

// Run starts the AI service's listener for multiple topics.
func (s *AIService) Run() {
	aiTopics := []string{
		"ai:generate",
		"ai:generate:page",
		"ai:design:component",
		"ai:agent",
		"ai:generate:palette",
		"ai:generate:accent",
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
	var meta struct {
		AppId string `json:"appId"`
	}
	if err := json.Unmarshal(env.Meta, &meta); err != nil {
		s.publishError(env, "Invalid metadata: could not determine origin app")
		return
	}
	appId := meta.AppId

	log.Printf("AI Service processing message ID %s on topic %s from app %s", env.ID, env.Topic, appId)

	if !s.permissions.HasPermission(appId, "ai_access") {
		s.publishError(env, "Permission denied: ai_access")
		return
	}

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
		return // Exit early, response is published separately

	default: // Handle all other text-based generation topics
		var payloadData map[string]string
		if err = json.Unmarshal(rawPayload, &payloadData); err != nil {
			s.publishError(env, "Invalid payload format for AI generation")
			return
		}

		var prompt string
		var ok bool
		if prompt, ok = payloadData["prompt"]; !ok {
			if prompt, ok = payloadData["topic"]; !ok {
				if prompt, ok = payloadData["description"]; !ok {
					prompt, _ = payloadData["contentDescription"]
				}
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
			err = fmt.Errorf("unknown AI topic: %s", env.Topic)
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
		Meta:        originalEnv.Meta,
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
		Meta:        originalEnv.Meta,
	}
	log.Printf("AI Service publishing error to topic: %s", errorTopicName)
	errorTopic.Publish(errorEnv)
}
