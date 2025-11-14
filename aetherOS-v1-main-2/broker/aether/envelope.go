package aether

import (
	"encoding/json"
	"time"
)

// Envelope is the core message used across Aether's broker.
type Envelope struct {
	ID          string            `json:"id"` // uuid
	From        string            `json:"from,omitempty"`
	To          string            `json:"to,omitempty"`
	Topic       string            `json:"topic,omitempty"`
	Type        string            `json:"type,omitempty"`
	ContentType string            `json:"contentType,omitempty"`
	Payload     interface{}       `json:"payload,omitempty"`
	Meta        map[string]string `json:"meta,omitempty"`
	CreatedAt   time.Time         `json:"createdAt,omitempty"`
}

// Bytes returns the envelope as a JSON byte slice.
func (e *Envelope) Bytes() []byte {
	// In a real implementation, you would handle the error.
	b, _ := json.Marshal(e)
	return b
}
