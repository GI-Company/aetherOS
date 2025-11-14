
package services

import (
	"aether/broker/aether"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
)

// VfsService handles file system-related requests from the message bus
// by proxying them back to all clients.
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
	// List of VFS topics to subscribe to.
	// In a more dynamic system, this could come from configuration.
	vfsTopics := []string{
		"vfs:list",
		"vfs:create:file",
		"vfs:create:folder",
		"vfs:delete",
		"vfs:write",
		"vfs:read",
	}

	for _, topicName := range vfsTopics {
		topic := s.broker.GetTopic(topicName)
		log.Printf("VFS Service listening on topic: %s", topicName)
		broadcastChan := topic.GetBroadcastChan()

		// Start a goroutine for each topic
		go func(tName string, ch chan *aether.Envelope) {
			for envelope := range ch {
				// The service's job is to simply broadcast the event
				// on a ":result" topic so all clients are notified.
				s.proxyEvent(envelope)
			}
		}(topicName, broadcastChan)
	}
}

// proxyEvent takes an incoming envelope and broadcasts it on a corresponding
// ":result" topic to notify all clients of the event.
func (s *VfsService) proxyEvent(originalEnv *aether.Envelope) {
	if !strings.HasPrefix(originalEnv.Topic, "vfs:") {
		return
	}

	log.Printf("VFS Service proxying event from topic: %s", originalEnv.Topic)

	// The response topic is the original topic plus ":result"
	responseTopicName := originalEnv.Topic + ":result"
	responseTopic := s.broker.GetTopic(responseTopicName)

	// The payload is the same as the original payload.
	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       responseTopicName,
		Type:        "vfs_event",
		Payload:     originalEnv.Payload,
		CreatedAt:   time.Now(),
		ContentType: originalEnv.ContentType,
		Meta: map[string]string{
			"correlationId": originalEnv.ID,
		},
	}

	log.Printf("VFS Service broadcasting to topic: %s", responseTopicName)
	responseTopic.Publish(responseEnv)
}
