
package main

import (
	"aether/broker/aether"
	"aether/broker/server"
	"aether/broker/services"
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

	// Initialize and run the AI service
	aiService := services.NewAIService(broker, aiModule)
	go aiService.Run()

	// Initialize and run the VFS service (as a proxy)
	vfsService := services.NewVfsService(broker)
	go vfsService.Run()

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
