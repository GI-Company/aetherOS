
package services

import (
	"aether/broker/aether"
	"log"
	"time"

	"github.com/google/uuid"
)

// VfsService handles file system-related requests from the message bus by acting as a proxy.
// It forwards requests to the frontend for handling.
type VfsService struct {
	broker *aether.Broker
}

// NewVfsService creates a new VFS service.
func NewVfsService(broker *aether.Broker) *VfsService {
	return &VfsService{
		broker: broker,
	}
}

// Run starts the VFS service's listeners for multiple topics.
func (s *VfsService) Run() {
	vfsTopics := []string{
		"vfs:list",
		"vfs:delete",
		"vfs:create:file",
		"vfs:create:folder",
		"vfs:read",
		"vfs:write",
	}

	for _, topicName := range vfsTopics {
		topic := s.broker.GetTopic(topicName)
		log.Printf("VFS Service (Proxy) listening on topic: %s", topicName)
		broadcastChan := topic.GetBroadcastChan()

		// Start a goroutine for each topic
		go func(tName string, ch chan *aether.Envelope) {
			for envelope := range ch {
				// We are just proxying, so we re-broadcast the original message
				// on a ":result" topic for the frontend to handle.
				go s.proxyRequest(envelope)
			}
		}(topicName, broadcastChan)
	}
}

// proxyRequest forwards the original envelope to a result topic.
func (s *VfsService) proxyRequest(originalEnv *aether.Envelope) {
	log.Printf("VFS Service proxying request for topic: %s", originalEnv.Topic)
	responseTopicName := originalEnv.Topic + ":result"
	responseTopic := s.broker.GetTopic(responseTopicName)

	// Create a new envelope for the response, but carry over the original payload.
	responseEnv := &aether.Envelope{
		ID:        uuid.New().String(),
		Topic:     responseTopicName,
		Type:      "vfs_proxy_response",
		Payload:   originalEnv.Payload, // The frontend will use this to process the action
		CreatedAt: time.Now(),
		Meta: map[string]string{
			"correlationId": originalEnv.ID,
		},
	}

	responseTopic.Publish(responseEnv)
}
