package main

import (
	"aether/broker/aether"
	"aether/broker/server"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func main() {
	// Initialize the central message broker
	broker := aether.NewBroker()
	go broker.Run()

	// Initialize services and register them with the broker
	aiModule, err := aether.NewAIModule()
	if err != nil {
		log.Fatalf("failed to create AI module: %v", err)
	}
	defer aiModule.Close()

	// This is a placeholder for a real AI service that would listen to topics
	go func() {
		// Example of how a service would interact with the broker
		// In a real app, this would be more structured.
		topic := broker.GetTopic("ai:generate")
		for msg := range topic.broadcast {
			// This is a simplification. A real service would have a proper subscription channel.
			log.Printf("AI Service received message: %v", msg)
		}
	}()

	// Setup router and register API routes
	r := mux.NewRouter()
	server.RegisterBusRoutes(r, broker)

	// Start the server
	port := "8080"
	log.Printf("Starting Aether Kernel on :%s", port)
	log.Println("Make sure you have set your GEMINI_API_KEY environment variable.")
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("ListenAndServe error: %v", err)
	}
}
