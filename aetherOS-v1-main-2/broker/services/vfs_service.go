
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
)

// VfsService handles file system-related requests from the message bus.
type VfsService struct {
	broker    *aether.Broker
	vfsModule *aether.VFSModule
}

// NewVfsService creates a new VFS service.
func NewVfsService(broker *aether.Broker, vfsModule *aether.VFSModule) *VfsService {
	return &VfsService{
		broker:    broker,
		vfsModule: vfsModule,
	}
}

// Run starts the VFS service's listeners for multiple topics.
func (s *VfsService) Run() {
	vfsTopics := []string{
		"vfs:list",
		"vfs:delete",
		// Add other topics like vfs:create etc. here
	}

	for _, topicName := range vfsTopics {
		topic := s.broker.GetTopic(topicName)
		log.Printf("VFS Service listening on topic: %s", topicName)
		broadcastChan := topic.GetBroadcastChan()

		go func(tName string, ch chan *aether.Envelope) {
			for envelope := range ch {
				go s.handleRequest(envelope)
			}
		}(topicName, broadcastChan)
	}
}

func (s *VfsService) handleRequest(env *aether.Envelope) {
	switch env.Topic {
	case "vfs:list":
		s.handleList(env)
	case "vfs:delete":
		s.handleDelete(env)
	// Add other cases here for vfs:create, vfs:delete etc.
	default:
		log.Printf("VFS Service received unhandled topic: %s", env.Topic)
	}
}

// handleList handles requests for listing directory contents.
func (s *VfsService) handleList(env *aether.Envelope) {
	log.Printf("VFS Service processing vfs:list message ID: %s", env.ID)

	var payload struct {
		Path string `json:"path"`
	}

	// Unmarshal payload from interface{}
	payloadBytes, err := json.Marshal(env.Payload)
	if err != nil {
		log.Printf("error marshaling payload: %v", err)
		s.publishError(env, "Invalid payload format")
		return
	}
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		log.Printf("error unmarshaling payload: %v", err)
		s.publishError(env, "Invalid payload structure")
		return
	}

	if payload.Path == "" {
		payload.Path = "/" // Default to root if path is empty
	}

	// Get file list from the VFS module
	files, err := s.vfsModule.List(payload.Path)
	if err != nil {
		log.Printf("error listing files for path %s: %v", payload.Path, err)
		s.publishError(env, err.Error())
		return
	}

	// Publish the response
	s.publishListResponse(env, payload.Path, files)
}

// handleDelete handles requests for deleting files or folders.
func (s *VfsService) handleDelete(env *aether.Envelope) {
	log.Printf("VFS Service processing vfs:delete message ID: %s", env.ID)

	var payload struct {
		Path string `json:"path"`
	}

	payloadBytes, err := json.Marshal(env.Payload)
	if err != nil {
		s.publishError(env, "Invalid delete payload format")
		return
	}
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		s.publishError(env, "Invalid delete payload structure")
		return
	}

	if err := s.vfsModule.Delete(payload.Path); err != nil {
		log.Printf("error deleting path %s: %v", payload.Path, err)
		s.publishError(env, err.Error())
		return
	}

	// Publish a generic success response
	s.publishSuccessResponse(env)
}

func (s *VfsService) publishListResponse(originalEnv *aether.Envelope, path string, files []*aether.FileInfo) {
	responseTopicName := originalEnv.Topic + ":result"
	responseTopic := s.broker.GetTopic(responseTopicName)

	responsePayload := map[string]interface{}{
		"path":  path,
		"files": files,
	}

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       responseTopicName,
		Type:        "vfs_list_response",
		Payload:     responsePayload,
		CreatedAt:   time.Now(),
		Meta:        map[string]string{"correlationId": originalEnv.ID},
	}

	log.Printf("VFS Service publishing response to topic: %s", responseTopicName)
	responseTopic.Publish(responseEnv)
}

func (s *VfsService) publishSuccessResponse(originalEnv *aether.Envelope) {
	responseTopicName := originalEnv.Topic + ":result"
	responseTopic := s.broker.GetTopic(responseTopicName)

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       responseTopicName,
		Type:        "vfs_success_response",
		Payload:     map[string]interface{}{"success": true, "path": originalEnv.Payload},
		CreatedAt:   time.Now(),
		Meta:        map[string]string{"correlationId": originalEnv.ID},
	}
	log.Printf("VFS Service publishing success to topic: %s", responseTopicName)
	responseTopic.Publish(responseEnv)
}

func (s *VfsService) publishError(originalEnv *aether.Envelope, errorMsg string) {
	errorTopicName := originalEnv.Topic + ":error"
	errorTopic := s.broker.GetTopic(errorTopicName)

	errorPayload := map[string]string{"error": errorMsg}

	errorEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       errorTopicName,
		Type:        "vfs_error",
		Payload:     errorPayload,
		CreatedAt:   time.Now(),
		Meta:        map[string]string{"correlationId": originalEnv.ID},
	}
	log.Printf("VFS Service publishing error to topic: %s", errorTopicName)
	errorTopic.Publish(errorEnv)
}
