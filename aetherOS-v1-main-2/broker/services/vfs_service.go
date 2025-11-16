
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
	broker   *aether.Broker
	vfs      *aether.VFSModule
	aiModule *aether.AIModule
}

// NewVfsService creates a new VFS service.
func NewVfsService(broker *aether.Broker, vfs *aether.VFSModule, aiModule *aether.AIModule) *VfsService {
	return &VfsService{
		broker:   broker,
		vfs:      vfs,
		aiModule: aiModule,
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
		"vfs:search",
		"vfs:summarize:code",
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
	rawPayload := env.Payload

	var payloadData map[string]interface{}
	if err := json.Unmarshal(rawPayload, &payloadData); err != nil {
		s.publishError(env, "Cannot unmarshal payload")
		return
	}

	path, _ := payloadData["path"].(string)

	switch env.Topic {
	case "vfs:list":
		files, err := s.vfs.List(path)
		s.publishTelemetry("list", path, err, 0)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:list:result", map[string]interface{}{
			"path":  path,
			"files": files,
		})
	case "vfs:delete":
		err := s.vfs.Delete(path)
		s.publishTelemetry("delete", path, err, 0)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:delete:result", map[string]interface{}{"success": true, "path": path})
	case "vfs:create:file":
		name, _ := payloadData["name"].(string)
		err := s.vfs.CreateFile(path, name)
		s.publishTelemetry("create_file", path, err, 0)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:create:file:result", map[string]interface{}{"success": true, "path": path})
	case "vfs:create:folder":
		name, _ := payloadData["name"].(string)
		err := s.vfs.CreateDir(path, name)
		s.publishTelemetry("create_folder", path, err, 0)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:create:folder:result", map[string]interface{}{"success": true, "path": path})
	case "vfs:read":
		content, err := s.vfs.Read(path)
		s.publishTelemetry("read", path, err, int64(len(content)))
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
				s.publishTelemetry("write", path, err, 0)
				s.publishError(env, "Invalid base64 content")
				return
			}
		} else {
			contentBytes = []byte(contentStr)
		}

		err = s.vfs.Write(path, contentBytes)
		s.publishTelemetry("write", path, err, int64(len(contentBytes)))
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		s.publishResponse(env, "vfs:write:result", map[string]interface{}{"success": true, "path": path})

	case "vfs:search":
		query, _ := payloadData["query"].(string)
		availableFilesData, _ := payloadData["availableFiles"].([]interface{})
		availableFiles := make([]string, len(availableFilesData))
		for i, v := range availableFilesData {
			availableFiles[i] = v.(string)
		}
		jsonString, err := s.aiModule.SemanticFileSearch(query, availableFiles)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		var temp interface{}
		if err := json.Unmarshal([]byte(jsonString), &temp); err != nil {
			s.publishError(env, "Failed to unmarshal search results")
			return
		}
		s.publishResponse(env, "vfs:search:result", temp)

	case "vfs:summarize:code":
		filePath, _ := payloadData["filePath"].(string)
		fileContent, err := s.vfs.Read(filePath)
		if err != nil {
			s.publishError(env, "Could not read file for summarization: "+err.Error())
			return
		}
		summaryJSON, err := s.aiModule.SummarizeCode(fileContent)
		if err != nil {
			s.publishError(env, err.Error())
			return
		}
		var summaryMap map[string]string
		if err := json.Unmarshal([]byte(summaryJSON), &summaryMap); err != nil {
			s.publishError(env, "Failed to parse summary JSON")
			return
		}
		s.publishResponse(env, "vfs:summarize:code:result", map[string]interface{}{
			"summary":  summaryMap["summary"],
			"filePath": filePath,
		})

	default:
		s.publishError(env, "Unknown VFS topic: "+env.Topic)
	}
}

func (s *VfsService) publishTelemetry(operation, path string, err error, size int64) {
	telemetryTopic := s.broker.GetTopic("telemetry:vfs")
	vfsEvent := aether.VfsEvent{
		Operation: operation,
		Path:      path,
		Success:   err == nil,
		Size:      size,
	}
	if err != nil {
		vfsEvent.Error = err.Error()
	}

	sensorEvent := aether.SensorEvent{
		Type:      "vfs",
		Timestamp: time.Now(),
		Payload:   vfsEvent,
	}

	payloadBytes, marshalErr := json.Marshal(sensorEvent)
	if marshalErr != nil {
		log.Printf("VFS Telemetry: Failed to marshal sensor event: %v", marshalErr)
		return
	}

	envelope := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       "telemetry:vfs",
		Type:        "sensor_event",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
	}
	telemetryTopic.Publish(envelope)
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
		Meta:        []byte(`{"correlationId": "` + originalEnv.ID + `"}`),
	}
	responseTopic.Publish(responseEnv)
}

func (s *VfsService) publishError(originalEnv *aether.Envelope, errorMsg string) {
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
		Meta:        []byte(`{"correlationId": "` + originalEnv.ID + `"}`),
	}
	log.Printf("VFS Service publishing error to topic: %s", errorTopicName)
	errorTopic.Publish(errorEnv)
}

    