# AetherOS Shell

This is the Next.js frontend application for AetherOS, a cloud-native, AI-first operating system. This application serves as the "shell," providing the complete user interface, including the desktop, window manager, and all first-party applications.

## 🚀 Features

-   **Multi-Window Desktop Environment**: A fluid, draggable, and resizable windowing system built with React and modern web technologies.
-   **AI-First Applications**: A suite of core applications (`File Explorer`, `Code Editor`, `Browser`) that are deeply integrated with the AI services provided by the Go kernel.
-   **Real-time Kernel Communication**: Connects to the Go backend via a persistent WebSocket connection, managed by the `AetherClient` SDK.
-   **Persistent Workspaces**: User window layouts and preferences are saved to Firestore and restored on subsequent sessions, providing a seamless experience.
-   **Extensible App Model**: New applications can be easily added by creating a new React component and registering it in `src/lib/apps.ts`.

## 🛠️ Tech Stack

-   **Framework**: [Next.js](https://nextjs.org/) (with App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with [ShadCN UI](https://ui.shadcn.com/) components.
-   **Animation**: `@react-spring/web` and `@use-gesture/react` for fluid window management.
-   **Backend Communication**: Custom `AetherClient` SDK for WebSocket messaging.
-   **Authentication & Database**: [Firebase](https://firebase.google.com/) for user authentication and Firestore for metadata storage.

## ⚙️ Getting Started

### Prerequisites

-   Node.js (v18 or later)
-   The AetherOS Go Kernel running locally.

### Installation

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```

### Running the Development Server

First, ensure your AetherOS Go Kernel is running on `localhost:8080`.

Then, run the Next.js development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📁 Project Structure

-   `/src/app`: The core of the Next.js application.
    -   `/src/app/apps`: Contains the component for each core AetherOS application (e.g., `code-editor.tsx`, `file-explorer.tsx`).
    -   `/src/app/layout.tsx`: The root layout for the application.
    -   `/src/app/page.tsx`: The main entry point, which renders the `Desktop` component.
-   `/src/components/aether-os`: Contains the core OS UI components like the `Desktop`, `Window`, `Dock`, and `TopBar`.
-   `/src/components/ui`: Houses the reusable ShadCN UI components.
-   `/src/lib`: Contains core libraries and utilities.
    -   `aether_sdk_client.ts`: The client-side SDK for communicating with the Go kernel.
    -   `apps.ts`: The central registry for all installable applications.
    -   `utils.ts`: General utility functions.
-   `/src/firebase`: Contains all Firebase-related hooks and configuration.

## 🤝 Contributing

Contributions are welcome! Please refer to the main repository's `CONTRIBUTING.md` file for guidelines.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
