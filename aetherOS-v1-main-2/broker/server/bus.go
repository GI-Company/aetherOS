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
// The client can then publish to any topic and will receive messages from any topic it subscribes to client-side.
func (s *BusServer) handleWSGateway(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return // upgrader logs errors
	}

	// All clients connect to a central hub/bus topic.
	// The specific topics they receive messages from are managed by having the client
	// subscribe to all topics it is interested in.
	busTopic := s.Broker.GetTopic("bus") // A general topic for receiving messages
	client := aether.NewClient(conn, busTopic)

	// Subscribe this client to all topics that might send responses.
	// A more advanced system might have clients declare their subscriptions
	// via a special message after connecting.
	s.Broker.GetTopic("ai:generate:resp").Subscribe(client)
	s.Broker.GetTopic("ai:generate:error").Subscribe(client)
	s.Broker.GetTopic("vfs:list:result").Subscribe(client)
	s.Broker.GetTopic("vfs:create:file:result").Subscribe(client)
	s.Broker.GetTopic("vfs:create:folder:result").Subscribe(client)
	s.Broker.GetTopic("vfs:delete:result").Subscribe(client)
	s.Broker.GetTopic("vfs:write:result").Subscribe(client)
	s.Broker.GetTopic("vfs:read:result").Subscribe(client)


	// The client is also subscribed to its primary hubTopic
	busTopic.Subscribe(client)

	go client.WritePump()
	go client.ReadPump()
}
