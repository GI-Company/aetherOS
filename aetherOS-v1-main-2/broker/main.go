
package main

import (
	"aether/broker/aether"
	"aether/broker/compute"
	"aether/broker/server"
	"aether/broker/services"
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cloud.google.com/go/firestore"
	firebase "firebase.google.com/go/v4"
	"github.com/gorilla/mux"
	"github.com/tetratelabs/wazero"
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

	// Initialize Firestore Client
	firestoreClient, err := app.Firestore(ctx)
	if err != nil {
		log.Fatalf("failed to create firestore client: %v", err)
	}
	defer firestoreClient.Close()


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

	// Initialize Wazero Runtime for Compute Service
	wazeroRuntime := wazero.NewRuntime(ctx)
	computeRuntime := compute.NewWazeroRuntime(wazeroRuntime)
	defer func() {
		if err := computeRuntime.Shutdown(ctx); err != nil {
			log.Printf("Error shutting down wazero runtime: %v", err)
		}
	}()


	// Initialize Services
	aiService := services.NewAIService(broker, aiModule)
	go aiService.Run()

	vfsService := services.NewVfsService(broker, vfsModule, aiModule)
	go vfsService.Run()

	computeService := services.NewComputeService(broker, computeRuntime)
	go computeService.Run()

	agentService := services.NewAgentService(broker, firestoreClient)
	go agentService.Run()

	taskExecutorService := services.NewTaskExecutorService(broker, vfsModule, aiModule)
	go taskExecutorService.Run()
	
	telemetryService := services.NewTelemetryService(broker)
	go telemetryService.Run()

	// Setup router and register API routes
	r := mux.NewRouter()
	server.RegisterBusRoutes(r, broker)

	// Start the server
	port := "8080"
	log.Printf("Starting Aether Kernel on :%s", port)
	if os.Getenv("GEMINI_API_KEY") == "" {
        log.Println("WARNING: GEMINI_API_KEY environment variable is not set.")
    }
	srv := &http.Server{
		Addr:    ":" + port,
		Handler: r,
	}

	go func() {
		if err := srv.ListenAndServe(); err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe error: %v", err)
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	log.Println("Shutting down server...")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}

    