
package main

import (
	"aether/broker/aether"
	"aether/broker/server"
	"aether/broker/services"
	"context"
	"log"
	"net/http"
	"os"

	firebase "firebase.google.com/go/v4"
	"github.com/gorilla/mux"
	"google.golang.org/api/option"
)

func main() {
	// Initialize Firebase App
	ctx := context.Background()
	// Use service account credentials if available (for production), otherwise ADC
	opt := option.WithCredentialsFile(os.Getenv("GOOGLE_APPLICATION_CREDENTIALS"))
	app, err := firebase.NewApp(ctx, nil, opt)
	if err != nil {
		log.Fatalf("error initializing app: %v\n", err)
	}

	// Initialize the central message broker
	broker := aether.NewBroker()
	go broker.Run()

	// Initialize VFS Module (backed by Firebase Storage)
	vfsModule, err := aether.NewVFSModule(app)
	if err != nil {
		log.Fatalf("failed to create VFS module: %v", err)
	}
	defer vfsModule.Close()

	// Initialize AI Module
	aiModule, err := aether.NewAIModule()
	if err != nil {
		log.Fatalf("failed to create AI module: %v", err)
	}
	defer aiModule.Close()

	// Initialize AI Service (now with VFS access)
	aiService := services.NewAIService(broker, aiModule, vfsModule)
	go aiService.Run()


	// Initialize VFS Service
	vfsService := services.NewVfsService(broker, vfsModule)
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

    