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
	api.Handle("/subscribe", JWTAuthMiddleware(http.HandlerFunc(s.handleWSSubscribe)))
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

func (s *BusServer) handleWSSubscribe(w http.ResponseWriter, r *http.Request) {
	topicName := r.URL.Query().Get("topic")
	if topicName == "" {
		http.Error(w, "missing topic", http.StatusBadRequest)
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	topic := s.Broker.GetTopic(topicName)
	client := aether.NewClient(conn, topic)
	topic.Subscribe(client)

	go client.WritePump()
	go client.ReadPump()
}
