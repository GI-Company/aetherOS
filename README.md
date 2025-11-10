
# AetherOS - The Next-Generation AI-Native OS

Welcome to AetherOS, a prototype of a web-based, AI-native operating system designed to explore the future of human-computer interaction. This project is built entirely within Firebase Studio, leveraging a modern tech stack to create a seamless, intelligent, and cloud-first user experience.

AetherOS is more than just a collection of apps; it's a fully-featured, persistent desktop environment where the AI is not just an add-on, but a core component of the architecture, capable of understanding user intent, chaining tools, and modifying its own environment.

## Core Features

- **Aether-Architect AI Agent**: The core intelligence of the OS, accessible via a command palette (`Cmd/Ctrl + K`). The agent can understand natural language and perform multi-step tasks by chaining tools together.
  - **Tool Chaining**: The agent can dynamically pipe the output of one tool into the input of another. Examples:
    - *"I need a new wallpaper of a futuristic city at night."* (Chains `generateImage` -> `setWallpaper`).
    - *"Design a login form and save it to src/components/login.tsx"* (Chains `designComponent` -> `writeFile`).
  - **Conversational UI**: The agent can respond conversationally if a command doesn't require a tool.

- **Persistent Cloud Workspace**: The user's entire workspace, including open windows, their sizes, and positions, is automatically saved to Firestore and restored on the next login, providing a seamless, persistent environment.

- **Dynamic Window Management**: A classic desktop metaphor with draggable, resizable, and focus-aware windows for a true multitasking environment. The system features "viewport-aware" window placement, ensuring new windows open in a sensible, visible location, and a `maximize` function that respects the screen real estate.

- **Cloud-Based File System**: User files and folders are securely stored in Firebase Cloud Storage, managed via the File Explorer.
  - **Semantic Search**: The File Explorer uses an AI flow to understand the *meaning* of a search query, not just keywords (e.g., "find my component from yesterday").
  - **Intelligent Previews**: The explorer displays image thumbnails for image files and AI-generated, single-sentence summaries for code files, providing at-a-glance context.
  - **Drag-and-Drop Uploads**: A modern, seamless way to upload files to your cloud storage.

- **Core Application Suite**:
  - **Code Editor**: An intelligent editor with AI-powered code generation (from a prompt) and refactoring. The "Intelligent Refactoring" feature uses the project's own `ROADMAP.md` as a style guide to improve existing code.
  - **File Explorer**: Browse and manage your cloud file system with AI-powered semantic search.
  - **Browser (Generative)**: A unique browser that doesn't fetch web pages, but *generates* them on the fly using an AI flow based on the URL or search topic.
  - **Design Studio**: Generate React components from a text prompt.
  - **Pixel Streamer**: Generate images from a text prompt and save them to your file system.
  - **Workflow Studio**: Visualize *and execute* processes by describing them in natural language. The AI generates a Mermaid.js diagram and can then run the corresponding workflow.
  - **Collaboration Hub**: A real-time global chat application featuring user presence ("online", "in App"), "is typing" indicators, and a user profile browser.
  - **Settings**: Manage account, security, and UI preferences. Use AI to generate custom UI themes and accent colors from a text description.

- **User Accounts & Security**: Supports Google Sign-In and temporary, 15-minute anonymous guest sessions. Hardened security features include Two-Factor Authentication (2FA) via phone, configurable inactivity timeout protocols, and robust input sanitization on all AI flows to prevent prompt injection.

- **AI-Powered Theming**: Dynamically generate and apply custom color palettes and accent colors by describing your desired theme to the AI in the Settings app. All themes are persisted to the user's Firestore document.

- **Guided Onboarding & Tutorials**: A step-by-step welcome tour greets new users. The system also provides contextual, app-specific tutorials that appear the first time a user opens a new application, which can be permanently dismissed.

## Getting Started

1.  **Sign In**: Start a session by signing in with a Google account or by entering as a guest for a 15-minute trial.
2.  **Follow the Tutorial**: A quick welcome tour will guide you through the basics of the OS. Contextual tutorials will appear as you open new apps.
3.  **Use the Command Palette**: The primary way to interact with AetherOS is through the AI-powered Command Palette. Press `Cmd/Ctrl + K` and ask the Aether-Architect to perform tasks like:
    - *"Open the code editor and the browser, then arrange them side by side."*
    - *"Find the component for the auth form and open it."*
    - *"I need a new wallpaper of a futuristic city at night."*
    - *"Design a login form and save it to src/components/login.tsx"*
4.  **Explore the Apps**: Click the icons in the dock at the bottom of the screen to launch applications.

## Technology Stack

- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS, ShadCN UI
- **Backend & Data**: Firebase (Authentication, Firestore, Cloud Storage)
- **Generative AI**: Google Genkit, powered by Gemini models.
- **Monitoring**: Sentry (for client-side error logging).

## Project Status & Roadmap

This project is an active prototype. Below is a checklist of features from the official roadmap, indicating what has been implemented and what is planned for the future.

### Phase 1: Harden the Core (Production Readiness) - COMPLETE

- [x] **Comprehensive Security Review**
  - [x] Firestore Rules implemented for all current data models.
  - [x] Input Sanitization for all AI flows.
  - [x] Dependency Audit process established.
- [x] **Scalability & Performance**
  - [x] Firestore Indexing strategy defined for complex queries.
  - [x] AI Flow Optimization and result piping implemented.
  - [x] Client-Side Performance (window management has been optimized).
  - [x] Code Splitting (handled by Next.js App Router).
- [x] **Robust Error Handling & Monitoring**
  - [x] Integrated Sentry for production client-side logging.
  - [x] Established process for backend monitoring for Firebase services.
  - [x] Implemented non-blocking, centralized error handling for Firestore.

### Phase 2: Expand the Ecosystem (Feature Enhancement)

- [ ] **Inter-App Communication & Workflow**
  - [ ] Develop a secure, system-wide API for app-to-app communication.
  - [x] Enhance Workflow Studio to execute, not just visualize, workflows.
- [ ] **Enhanced AI Agency**
  - [ ] Implement complex, multi-step tool chaining with conditional logic.
  - [ ] Long-term goal: AI self-healing and self-modification capabilities.
- [ ] **Core Application Suite**
  - [ ] Integrate a browser-based Virtual Machine.
  - [ ] Fully implement Mail application.

### Phase 3: Developer & Community Platform (Extensibility)

- [ ] **Developer SDK & App Store**
  - [ ] Formalize the App Manifest for public use.
  - [ ] Create a Developer SDK for third-party app development.
  - [ ] Implement dynamic app loading from a central "App Store".
- [ ] **Open Source & Community**
  - [ ] Create comprehensive public documentation.
  - [ ] Establish contribution guidelines.
