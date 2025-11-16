
package aether

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 2 * 1024 * 1024 // Increased to 2MB for images
)

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub   *Topic // This is the main "bus" topic the client is subscribed to for receiving messages.
	conn  *websocket.Conn
	send  chan []byte
	Topic *Topic // This remains for API consistency, but hub is the primary.
}

// NewClient creates a new client.
func NewClient(conn *websocket.Conn, hubTopic *Topic) *Client {
	return &Client{
		hub:   hubTopic,
		conn:  conn,
		Topic: hubTopic, // The primary topic for this connection
		send:  make(chan []byte, 256),
	}
}

// ReadPump pumps messages from the websocket connection to the hub.
// It now dynamically publishes to the topic specified in the envelope.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.Unsubscribe(c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}

		var env Envelope
		if err := json.Unmarshal(message, &env); err != nil {
			log.Printf("invalid envelope: %v", err)
			continue
		}
		// The client now sends a clean envelope, so env.Payload is what we need.

		// Dynamic Topic Publishing: Get the topic from the envelope and publish.
		targetTopic := c.hub.broker.GetTopic(env.Topic)
		if targetTopic != nil {
			targetTopic.Publish(&env)
		} else {
			log.Printf("topic not found: %s", env.Topic)
		}
	}
}

// WritePump pumps messages from the hub to the websocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
