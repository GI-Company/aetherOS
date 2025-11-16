
package services

import (
	"aether/broker/aether"
	"aether/broker/compute"
	"bufio"
	"context"
	"encoding/json"
	"io"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/tetratelabs/wazero"
	"github.com/tetratelabs/wazero/imports/wasi_snapshot_preview1"
    "encoding/base64"
)

// ComputeService handles WASM execution requests from the message bus.
type ComputeService struct {
	broker  *aether.Broker
	runtime *compute.WazeroRuntime
}

// NewComputeService creates a new compute service.
func NewComputeService(broker *aether.Broker, runtime *compute.WazeroRuntime) *ComputeService {
	return &ComputeService{
		broker:  broker,
		runtime: runtime,
	}
}

// Run starts the compute service's listeners.
func (s *ComputeService) Run() {
	topics := []string{"vm:create", "vm:kill", "vm:stdin"}
	for _, topicName := range topics {
		topic := s.broker.GetTopic(topicName)
		log.Printf("Compute Service listening on topic: %s", topicName)
		broadcastChan := topic.GetBroadcastChan()

		go func(ch chan *aether.Envelope) {
			for envelope := range ch {
				go s.handleRequest(envelope)
			}
		}(broadcastChan)
	}
}

func (s *ComputeService) handleRequest(env *aether.Envelope) {
	log.Printf("Compute Service processing message ID %s on topic %s", env.ID, env.Topic)
	rawPayload := env.Payload

	switch env.Topic {
	case "vm:create":
		var req struct {
			WasmBase64 string `json:"wasmBase64"`
		}
		if err := json.Unmarshal(rawPayload, &req); err != nil {
			s.publishError(env, "Invalid payload for vm:create")
			return
		}
		s.createInstance(env, req.WasmBase64)
	case "vm:kill":
		var req struct {
			InstanceID string `json:"instanceId"`
		}
		if err := json.Unmarshal(rawPayload, &req); err != nil {
			s.publishError(env, "Invalid payload for vm:kill")
			return
		}
		s.killInstance(env, req.InstanceID)
	case "vm:stdin":
		var req struct {
			InstanceID string `json:"instanceId"`
			Data       string `json:"data"`
		}
		if err := json.Unmarshal(rawPayload, &req); err != nil {
			s.publishError(env, "Invalid payload for vm:stdin")
			return
		}
		s.writeToStdin(env, req.InstanceID, req.Data)
	}
}

func (s *ComputeService) createInstance(originalEnv *aether.Envelope, wasmBase64 string) {
	instanceID := uuid.New().String()
	// Create a new context for this instance
	instanceCtx, cancel := context.WithCancel(context.Background())

	stdinReader, stdinWriter := io.Pipe()
	stdoutReader, stdoutWriter := io.Pipe()
	stderrReader, stderrWriter := io.Pipe()

	config := wazero.NewModuleConfig().
		WithStdin(stdinReader).
		WithStdout(stdoutWriter).
		WithStderr(stderrWriter).
		WithSysNanosleep().
		WithSysNanotime().
		WithSysWalltime()

	wasmBytes, err := base64.StdEncoding.DecodeString(wasmBase64)
	if err != nil {
		s.publishError(originalEnv, "Failed to decode wasm binary: " + err.Error())
		cancel()
		return
	}

	// Instantiate the WASI imports
	wasi_snapshot_preview1.MustInstantiate(instanceCtx, s.runtime.GetRuntime())

	mod, err := s.runtime.GetRuntime().Instantiate(instanceCtx, wasmBytes, config)
	if err != nil {
		s.publishError(originalEnv, "Failed to instantiate wasm module: "+err.Error())
		cancel()
		return
	}

	instance := compute.NewWazeroInstance(instanceCtx, mod, stdinWriter, stdoutReader, stderrReader, cancel)
	s.runtime.Register(instanceID, instance)

	s.publishResponse(originalEnv, "vm.started", map[string]string{"instanceId": instanceID})

	// Goroutines to stream stdout and stderr
	go s.streamPipe(instanceID, instance.Stdout(), "vm.stdout")
	go s.streamPipe(instanceID, instance.Stderr(), "vm.stderr")

	// Goroutine to wait for the instance to finish
	go func() {
		<-instanceCtx.Done() // Wait for context cancellation or module close
		s.runtime.Unregister(instanceID)
		s.publishResponse(originalEnv, "vm.exited", map[string]string{"instanceId": instanceID})
		instance.Kill() // Ensure cleanup
	}()
}

func (s *ComputeService) killInstance(originalEnv *aether.Envelope, instanceID string) {
	instance, ok := s.runtime.Get(instanceID)
	if !ok {
		s.publishError(originalEnv, "Instance not found")
		return
	}
	instance.Kill()
	s.runtime.Unregister(instanceID)
	s.publishResponse(originalEnv, "vm.killed", map[string]string{"instanceId": instanceID})
}

func (s *ComputeService) writeToStdin(originalEnv *aether.Envelope, instanceID string, data string) {
	instance, ok := s.runtime.Get(instanceID)
	if !ok {
		s.publishError(originalEnv, "Instance not found")
		return
	}
	if _, err := instance.Stdin().Write([]byte(data)); err != nil {
		s.publishError(originalEnv, "Failed to write to stdin: "+err.Error())
	}
}

func (s *ComputeService) streamPipe(instanceID string, pipe io.ReadCloser, topicName string) {
	scanner := bufio.NewScanner(pipe)
	for scanner.Scan() {
		s.publishResponse(nil, topicName, map[string]string{
			"instanceId": instanceID,
			"data":       scanner.Text(),
		})
	}
	if err := scanner.Err(); err != nil && err != io.EOF {
		log.Printf("Error reading from pipe for instance %s on topic %s: %v", instanceID, topicName, err)
		s.publishError(nil, "Error reading from instance pipe: "+err.Error())
	}
}

func (s *ComputeService) publishResponse(originalEnv *aether.Envelope, topicName string, payload interface{}) {
	responseTopic := s.broker.GetTopic(topicName)

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("Compute Service: Failed to marshal response payload: %v", err)
		return
	}

	responseEnv := &aether.Envelope{
		ID:          uuid.New().String(),
		Topic:       topicName,
		Type:        "compute_response",
		ContentType: "application/json",
		Payload:     payloadBytes,
		CreatedAt:   time.Now(),
	}

	if originalEnv != nil {
		responseEnv.Meta = []byte(`{"correlationId": "` + originalEnv.ID + `"}`)
	}

	responseTopic.Publish(responseEnv)
}

func (s *ComputeService) publishError(originalEnv *aether.Envelope, errorMsg string) {
	var errorTopicName string
	if originalEnv != nil {
		errorTopicName = originalEnv.Topic + ":error"
	} else {
		errorTopicName = "vm.crashed"
	}

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
	}
	if originalEnv != nil {
		errorEnv.Meta = []byte(`{"correlationId": "` + originalEnv.ID + `"}`)
	}
	log.Printf("Compute Service publishing error to topic: %s", errorTopicName)
	errorTopic.Publish(errorEnv)
}
