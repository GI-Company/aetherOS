# AetherOS: The Quorium Architecture Blueprint

**Version 1.0 | Status: Live Prototype**

## 1. Vision Statement: The Post-Application Operating System

AetherOS represents a fundamental paradigm shift in human-computer interaction. It is not an operating system in the traditional sense, but a **cloud-native, AI-first runtime environment** where the distinction between user, application, and the system itself blurs. Our vision is to create a persistent, intelligent workspace that transcends individual devices, where user intent is translated directly into action by a core AI agent.

The Quorium Architecture is the blueprint for this vision, defining a system that is fluid, extensible, and built on a foundation of decoupled services orchestrated by a central AI kernel.

---

## 2. Architectural Principles

The Quorium stack is designed around three core principles:

1.  **AI as the Core, Not an Add-on**: The central kernel is an AI-first service broker. All system operations, from generating UI components to orchestrating file access, are routed through this intelligent core, making the entire OS contextually aware and responsive to natural language.

2.  **Decoupled Services over Monolithic Apps**: Functionality is provided by independent, long-running Go services (e.g., `AIService`, `VfsService`) that communicate over a universal message bus. The user-facing "apps" are thin React clients that interact with these services, allowing for unprecedented flexibility and scalability. The kernel can be enhanced, or services can be replaced, without ever modifying the presentation layer.

3.  **Cloud-Native Persistence and Orchestration**: The user's entire state—from authentication and files to the position of windows on their desktop—is persisted in the cloud (Firebase). The Go kernel acts as the master orchestrator, connecting the user-facing shell to backend capabilities and cloud services in real-time.

---

## 3. System Blueprint: The Quorium Stack

The AetherOS architecture is composed of two primary macro-components: the **Aether Kernel (Go Backend)** and the **Aether Shell (Next.js Frontend)**, connected by a persistent WebSocket message bus.

### Layer 1: The Aether Kernel (Go Backend)

The Kernel is the heart and brain of AetherOS. It is a lightweight, high-performance Go application responsible for service orchestration and computation. It is explicitly **stateless** regarding user data, focusing solely on processing requests and routing information.

-   **Technology**: Go (Golang) with `gorilla/mux` for routing and `gorilla/websocket` for real-time communication.
-   **Core Components**:
    -   **Message Broker (`/broker/aether/hub.go`, `topic.go`)**: A high-speed, in-memory pub-sub system. It manages a dynamic collection of topics (e.g., `ai:generate`, `vfs:list`) and broadcasts messages from publishers to all subscribed clients. This is the central nervous system of the OS.
    -   **WebSocket Gateway (`/broker/server/bus.go`)**: A crucial bridge that exposes the internal message bus to the outside world over a persistent WebSocket connection. It handles client connections, subscriptions to various response topics (e.g., `ai:generate:resp`), and dynamically publishes incoming client messages to their intended service topic within the kernel.
    -   **Service Host (`/main.go`)**: The main application entry point that initializes and runs all kernel services, connecting them to the message broker.

-   **Kernel Services (`/broker/services`)**: These are the long-running daemons that provide the core functionality of AetherOS. Each service listens on specific topics on the message bus.
    -   **`AIService` (`ai_service.go`)**: The primary intelligence of the OS.
        -   **Subscriptions**: Subscribes to all `ai:*` topics (e.g., `ai:generate`, `ai:generate:page`, `ai:generate:image`, `ai:design:component`).
        -   **Functionality**: When it receives a prompt, it uses the **`AIModule`** (`/broker/aether/ai_module.go`), which integrates the Google Gemini SDK for Go (`google.golang.org/genai`), to communicate with the generative models. It then publishes the result to the corresponding `:resp` topic (e.g., `ai:generate:resp`).
        -   **Cross-Service Interaction**: For tasks like code summarization (`ai:summarize:code`), it directly utilizes the `VfsModule` to read file content before passing it to the AI model, demonstrating inter-service communication within the kernel.
    -   **`VfsService` (`vfs_service.go`)**: A secure proxy for the file system.
        -   **Subscriptions**: Subscribes to all `vfs:*` topics (e.g., `vfs:list`, `vfs:read`, `vfs:write`, `vfs:delete`).
        -   **Functionality**: When it receives a request (e.g., a file list request from the File Explorer), it uses the **`VFSModule`** (`/broker/aether/vfs_module.go`), which integrates the Firebase Admin SDK for Go, to perform the requested operation against the user's sandboxed folder in Firebase Cloud Storage. It then publishes the result (file list, content, or success confirmation) back to the bus on a `:result` topic (e.g., `vfs:list:result`).

