
package server

import (
	"encoding/json"
	"net/http"

	"aether/broker/aether"
	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

// BusServer handles the HTTP and WebSocket endpoints.
type BusServer struct {
	Broker *aether.Broker
}

// RegisterBusRoutes registers the bus routes with the router.
func RegisterBusRoutes(r *mux.Router, b *aether.Broker) {
	s := &BusServer{Broker: b}
	api := r.PathPrefix("/v1/bus").Subrouter()

	// The WebSocket endpoint now acts as a general gateway to the bus
	api.Handle("/ws", http.HandlerFunc(s.handleWSGateway))
	// Example of a fire-and-forget HTTP endpoint
	api.Handle("/publish", http.HandlerFunc(s.handlePublish)).Methods("POST")
}

func (s *BusServer) handlePublish(w http.ResponseWriter, r *http.Request) {
	var env aether.Envelope
	if err := json.NewDecoder(r.Body).Decode(&env); err != nil {
		http.Error(w, "invalid envelope", http.StatusBadRequest)
		return
	}

	topic := s.Broker.GetTopic(env.Topic)
	topic.Publish(&env)

	w.WriteHeader(http.StatusAccepted)
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// handleWSGateway upgrades the connection and connects the client to the bus.
func (s *BusServer) handleWSGateway(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return // upgrader logs errors
	}

	busTopic := s.Broker.GetTopic("bus")
	client := aether.NewClient(conn, busTopic)

	// List of all topics the frontend might need to subscribe to
	topicsToSubscribe := []string{
		"ai:generate:resp", "ai:generate:error",
		"ai:generate:page:resp", "ai:generate:page:error",
		"ai:generate:image:resp", "ai:generate:image:error",
		"ai:design:component:resp", "ai:design:component:error",
		"ai:generate:palette:resp", "ai:generate:palette:error",
		"ai:generate:accent:resp", "ai:generate:accent:error",
		"vfs:search:result", "vfs:search:error",
		"vfs:summarize:code:result", "vfs:summarize:code:error",
		"vfs:list:result", "vfs:list:error",
		"vfs:delete:result", "vfs:delete:error",
		"vfs:create:file:result", "vfs:create:file:error",
		"vfs:create:folder:result", "vfs:create:folder:error",
		"vfs:read:result", "vfs:read:error",
		"vfs:write:result", "vfs:write:error",
		"vm:started", "vm:stdout", "vm:stderr", "vm:exited",
		"vm:killed", "vm:crashed", "vm:create:error", "vm:kill:error", "vm:stdin:error",
		"telemetry:vfs",
		"system:install:app:result", "system:install:app:error",
		"agent.taskgraph.created", "agent.taskgraph.started",
		"agent.taskgraph.completed", "agent.taskgraph.failed",
		"agent.tasknode.started", "agent.tasknode.completed", "agent.tasknode.failed",
	}

	for _, topicName := range topicsToSubscribe {
		s.Broker.GetTopic(topicName).Subscribe(client)
	}

	busTopic.Subscribe(client)

	go client.WritePump()
	go client.ReadPump()
}
