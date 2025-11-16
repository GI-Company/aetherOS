
package services

import (
	"aether/broker/aether"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/google/uuid"
)

// TelemetryService listens to sensor events and can trigger autonomous actions.
// This is the beginning of the Prediction Engine and AAC from Phase 3.
type TelemetryService struct {
	broker *aether.Broker
}

// NewTelemetryService creates a new telemetry service.
func NewTelemetryService(broker *aether.Broker) *TelemetryService {
	return &TelemetryService{
		broker: broker,
	}
}

// Run starts the telemetry service's listeners.
func (s *TelemetryService) Run() {
	log.Println("Telemetry Service is running.")
	vfsTopic := s.broker.GetTopic("telemetry:vfs")
	broadcastChan := vfsTopic.GetBroadcastChan()

	for envelope := range broadcastChan {
		go s.handleVfsEvent(envelope)
	}
}

// handleVfsEvent processes file system telemetry.
func (s *TelemetryService) handleVfsEvent(env *aether.Envelope) {
	var sensorEvent aether.SensorEvent
	if err := json.Unmarshal(env.Payload, &sensorEvent); err != nil {
		log.Printf("Telemetry Service: failed to unmarshal sensor event: %v", err)
		return
	}

	// We need to unmarshal the payload again to get the specific VfsEvent
	var vfsEvent aether.VfsEvent
	payloadBytes, _ := json.Marshal(sensorEvent.Payload)
	if err := json.Unmarshal(payloadBytes, &vfsEvent); err != nil {
		log.Printf("Telemetry Service: failed to unmarshal VFS event payload: %v", err)
		return
	}

	// --- Autonomous Heuristic #1: Auto-summarize code on read ---
	if vfsEvent.Operation == "read" && vfsEvent.Success {
		// Check if it's a code file (simple check for this example)
		isCodeFile := strings.HasSuffix(vfsEvent.Path, ".go") ||
			strings.HasSuffix(vfsEvent.Path, ".ts") ||
			strings.HasSuffix(vfsEvent.Path, ".tsx")

		if isCodeFile {
			// In a real system, we'd check a cache (like Redis or Firestore)
			// to see if a summary already exists and is fresh.
			// For this demo, we'll just trigger the summarization every time.
			log.Printf("Telemetry Service: AUTONOMOUS ACTION TRIGGERED for file: %s", vfsEvent.Path)
			s.triggerSummarization(vfsEvent.Path)
		}
	}
}

// triggerSummarization publishes a request to the `ai:agent` topic to create and run
// a task graph for summarizing a code file.
func (s *TelemetryService) triggerSummarization(filePath string) {
	agentTopic := s.broker.GetTopic("ai:agent")
	prompt := fmt.Sprintf("Summarize the code in the file '%s'", filePath)

	payload := map[string]string{"prompt": prompt}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Telemetry Service: Failed to marshal agent payload: %v", err)
		return
	}

	agentEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       "ai:agent",
		Type:        "autonomous_request",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
		Meta:        []byte(`{"source": "TelemetryService"}`),
	}

	log.Printf("Telemetry Service: Publishing autonomous summarization task for %s", filePath)
	agentTopic.Publish(agentEnv)
}
