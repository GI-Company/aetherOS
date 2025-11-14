
# AetherOS: The Quorium Architecture Blueprint

**Version 1.0 | Status: Live Prototype**

## 1. Vision Statement: The Post-Application Operating System

AetherOS represents a fundamental paradigm shift in human-computer interaction. It is not an operating system in the traditional sense, but a **cloud-native, AI-first runtime environment** where the distinction between user, application, and the system itself blurs. Our vision is to create a persistent, intelligent workspace that transcends individual devices, where user intent is translated directly into action by a core AI agent.

The Quorium Architecture is the blueprint for this vision, defining a system that is fluid, extensible, and built on a foundation of decoupled services orchestrated by a central AI kernel.

---

## 2. Architectural Principles

The Quorium stack is designed around three core principles:

1.  **AI as the Core, Not an Add-on**: The central kernel is an AI-first service broker. All system operations, from generating text to orchestrating file access, are routed through this intelligent core, making the entire OS contextually aware and responsive to natural language.

2.  **Decoupled Services over Monolithic Apps**: Functionality is provided by independent services (e.g., `AIService`, `VfsService`) that communicate over a universal message bus. The user-facing "apps" are thin clients that interact with these services, allowing for unprecedented flexibility and scalability. The kernel can be enhanced, or services can be replaced, without ever modifying the presentation layer.

3.  **Cloud-Native Persistence and Orchestration**: The user's entire state—from authentication and files to the position of windows on their desktop—is persisted in the cloud. The Go kernel acts as the master orchestrator, connecting the user-facing shell to backend capabilities and cloud services in real-time.

---

## 3. System Blueprint: The Quorium Stack

The AetherOS architecture is composed of two primary macro-components: the **Aether Kernel (Go Backend)** and the **Aether Shell (React Frontend)**, connected by a persistent WebSocket message bus.

 
*(Diagram placeholder - a visual representation would go here)*

### Layer 1: The Aether Kernel (Go Backend)

The Kernel is the heart and brain of AetherOS. It is a lightweight, high-performance Go application responsible for service orchestration and computation. It is explicitly **stateless** regarding user data, focusing solely on processing requests and routing information.

-   **Technology**: Go (Golang)
-   **Core Components**:
    -   **Message Broker (`/broker/aether`)**: A high-speed, in-memory pub-sub system. It manages a dynamic collection of topics (e.g., `ai:generate`, `vfs:list`) and broadcasts messages from publishers to all subscribed clients. This is the central nervous system of the OS.
    -   **WebSocket Gateway (`/broker/server`)**: A crucial bridge that exposes the internal message bus to the outside world over a persistent WebSocket connection. It handles client connections, subscriptions to various response topics (e.g., `ai:generate:resp`), and dynamically publishes incoming client messages to their intended service topic within the kernel.
    -   **Service Host (`main.go`)**: The main application entry point that initializes and runs all kernel services, connecting them to the message broker.

-   **Kernel Services (`/broker/services`)**: These are the long-running daemons that provide the core functionality of AetherOS. Each service listens on specific topics on the message bus.
    -   **`AIService`**: The primary intelligence of the OS. It subscribes to all `ai:*` topics. When it receives a prompt (e.g., from the Terminal), it uses the **`AIModule`** (which integrates the Google Gemini SDK) to communicate with the generative models. It then publishes the result to the corresponding `:resp` topic.
    -   **`VfsService`**: A secure proxy for the file system. It subscribes to all `vfs:*` topics. When it receives a request (e.g., a file list request from the File Explorer), it uses the **`VFSModule`** (which integrates the Firebase Storage SDK for Go) to perform the requested operation against the user's cloud storage. It then publishes the files list or a success confirmation back to the bus.

### Layer 2: The Aether Shell (React Frontend)

The Shell is the presentation layer of the OS. It is a sophisticated, single-page application responsible for rendering the entire user experience, from the desktop to the individual applications.

-   **Technology**: React, Vite, Tailwind CSS
-   **Core Components**:
    -   **`AetherClient` (`/frontend/src/lib/aether_sdk.js`)**: The frontend's connection to the kernel. This SDK manages the WebSocket connection, handles message serialization (envelopes), and provides a simple `publish()` and `subscribe()` API for all other components and applications.
    -   **`Desktop` (`/frontend/src/components/Desktop.jsx`)**: The top-level component that manages the state of all open windows, the dock, and the overall workspace.
    -   **Window Manager (`/frontend/src/components/Window.jsx`)**: A sophisticated component using `react-draggable` and `react-resizable` to provide a classic desktop windowing experience. It handles focus, z-index stacking, and minimization/maximization.

-   **Applications (`/frontend/src/apps/`)**: These are not traditional applications but rather React components that act as user interfaces for the kernel's services.
    -   **Example 1: `FileExplorer.jsx`**: Does **not** contain any file system logic. When the user navigates to a folder, it simply calls `aether.publish('vfs:list', { path: '/home/user' })`. It then subscribes to the `vfs:list:result` topic and updates its UI when it receives the file list from the Go kernel.
    -   **Example 2: `CodeEditor.jsx`**: To save a file, it calls `aether.publish('vfs:write', { path: '...', content: '...' })`. It subscribes to `vfs:write:result` to know when the save is complete.
    -   **Example 3: `VmTerminal.jsx` (Placeholder)**: When a user types a command, it calls `aether.publish('ai:generate', { prompt: '...' })` and displays the response it receives on `ai:generate:resp`.

### Layer 3: Cloud Persistence & Services (Firebase)

Firebase provides the foundational, serverless infrastructure that makes AetherOS a truly cloud-native platform. The frontend and backend interact with it for different purposes.

-   **Firebase Authentication**: Manages user identity (Google, Anonymous). The frontend handles the sign-in flow, and the resulting user identity is used for security across all services.
-   **Firebase Cloud Storage**: The official, persistent file system for AetherOS. The **Go kernel's `VfsService`** is the sole authority for interacting with Cloud Storage, ensuring all file operations are secure and centralized. The frontend never accesses Storage directly.
-   **Firestore Database**: Used for storing user-specific metadata that needs to be accessed quickly by the frontend, such as user preferences, presence information, and saved workspace layouts.

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
