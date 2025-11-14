package aether

import "log"

// Topic manages a single topic, including subscriptions and message broadcasting.
type Topic struct {
	name          string
	broker        *Broker // reference back to the broker
	clients       map[*Client]bool
	broadcast     chan *Envelope
	subscribe     chan *Client
	unsubscribe   chan *Client
	history       []*Envelope
	historyMaxLen int
}

// NewTopic creates a new topic.
func NewTopic(name string, broker *Broker) *Topic {
	return &Topic{
		name:          name,
		broker:        broker, // store the broker reference
		clients:       make(map[*Client]bool),
		broadcast:     make(chan *Envelope),
		subscribe:     make(chan *Client),
		unsubscribe:   make(chan *Client),
		history:       make([]*Envelope, 0),
		historyMaxLen: 100, // keep last 100 messages
	}
}

// GetBroadcastChan returns the broadcast channel for service listening.
// This is a simplification for this architecture.
func (t *Topic) GetBroadcastChan() chan *Envelope {
	return t.broadcast
}

// Run starts the topic's event loop.
func (t *Topic) Run() {
	for {
		select {
		case client := <-t.subscribe:
			t.clients[client] = true
			log.Printf("client subscribed to topic %s", t.name)
			// send history
			for _, env := range t.history {
				select {
				case client.send <- env.Bytes():
				default:
					log.Printf("failed to send history to client, closing channel")
					close(client.send)
					delete(t.clients, client)
				}
			}
		case client := <-t.unsubscribe:
			if _, ok := t.clients[client]; ok {
				delete(t.clients, client)
				close(client.send)
				log.Printf("client unsubscribed from topic %s", t.name)
			}
		case envelope := <-t.broadcast:
			// add to history
			if len(t.history) >= t.historyMaxLen {
				// remove oldest
				t.history = t.history[1:]
			}
			t.history = append(t.history, envelope)

			for client := range t.clients {
				select {
				case client.send <- envelope.Bytes():
				default:
					close(client.send)
					delete(t.clients, client)
				}
			}
		}
	}
}

// Publish broadcasts a message to all subscribed clients.
func (t *Topic) Publish(env *Envelope) {
	t.broadcast <- env
}

// Subscribe adds a new client to the topic.
func (t *Topic) Subscribe(client *Client) {
	t.subscribe <- client
}

// Unsubscribe removes a client from the topic.
func (t *Topic) Unsubscribe(client *Client) {
	t.unsubscribe <- client
}
