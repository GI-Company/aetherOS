
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

	// Subscribe this client to all topics that might send responses.
	// This makes the gateway a general-purpose connection to the bus.
	s.Broker.GetTopic("ai:generate:resp").Subscribe(client)
	s.Broker.GetTopic("ai:generate:error").Subscribe(client)
	s.Broker.GetTopic("ai:generate:page:resp").Subscribe(client)
	s.Broker.GetTopic("ai:generate:page:error").Subscribe(client)
	s.Broker.GetTopic("ai:generate:image:resp").Subscribe(client)
	s.Broker.GetTopic("ai:generate:image:error").Subscribe(client)
	s.Broker.GetTopic("ai:design:component:resp").Subscribe(client)
	s.Broker.GetTopic("ai:design:component:error").Subscribe(client)
	s.Broker.GetTopic("ai:search:files:resp").Subscribe(client)
	s.Broker.GetTopic("ai:search:files:error").Subscribe(client)
	s.Broker.GetTopic("ai:generate:palette:resp").Subscribe(client)
	s.Broker.GetTopic("ai:generate:palette:error").Subscribe(client)
	s.Broker.GetTopic("ai:generate:accent:resp").Subscribe(client)
	s.Broker.GetTopic("ai:generate:accent:error").Subscribe(client)
	s.Broker.GetTopic("ai:summarize:code:resp").Subscribe(client)
	s.Broker.GetTopic("ai:summarize:code:error").Subscribe(client)
	s.Broker.GetTopic("vfs:list:result").Subscribe(client)
	s.Broker.GetTopic("vfs:delete:result").Subscribe(client)
	s.Broker.GetTopic("vfs:create:file:result").Subscribe(client)
	s.Broker.GetTopic("vfs:create:folder:result").Subscribe(client)
	s.Broker.GetTopic("vfs:read:result").Subscribe(client)
	s.Broker.GetTopic("vfs:write:result").Subscribe(client)
	s.Broker.GetTopic("vm.started").Subscribe(client)
	s.Broker.GetTopic("vm.stdout").Subscribe(client)
	s.Broker.GetTopic("vm.stderr").Subscribe(client)
	s.Broker.GetTopic("vm.exited").Subscribe(client)
	s.Broker.GetTopic("vm.killed").Subscribe(client)
	s.Broker.GetTopic("vm.crashed").Subscribe(client)
	s.Broker.GetTopic("agent.taskgraph.created").Subscribe(client)
	s.Broker.GetTopic("agent.taskgraph.started").Subscribe(client)
	s.Broker.GetTopic("agent.taskgraph.completed").Subscribe(client)
	s.Broker.GetTopic("agent.taskgraph.canceled").Subscribe(client)
	s.Broker.GetTopic("agent.tasknode.started").Subscribe(client)
	s.Broker.GetTopic("agent.tasknode.completed").Subscribe(client)
	s.Broker.GetTopic("agent.tasknode.failed").Subscribe(client)
	s.Broker.GetTopic("agent.tasknode.logs").Subscribe(client)


	busTopic.Subscribe(client)

	go client.WritePump()
	go client.ReadPump()
}
