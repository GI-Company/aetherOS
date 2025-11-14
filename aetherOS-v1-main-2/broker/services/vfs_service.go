
package services

import (
	"aether/broker/aether"
	"encoding/base64"
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
)

// VfsService handles file system-related requests from the message bus.
type VfsService struct {
	broker *aether.Broker
	vfs    *aether.VFSModule
}

// NewVfsService creates a new VFS service.
func NewVfsService(broker *aether.Broker, vfs *aether.VFSModule) *VfsService {
	return &VfsService{
		broker: broker,
		vfs:    vfs,
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
	log.Printf("VFS Service processing message ID %s on topic %s", env.ID, env.Topic)

	// Extract the raw payload from the envelope
	var rawPayload json.RawMessage
	var tempEnv struct {
		Payload json.RawMessage `json:"payload"`
	}
	if err := json.Unmarshal(env.Payload, &tempEnv); err != nil {
		s.publishError(env, "Invalid envelope structure")
		return
	}
	rawPayload = tempEnv.Payload

	var payloadData map[string]interface{}
	if err := json.Unmarshal(rawPayload, &payloadData); err != nil {
		s.publishError(env, "Cannot unmarshal payload")
		return
	}

	path, _ := payloadData["path"].(string)

	switch env.Topic {
	case "vfs:list":
		files, err := s.vfs.List(path)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		// The payload needs to include the original path for the client to match the response.
		s.publishResponse(env, "vfs:list:result", map[string]interface{}{
			"path":  path,
			"files": files,
		})
	case "vfs:delete":
		err := s.vfs.Delete(path)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:delete:result", map[string]interface{}{"success": true, "path": path})
	case "vfs:create:file":
		name, _ := payloadData["name"].(string)
		err := s.vfs.CreateFile(path, name)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:create:file:result", map[string]interface{}{"success": true, "path": path})
	case "vfs:create:folder":
		name, _ := payloadData["name"].(string)
		err := s.vfs.CreateDir(path, name)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:create:folder:result", map[string]interface{}{"success": true, "path": path})
	case "vfs:read":
		content, err := s.vfs.Read(path)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:read:result", map[string]interface{}{
			"path":    path,
			"content": content,
		})
	case "vfs:write":
		contentStr, _ := payloadData["content"].(string)
		encoding, _ := payloadData["encoding"].(string)

		var contentBytes []byte
		var err error

		if encoding == "base64" {
			contentBytes, err = base64.StdEncoding.DecodeString(contentStr)
			if err != nil {
				s.publishError(env, "Invalid base64 content")
				return
			}
		} else {
			contentBytes = []byte(contentStr)
		}

		err = s.vfs.Write(path, contentBytes)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:write:result", map[string]interface{}{"success": true, "path": path})
	default:
		s.publishError(env, "Unknown VFS topic")
	}
}

func (s *VfsService) publishResponse(originalEnv *aether.Envelope, topicName string, payload interface{}) {
	responseTopic := s.broker.GetTopic(topicName)

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("VFS Service: Failed to marshal response payload: %v", err)
		s.publishError(originalEnv, "Internal server error: could not create response")
		return
	}

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       topicName,
		Type:        "vfs_response",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
		Meta: map[string]string{
			"correlationId": originalEnv.ID,
		},
	}
	responseTopic.Publish(responseEnv)
}

func (s *VfsService) publishError(originalEnv *aether.Envelope, errorMsg string) {
	// Errors are now published to a generic topic for each original topic
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
		Meta: map[string]string{
			"correlationId": originalEnv.ID,
		},
	}
	log.Printf("VFS Service publishing error to topic: %s", errorTopicName)
	errorTopic.Publish(errorEnv)
}
