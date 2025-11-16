
package services

import (
	"aether/broker/aether"
	"log"
)

// AgentService will handle the orchestration of multi-step AI tasks (TaskGraphs).
type AgentService struct {
	broker *aether.Broker
}

// NewAgentService creates a new agent service.
func NewAgentService(broker *aether.Broker) *AgentService {
	return &AgentService{
		broker: broker,
	}
}

// Run starts the agent service's listeners.
func (s *AgentService) Run() {
	// In the future, this will listen for topics like 'agent:graph:create'
	// and 'agent:graph:execute'.
	log.Println("Agent Service is running.")
	select {} // Keep the service alive
}
