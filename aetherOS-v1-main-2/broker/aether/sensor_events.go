
package aether

import "time"

// SensorEvent represents a generic event captured by a kernel sensor.
type SensorEvent struct {
	Type      string      `json:"type"` // e.g., "vfs", "compute", "ui"
	Timestamp time.Time   `json:"timestamp"`
	Payload   interface{} `json:"payload"`
}

// VfsEvent represents a file system operation.
type VfsEvent struct {
	Operation string `json:"operation"` // "read", "write", "delete", "list"
	Path      string `json:"path"`
	Success   bool   `json:"success"`
	Error     string `json:"error,omitempty"`
	Size      int64  `json:"size,omitempty"`
}
