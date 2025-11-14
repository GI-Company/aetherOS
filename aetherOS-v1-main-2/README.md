# Aether: A Browser-Native OS with an AI Core

Aether is an experimental project to build a lightweight, browser-native operating system. It uses a Go-based microservices architecture to provide a runtime for applications, with a dedicated AI core powered by Google Gemini.

## Architecture

The Aether ecosystem is composed of two main components working in concert:

### 1. The Frontend: Aether OS Shell

*   **Location:** `/frontend`
*   **Technology:** React.js
*   **Description:** This is the user-facing interface for Aether. It acts as the "desktop environment" for the browser-based OS, allowing users to launch and interact with Aether applications and services. It communicates with the backend kernel via a WebSocket connection.

### 2. The Backend: Aether Kernel

*   **Location:** `/` (Root Project)
*   **Technology:** Go
*   **Description:** This is the heart of the operating system. It's a Go-based application that runs as a single server. It is built on a microservice-style architecture where different kernel services (like VFS and AI) communicate over a central, in-process message bus.
*   **Features:**
    *   **Modular Services:** Key functionalities like the Virtual File System (VFS) and AI Service are implemented as independent services running within the kernel.
    *   **Central Message Bus:** Services communicate asynchronously using a publish-subscribe model, allowing for a decoupled and extensible architecture.
    *   **WebSocket Bridge:** Exposes the kernel's message bus to the frontend via a WebSocket connection, enabling real-time, bidirectional communication.
    *   **AI Service:** Integrates with Google's Gemini models to provide powerful generative AI capabilities to the entire OS.
    *   **Virtual File System:** A VFS service that proxies file operations to the frontend, which uses IndexedDB for persistence.

## Getting Started

To run the full Aether ecosystem, you need to start the backend kernel and the frontend development server.

### Prerequisites

*   Go (1.23 or later)
*   Node.js and npm
*   A valid `GEMINI_API_KEY` set as an environment variable.

### 1. Run the Aether Kernel

In your terminal, from the root directory of the project, run the following command:

```bash
go run main.go
```

The kernel will start and will be available on the port configured in `config.yaml` (default: `8080`). It handles both HTTP requests and WebSocket connections.

### 2. Run the Frontend

In a separate terminal, navigate to the `frontend` directory, install dependencies, and start the Vite development server:

```bash
cd frontend
npm install
npm run dev
```

The Aether OS shell will now be accessible in your browser, typically at `http://localhost:5173`.

## Usage

Interaction with the Aether kernel and its services is done via JSON messages sent over the WebSocket connection. The frontend `VFSProxy` and other future services will handle this communication.

For example, to write a file to the VFS, the frontend would send a message like this over the WebSocket:

```json
{
  "topic": "vfs:write",
  "payload": {
    "path": "/home/user/welcome.txt",
    "content": "Hello from Aether!"
  }
}
```

Similarly, to use the AI service, a message would be sent to the `ai:generate` topic:

```json
{
  "topic": "ai:generate",
  "payload": "Tell me a story about a brave robot."
}
```

The kernel service would process the request and publish the response on a corresponding response topic (e.g., `ai:generate:resp`), which the frontend would be listening for.

## Deeper Dive into Services

The Aether kernel is built around a set of services that communicate over the message bus. Here's a closer look at the core services available.

### Virtual File System (VFS)

The VFS service provides a hierarchical file system abstraction. All file operations are broadcast over the WebSocket, allowing the frontend to stay in sync with any changes.

**Topics:**

*   `vfs:list`: Requests a listing of files and folders at a given path.
    *   **Response:** `vfs:list:result` with a payload containing the file list.
*   `vfs:create:file`: Creates a new empty file at the specified path.
*   `vfs:create:folder`: Creates a new folder at the specified path.
*   `vfs:delete`: Deletes a file or folder at the specified path.

### AI Service

The AI service is a gateway to the powerful capabilities of Google's Gemini models. It allows any part of the Aether system to leverage generative AI.

**Topics:**

*   `ai:generate`: Sends a prompt to the Gemini model for text generation.
    *   **Response:** `ai:generate:resp` with the generated content from the model.

## Contributing

Aether is an open and experimental project. Contributions are welcome! If you'd like to get involved, please check out the open issues on GitHub. Feel free to fork the repository, make your changes, and submit a pull request.

## Roadmap

This project is in its early stages. Here are some of the features and improvements planned for the future:

*   **Application Runtime:** A more robust system for defining, installing, and running applications within Aether.
*   **Persistent Storage:** Implementing client-side storage using IndexedDB to make the VFS truly persistent across sessions.
*   **User Authentication:** Adding user accounts and authentication to personalize the Aether experience.
*   **Expanded AI Services:** Integrating more of Gemini's capabilities, such as multimodal input (text and images) and streaming responses.
