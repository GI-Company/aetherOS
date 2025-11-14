
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"log"
	"path/filepath"
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
		"vfs:create:file",
		"vfs:create:folder",
		"vfs:read",
		"vfs:write",
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
	case "vfs:create:file":
		s.handleCreateFile(env)
	case "vfs:create:folder":
		s.handleCreateFolder(env)
	case "vfs:read":
		s.handleRead(env)
	case "vfs:write":
		s.handleWrite(env)
	default:
		log.Printf("VFS Service received unhandled topic: %s", env.Topic)
	}
}

// handleCreateFile creates a new file in the VFS.
func (s *VfsService) handleCreateFile(env *aether.Envelope) {
	log.Printf("VFS Service processing %s message ID: %s", env.Topic, env.ID)

	var payload struct {
		Path string `json:"path"`
		Name string `json:"name"`
	}

	payloadBytes, _ := json.Marshal(env.Payload)
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		s.publishError(env, "Invalid create:file payload structure")
		return
	}

	fullPath := filepath.Join(payload.Path, payload.Name)
	if err := s.vfsModule.Write(fullPath, ""); err != nil {
		s.publishError(env, err.Error())
		return
	}

	s.publishSuccessResponse(env, map[string]interface{}{"success": true, "path": fullPath})
}

// handleCreateFolder creates a new folder in the VFS.
func (s *VfsService) handleCreateFolder(env *aether.Envelope) {
	log.Printf("VFS Service processing %s message ID: %s", env.Topic, env.ID)

	var payload struct {
		Path string `json:"path"`
		Name string `json:"name"`
	}

	payloadBytes, _ := json.Marshal(env.Payload)
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		s.publishError(env, "Invalid create:folder payload structure")
		return
	}

	fullPath := filepath.Join(payload.Path, payload.Name)
	if err := s.vfsModule.CreateDir(fullPath); err != nil {
		s.publishError(env, err.Error())
		return
	}
	s.publishSuccessResponse(env, map[string]interface{}{"success": true, "path": fullPath})
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
	s.publishSuccessResponse(env, map[string]interface{}{"success": true, "path": payload.Path})
}

func (s *VfsService) handleRead(env *aether.Envelope) {
	log.Printf("VFS Service processing vfs:read message ID: %s", env.ID)

	var payload struct {
		Path string `json:"path"`
	}
	payloadBytes, _ := json.Marshal(env.Payload)
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		s.publishError(env, "Invalid read payload structure")
		return
	}

	content, err := s.vfsModule.Read(payload.Path)
	if err != nil {
		s.publishError(env, err.Error())
		return
	}

	responsePayload := map[string]interface{}{
		"path":    payload.Path,
		"content": content,
	}

	s.publishResponse(env, "vfs_read_response", responsePayload)
}

func (s *VfsService) handleWrite(env *aether.Envelope) {
	log.Printf("VFS Service processing vfs:write message ID: %s", env.ID)

	var payload struct {
		Path    string `json:"path"`
		Content string `json:"content"`
	}
	payloadBytes, _ := json.Marshal(env.Payload)
	if err := json.Unmarshal(payloadBytes, &payload); err != nil {
		s.publishError(env, "Invalid write payload structure")
		return
	}

	if err := s.vfsModule.Write(payload.Path, payload.Content); err != nil {
		s.publishError(env, err.Error())
		return
	}

	s.publishSuccessResponse(env, map[string]interface{}{"success": true, "path": payload.Path})
}

func (s *VfsService) publishListResponse(originalEnv *aether.Envelope, path string, files []*aether.FileInfo) {
	responsePayload := map[string]interface{}{
		"path":  path,
		"files": files,
	}
	s.publishResponse(originalEnv, "vfs_list_response", responsePayload)
}

func (s *VfsService) publishSuccessResponse(originalEnv *aether.Envelope, payload map[string]interface{}) {
	s.publishResponse(originalEnv, "vfs_success_response", payload)
}

func (s *VfsService) publishResponse(originalEnv *aether.Envelope, responseType string, payload interface{}) {
	responseTopicName := originalEnv.Topic + ":result"
	responseTopic := s.broker.GetTopic(responseTopicName)

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       responseTopicName,
		Type:        responseType,
		Payload:     payload,
		CreatedAt:   time.Now(),
		Meta:        map[string]string{"correlationId": originalEnv.ID},
	}

	log.Printf("VFS Service publishing response to topic: %s", responseTopicName)
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
