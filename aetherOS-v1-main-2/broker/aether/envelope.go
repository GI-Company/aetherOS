
package aether

import (
	"encoding/json"
	"time"
)

// Envelope is the core message used across Aether's broker.
type Envelope struct {
	ID          string          `json:"id"` // uuid
	To          string          `json:"to,omitempty"`
	Topic       string          `json:"topic,omitempty"`
	Type        string          `json:"type,omitempty"`
	ContentType string          `json:"contentType,omitempty"`
	Payload     json.RawMessage `json:"payload,omitempty"` // Use RawMessage to delay parsing
	Meta        json.RawMessage `json:"meta,omitempty"`
	CreatedAt   time.Time       `json:"createdAt,omitempty"`
}

// Bytes returns the envelope as a JSON byte slice.
func (e *Envelope) Bytes() ([]byte, error) {
	return json.Marshal(e)
}
