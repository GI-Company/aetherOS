
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

// loginHandler handles user authentication requests.
func loginHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok", "message":"login placeholder"}`))
}

// appsHandler returns the list of registered applications.
func appsHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`[]`)) // Return empty list for now
}

// createInstanceHandler handles requests to create a new VM instance.
func createInstanceHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok", "message":"instance created placeholder"}`))
}

// startInstanceHandler handles requests to start a VM instance.
func startInstanceHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok", "message":"instance started placeholder"}`))
}

// kvGetHandler handles requests for the key-value store.
func kvGetHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok", "message":"kv-get placeholder"}`))
}


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

    // Register stub handlers to fix build
    r.HandleFunc("/login", loginHandler).Methods("POST")
    r.HandleFunc("/apps", appsHandler).Methods("GET")
    r.HandleFunc("/instances", createInstanceHandler).Methods("POST")
    r.HandleFunc("/instances/{id}/start", startInstanceHandler).Methods("POST")
    r.HandleFunc("/kv/{key}", kvGetHandler).Methods("GET")


	// Start the server
	port := "8080"
	log.Printf("Starting Aether Kernel on :%s", port)
	if os.Getenv("GEMINI_API_KEY") == "" {
        log.Println("WARNING: GEMINI_API_KEY environment variable is not set.")
    }
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatalf("ListenAndServe error: %v", err)
	}
}

    