### Layer 2: The Aether Shell (Next.js Frontend)

The Shell is the unified presentation layer for AetherOS, built as a modern, single-page application. It renders the entire user experience, from the desktop and window manager to all individual applications, and communicates with the Go kernel in real-time.

-   **Technology**: Next.js, React, TypeScript, Tailwind CSS, ShadCN UI.
-   **Core Components**:
    -   **`AetherClient` (`/src/lib/aether_sdk_client.ts`)**: The frontend's connection to the kernel. This lightweight SDK manages the WebSocket connection, handles message serialization (`Envelope`), and provides a simple `publish()` and `subscribe()` API for all other components and applications.
    -   **`Desktop` (`/src/app/apps/desktop.tsx`)**: The top-level component that manages the state of all open windows, the dock, and the overall workspace.
    -   **`Window` Manager (`/src/components/aether-os/window.tsx`)**: A sophisticated component using `@react-spring/web` and `@use-gesture/react` for fluid, animated window management.
    -   **Persistent Cloud Workspace**: The state of open windows is automatically saved to a Firestore document at `/userWorkspaces/{userId}` and restored on the next login, providing a seamless, persistent environment.

For more detailed information on the frontend architecture, see the **`aetherOS-v1-main-2/README.md`** file.

### Layer 3: Cloud Persistence & Services (Firebase)

Firebase provides the foundational, serverless infrastructure that makes AetherOS a truly cloud-native platform.

-   **Firebase Authentication**: Manages user identity (Google, Anonymous, Apple).
-   **Firebase Cloud Storage**: The official, persistent file system. The **Go kernel's `VfsService`** is the sole authority for interacting with Cloud Storage, ensuring all file operations are secure and centralized.
-   **Firestore Database**: Used for storing user-specific metadata that needs to be accessed quickly by the frontend, such as user preferences (themes), presence information, and saved workspace layouts. The Go kernel does not interact with Firestore; it remains stateless.

---

## 4. The Computing Paradigm: Orchestrated Intent

The interaction flow in AetherOS is fundamentally different from a traditional OS:

1.  **User Action**: A user interacts with an application component (e.g., clicks "Save" in the Code Editor).
2.  **Publish Intent**: The application component does not perform the action. Instead, it serializes the user's *intent* into a JSON message (an `Envelope`) and publishes it to a specific topic on the message bus (e.g., `vfs:write`).
3.  **Kernel Orchestration**: The Go kernel's WebSocket Gateway receives the message and routes it to the appropriate service (the `VfsService`).
4.  **Service Execution**: The `VfsService` executes the request against the backend resource (Firebase Storage) and performs the necessary computation.
5.  **Publish Result**: The service publishes the result (e.g., a success message or an error) back to a response topic on the bus (e.g., `vfs:write:result`).
6.  **UI Update**: The originating application component, subscribed to the response topic, receives the result and updates its UI accordingly (e.g., shows a "Saved" notification).

This model ensures the UI is always responsive, as no action is blocking. It makes the system incredibly robust, as the kernel can manage a queue of operations, and it makes the entire OS extensible, as new services can be added to the kernel to handle new topics without ever changing the frontend code.

---

## 5. Technical Implementation Guide: Building with the Go AI SDK

This project is a Go application designed to be a starting point for building features with Google's generative AI models. It uses the `google.golang.org/genai` package to interact with the Gemini API.

### Go Idioms
- **Simplicity:** Write simple, clear, and readable code.
- **Concurrency:** Use goroutines and channels for concurrent AI requests where appropriate.
- **Error Handling:** Handle errors explicitly when interacting with the AI SDK.

### Security
- **API Key Management:** Never hardcode API keys in your source code. Use environment variables (e.g., `GEMINI_API_KEY`) to manage your credentials securely.

### SDK Usage (`google.golang.org/genai`)

This project uses the `google.golang.org/genai` package. Make sure to add it to your project:
```bash
go get google.golang.org/genai
```

#### Initializing the Client
First, create a client to interact with the Gemini API. This is handled in `/broker/aether/ai_module.go`.

```go
import (
	"context"
	"log"
	"os"

	"google.golang.org/genai"
    "google.golang.org/api/option"
)

// ...

ctx := context.Background()
client, err := genai.NewClient(ctx, option.WithAPIKey(os.Getenv("GEMINI_API_KEY")))
if err != nil {
    log.Fatal(err)
}
defer client.Close()
```

#### Generate Text from Text
This is the most basic use case: sending a text prompt and getting a text response.

