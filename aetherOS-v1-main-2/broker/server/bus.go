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

	// wrap bus endpoints with JWT middleware
	api.Handle("/publish", JWTAuthMiddleware(http.HandlerFunc(s.handlePublish))).Methods("POST")
	// The WebSocket endpoint now acts as a general gateway to the bus
	api.Handle("/ws", JWTAuthMiddleware(http.HandlerFunc(s.handleWSGateway)))
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

	// All clients connect to a central hub, but can publish to any topic.
	// We will create response topics for them to receive messages on.
	// For simplicity, we'll subscribe them to a "system:events" topic to receive broadcasts.
	// A more advanced implementation might have clients declare subscriptions.
	hubTopic := s.Broker.GetTopic("system:events") // A general topic for receiving messages
	client := aether.NewClient(conn, hubTopic)

	// Subscribing the client to multiple response topics.
	// The client-side SDK will filter messages by topic.
	aiRespTopic := s.Broker.GetTopic("ai:generate:resp")
	aiErrorTopic := s.Broker.GetTopic("ai:generate:error")

	aiRespTopic.Subscribe(client)
	aiErrorTopic.Subscribe(client)

	// The client is also subscribed to its primary hubTopic
	hubTopic.Subscribe(client)

	go client.WritePump()
	go client.ReadPump()
}
