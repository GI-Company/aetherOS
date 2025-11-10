
# AetherOS - The Next-Generation AI-Powered OS

Welcome to AetherOS, a prototype of a web-based, AI-native operating system designed to explore the future of human-computer interaction. This project is built entirely within Firebase Studio, leveraging a modern tech stack to create a seamless, intelligent, and cloud-first user experience.

## Core Features

- **Aether-Architect AI Agent**: The core intelligence of the OS. Press `Cmd/Ctrl + K` to open the Command Palette and issue natural language commands. The agent can chain tools to perform multi-step tasks, such as generating an image and setting it as the wallpaper, or designing a new React component and saving it directly to your file system.

- **Dynamic Window Management**: A classic desktop metaphor with draggable, resizable, and focus-aware windows for a true multitasking environment. Windows are intelligently placed to fit within the viewport on any device.

- **Cloud-Based File System**: User files and folders are securely stored in Firebase Cloud Storage. The File Explorer features image and code previews, drag-and-drop uploads, semantic search, and a secure deletion workflow.

- **Core Application Suite**:
    - **Code Editor**: An intelligent editor with AI-powered code generation (from a prompt) and refactoring (based on project-wide style guides).
    - **File Explorer**: Browse your cloud file system with AI-powered semantic search (e.g., "find my login component").
    - **Design Studio**: Generate React components from a text prompt.
    - **Pixel Streamer**: Generate images from a text prompt.
    - **Workflow Studio**: Visualize processes by describing them in natural language.
    - **Collaboration Hub**: A real-time global chat with user presence, "is typing" indicators, and a user profile browser.
    - **Settings**: Manage your account and security settings. Use AI to generate custom UI themes and accent colors from a text description.

- **Guided Onboarding**: A step-by-step tutorial system provides a welcome tour on first use and offers contextual, app-specific guides to help users master new applications.

- **User Accounts & Security**: Supports Google Sign-In and temporary anonymous guest sessions. Hardened security features include Two-Factor Authentication (2FA) via phone and configurable inactivity timeout protocols.

- **AI-Powered Theming**: Dynamically generate and apply custom color palettes and accent colors by describing your desired theme to the AI in the Settings app.

## Getting Started

1.  **Sign In**: You can start a session by signing in with a Google account or by entering as a guest for a 15-minute trial.
2.  **Follow the Tutorial**: A quick welcome tour will guide you through the basics of the OS.
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

## Project Status & Roadmap

This project is an active prototype. Below is a checklist of features from the official roadmap, indicating what has been implemented and what is planned for the future.

### Phase 1: Harden the Core (Production Readiness)

- [x] **Comprehensive Security Review**
  - [x] Firestore Rules implemented for all current data models.
  - [ ] Input Sanitization for all AI flows.
  - [ ] Dependency Audit process.
- [x] **Scalability & Performance**
  - [ ] Firestore Indexing strategy for complex queries.
  - [x] AI Flow Optimization (core agent logic has been refactored).
  - [x] Client-Side Performance (window management has been optimized).
  - [x] Code Splitting (handled by Next.js App Router).
- [ ] **Robust Error Handling & Monitoring**
  - [ ] Integrate production-grade client-side logging service.
  - [ ] Set up backend monitoring for Firebase services.

### Phase 2: Expand the Ecosystem (Feature Enhancement)

- [ ] **Inter-App Communication & Workflow**
  - [ ] Develop a secure, system-wide API for app-to-app communication.
  - [ ] Enhance Workflow Studio to execute, not just visualize, workflows.
- [x] **Enhanced AI Agency**
  - [x] Implemented basic tool chaining for the AI agent (e.g., generate image -> set wallpaper).
  - [ ] Implement complex, multi-step tool chaining.
  - [ ] Long-term goal: AI self-healing and self-modification capabilities.
- [x] **Core Application Suite**
  - [x] Collaboration App implemented with real-time chat and presence.
  - [x] Real backend for File System using Firebase Storage.
  - [ ] Integrate a browser-based Virtual Machine.

### Phase 3: Developer & Community Platform (Extensibility)

- [ ] **Developer SDK & App Store**
  - [ ] Formalize the App Manifest for public use.
  - [ ] Create a Developer SDK for third-party app development.
  - [ ] Implement dynamic app loading from a central "App Store".
- [ ] **Open Source & Community**
  - [ ] Create comprehensive public documentation.
  - [ ] Establish contribution guidelines.
