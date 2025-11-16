
package main

import (
	"context"
	"log"
	"net/http"
	"testing"
	"time"

	"aether/broker/aether"
	"aether/broker/server"
	aethersdk "aether/sdk"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/mux"
)

// Helper function to create a test JWT
func newTestJWT(user string, secret []byte) (string, error) {
	claims := jwt.MapClaims{
		"sub": user,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(time.Hour * 1).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func TestBrokerPubSub(t *testing.T) {
	// Start the broker in a goroutine
	broker := aether.NewBroker()
	go broker.Run()

	r := mux.NewRouter()
	server.RegisterBusRoutes(r, broker)

	srv := &http.Server{
		Addr:    ":8081", // Use a different port for testing
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Printf("server error: %v", err)
		}
	}()

	defer srv.Shutdown(context.Background())

	// Wait for the server to start
	time.Sleep(1 * time.Second)

	brokerURL := "http://localhost:8081"
	// This must match the secret in your auth middleware
	testSecret := []byte("aether-secret")
	testToken, err := newTestJWT("test-user", testSecret)
	if err != nil {
		t.Fatalf("error creating test token: %v", err)
	}

	client, err := aethersdk.NewClient(brokerURL, testToken)
	if err != nil {
		t.Fatalf("error creating client: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Subscribe to a topic
	msgs, err := client.Subscribe(ctx, "test-topic")
	if err != nil {
		t.Fatalf("error subscribing: %v", err)
	}

	// Publish a message in a separate goroutine
	go func() {
		time.Sleep(1 * time.Second) // Give the subscriber time to connect
		payload := map[string]string{"message": "hello"}
		if err := client.Publish(ctx, "test-topic", payload); err != nil {
			t.Errorf("error publishing: %v", err)
		}
	}()

	// Wait for the message
	select {
	case env := <-msgs:
		if env.Topic != "test-topic" {
			t.Errorf("got topic %q, want %q", env.Topic, "test-topic")
		}
		var payload map[string]string
		if err := env.UnmarshalPayload(&payload); err != nil {
			t.Fatalf("error unmarshaling payload: %v", err)
		}
		if payload["message"] != "hello" {
			t.Errorf("got message %q, want %q", payload["message"], "hello")
		}
	case <-ctx.Done():
		t.Fatal("timed out waiting for message")
	}
}

