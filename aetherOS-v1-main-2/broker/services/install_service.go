
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
)

// InstallService handles application installation requests.
type InstallService struct {
	broker      *aether.Broker
	permissions *aether.PermissionManager
}

// NewInstallService creates a new installation service.
func NewInstallService(broker *aether.Broker, permissions *aether.PermissionManager) *InstallService {
	return &InstallService{
		broker:      broker,
		permissions: permissions,
	}
}

// Run starts the install service's listener.
func (s *InstallService) Run() {
	topicName := "system:install:app"
	topic := s.broker.GetTopic(topicName)
	log.Printf("Install Service listening on topic: %s", topicName)
	broadcastChan := topic.GetBroadcastChan()

	for envelope := range broadcastChan {
		go s.handleRequest(envelope)
	}
}

func (s *InstallService) handleRequest(env *aether.Envelope) {
	var payloadData struct {
		Manifest    aether.AppManifest `json:"manifest"`
		WasmBase64  string             `json:"wasmBase64"`
	}
	if err := json.Unmarshal(env.Payload, &payloadData); err != nil {
		s.publishError(env, "Invalid payload for app installation: "+err.Error())
		return
	}

	manifest := payloadData.Manifest
	log.Printf("Install Service: Received install request for app '%s' (ID: %s)", manifest.Name, manifest.ID)

	// --- 1. Validate Manifest ---
	if err := s.validateManifest(&manifest); err != nil {
		s.publishError(env, "Manifest validation failed: "+err.Error())
		return
	}
	
	// --- 2. Verify Signature (Placeholder) ---
	log.Printf("Install Service: Signature verification for app '%s' would happen here.", manifest.ID)

	// --- 3. Install Files (Placeholder) ---
	log.Printf("Install Service: Installing app '%s' to the system.", manifest.ID)
	// In a real implementation, we would:
	// - Create a directory for the app, e.g., /system/apps/{appId}
	// - Write the manifest.json to that directory.
	// - Decode wasmBase64 and write the app.wasm file.
	// - Write any other assets.

	// --- 4. Notify System of New App ---
	// This would trigger a reload of the permission manager and potentially the frontend.
	log.Printf("Install Service: App '%s' installed successfully. A system refresh would be triggered.", manifest.ID)


	s.publishResponse(env, "system:install:app:result", map[string]interface{}{
		"appId":   manifest.ID,
		"status":  "installed",
		"message": fmt.Sprintf("App '%s' installed successfully.", manifest.Name),
	})
}

// validateManifest checks if the provided manifest is valid.
func (s *InstallService) validateManifest(manifest *aether.AppManifest) error {
	if manifest.ID == "" {
		return fmt.Errorf("manifest is missing required 'id' field")
	}
	if manifest.Name == "" {
		return fmt.Errorf("manifest is missing required 'name' field")
	}
	if manifest.Version == "" {
		return fmt.Errorf("manifest is missing required 'version' field")
	}
	if manifest.Entry == "" {
		return fmt.Errorf("manifest is missing required 'entry' field")
	}

	// Validate sandbox profile
	switch manifest.Sandbox.Profile {
	case "ui", "background", "agent", "privileged":
		// valid
	default:
		return fmt.Errorf("invalid sandbox profile: '%s'", manifest.Sandbox.Profile)
	}

	// In a real implementation, we would also validate the permissions against a known list.
	return nil
}

func (s *InstallService) publishResponse(originalEnv *aether.Envelope, topicName string, payload interface{}) {
	responseTopic := s.broker.GetTopic(topicName)

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Install Service: Failed to marshal response payload: %v", err)
		return
	}

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       topicName,
		Type:        "system_response",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
		Meta:        originalEnv.Meta,
	}

	responseTopic.Publish(responseEnv)
}

func (s *InstallService) publishError(originalEnv *aether.Envelope, errorMsg string) {
	errorTopicName := "system:install:app:error"
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
	log.Printf("Install Service publishing error: %s", errorMsg)
	errorTopic.Publish(errorEnv)
}
