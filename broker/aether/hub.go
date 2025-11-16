package aether

import (
	"log"
	"sync"
)

// Broker manages the lifecycle of topics and subscriptions.
type Broker struct {
	topics map[string]*Topic
	mu     sync.RWMutex
}

// NewBroker creates a new broker.
func NewBroker() *Broker {
	return &Broker{
		topics: make(map[string]*Topic),
	}
}

// Run starts the broker's event loop.
func (b *Broker) Run() {
	// In a real implementation, this would handle topic cleanup, etc.
	for {
	}
}

// GetTopic returns a topic, creating it if it doesn't exist.
func (b *Broker) GetTopic(name string) *Topic {
	b.mu.RLock()
	topic, ok := b.topics[name]
	b.mu.RUnlock()
	if ok {
		return topic
	}

	b.mu.Lock()
	defer b.mu.Unlock()
	// Double check in case it was created between RUnlock and Lock
	if b.topics[name] == nil {
		log.Printf("creating topic: %s", name)
		b.topics[name] = NewTopic(name, b) // Pass broker to topic
		go b.topics[name].Run()
	}
	return b.topics[name]
}