```go
model := client.GenerativeModel("gemini-1.5-flash") // Or "gemini-1.5-pro"
resp, err := model.GenerateContent(ctx, genai.Text("Tell me a story about a brave robot."))
if err != nil {
    log.Fatal(err)
}

// Logic to extract and use the text from the response
printResponse(resp)
```

#### Generate Text from Text and Image (Multimodal)
You can send both images and text in a single prompt.

```go
import "google.golang.org/genai"

// ...

model := client.GenerativeModel("gemini-1.5-pro")
imgData, err := os.ReadFile("robot.jpg")
if err != nil {
    log.Fatal(err)
}

prompt := []genai.Part{
    genai.ImageData("jpeg", imgData),
    genai.Text("What is in this picture?"),
}
resp, err := model.GenerateContent(ctx, prompt...)
if err != nil {
    log.Fatal(err)
}

printResponse(resp)
```

---

## 6. AetherOS Production Roadmap

This document outlines the strategic path to evolve AetherOS from an advanced prototype into a production-ready, scalable, and extensible platform.

### Phase 1: Harden the Core (Production Readiness) - COMPLETE

This phase focuses on security, stability, and performance to ensure the system is reliable for real-world use.

#### 1.1. Comprehensive Security Review
- **[DONE] Firestore Rules:** A full audit of all `firestore.rules` has been completed. The rules are secure for all current features, ensuring users can only access their own data.
- **[DONE] Input Sanitization:** All inputs to AI flows are now properly sanitized to prevent prompt injection and other vulnerabilities. All user-facing AI flows treat user input as data, not as instructions.
- **[DONE] Dependency Audit:** The `npm-check-updates` package has been added. Run `npx npm-check-updates` to check for new versions and `npx npm-check-updates -u` to upgrade `package.json`. This establishes a repeatable audit process.

#### 1.2. Scalability & Performance
- **[DONE] Firestore Indexing:** A `firestore.indexes.json` file has been created to define the composite index required by the `userPresence` query, ensuring it remains fast at scale.
- **[DONE] AI Flow Optimization:** The core agent logic has been refactored, and a result-piping mechanism has been implemented, allowing for complex, chained AI workflows.
- **[DONE] Client-Side Performance:** Window management has been optimized to be viewport-aware, preventing off-screen rendering and improving user experience.
- **[DONE] Code Splitting:** The Next.js App Router handles automatic code splitting for all applications in `/src/app/apps/*`, ensuring they are loaded on demand.

#### 1.3. Robust Error Handling & Monitoring
- **[DONE] Client-Side Logging:** Sentry has been integrated for production-grade client-side error logging. The `global-error.tsx` file now reports all caught exceptions to Sentry.
- **[DONE] Backend Monitoring:** A process for setting up backend monitoring for Firebase services is now documented.
  - **Instructions:**
    1.  Go to the Google Cloud Console for your Firebase project.
    2.  Navigate to "Monitoring" > "Dashboards".
    3.  Create a new dashboard.
    4.  Add widgets to monitor key metrics for Firestore (`document/read_count`, `document/write_count`, `network/sent_bytes`), Firebase Authentication (`request_count`), and Cloud Storage (`object_count`, `total_bytes`).
    5.  Navigate to "Monitoring" > "Alerting" to create alerting policies for high error rates or unusual latency in these services.
- **[DONE] Centralized Error Handling**: A non-blocking, centralized error handling system for Firestore permissions has been implemented to provide robust debugging and a stable user experience.

### Phase 2: Expand the Ecosystem (Feature Enhancement)

This phase focuses on expanding the capabilities of the OS to deliver more value to users.

- **[x] **Inter-App Communication & Workflow**
  - [x] Develop a secure, system-wide API for app-to-app communication via an event bus (`osEvent`).
- **[x] **Enhanced AI Agency**
  - [x] Implement complex, multi-step tool chaining with conditional logic (e.g., `searchFiles` -> `openFile`).
  - [ ] Long-term goal: AI self-healing and self-modification capabilities.
- **[x] **Core Application Suite**
  - [ ] Integrate a browser-based Virtual Machine.
  - [ ] Fully implement Mail application.
  - [x] **PWA Support**: AetherOS itself is now an installable PWA.

### Phase 3: Developer & Community Platform (Extensibility)

This phase focuses on transforming AetherOS into a platform that others can build upon.

- [ ] **Developer SDK & App Store**
  - [ ] Formalize the App Manifest for public use.
  - [ ] Create a Developer SDK for third-party app development.
  - [ ] Implement dynamic app loading from a central "App Store".
- [ ] **Open Source & Community**
  - [ ] Create comprehensive public documentation.
  - [ ] Establish contribution guidelines.
