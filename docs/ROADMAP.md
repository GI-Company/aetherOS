# AetherOS Production Roadmap

This document outlines the strategic path to evolve AetherOS from an advanced prototype into a production-ready, scalable, and extensible platform.

## Phase 1: Harden the Core (Production Readiness) - COMPLETE

This phase focuses on security, stability, and performance to ensure the system is reliable for real-world use.

### 1.1. Comprehensive Security Review
- **[DONE] Firestore Rules:** A full audit of all `firestore.rules` has been completed. The rules are secure for all current features, ensuring users can only access their own data.
- **[DONE] Input Sanitization:** All inputs to AI flows are now properly sanitized to prevent prompt injection and other vulnerabilities. All user-facing AI flows treat user input as data, not as instructions.
- **[DONE] Dependency Audit:** The `npm-check-updates` package has been added. Run `npx npm-check-updates` to check for new versions and `npx npm-check-updates -u` to upgrade `package.json`. This establishes a repeatable audit process.

### 1.2. Scalability & Performance
- **[DONE] Firestore Indexing:** A `firestore.indexes.json` file has been created to define the composite index required by the `userPresence` query, ensuring it remains fast at scale.
- **[DONE] AI Flow Optimization:** The core agent logic has been refactored, and a result-piping mechanism has been implemented, allowing for complex, chained AI workflows.
- **[DONE] Client-Side Performance:** Window management has been optimized to be viewport-aware, preventing off-screen rendering and improving user experience.
- **[DONE] Code Splitting:** The Next.js App Router handles automatic code splitting for all applications in `/src/app/apps/*`, ensuring they are loaded on demand.

### 1.3. Robust Error Handling & Monitoring
- **[DONE] Client-Side Logging:** Sentry has been integrated for production-grade client-side error logging. The `global-error.tsx` file now reports all caught exceptions to Sentry.
- **[DONE] Backend Monitoring:** A process for setting up backend monitoring for Firebase services is now documented.
  - **Instructions:**
    1.  Go to the Google Cloud Console for your Firebase project.
    2.  Navigate to "Monitoring" > "Dashboards".
    3.  Create a new dashboard.
    4.  Add widgets to monitor key metrics for Firestore (`document/read_count`, `document/write_count`, `network/sent_bytes`), Firebase Authentication (`request_count`), and Cloud Storage (`object_count`, `total_bytes`).
    5.  Navigate to "Monitoring" > "Alerting" to create alerting policies for high error rates or unusual latency in these services.
- **[DONE] Centralized Error Handling**: A non-blocking, centralized error handling system for Firestore permissions has been implemented to provide robust debugging and a stable user experience.

## Phase 2: Expand the Ecosystem (Feature Enhancement)

This phase focuses on expanding the capabilities of the OS to deliver more value to users.

### 2.1. Inter-App Communication & Workflow
- **System-Wide API:** Develop a secure, internal API that allows applications to communicate with each other. For example, the `CodeEditorApp` could directly open a preview in the `BrowserApp`.
- **Advanced Workflow Studio:** Enhance the Workflow Studio to not just visualize, but *execute* workflows. A user could design a workflow that "when a file is saved in the Code Editor, run a script and post the result to the Collaboration app."

### 2.2. Enhanced AI Agency
- **Complex Tool Chaining:** Upgrade the `agenticToolUser` to handle conditional logic and more complex multi-step tool chains (e.g., "Find the latest sales report, summarize it, and if the total is over $10,000, draft an email with the summary").
- **Self-Healing & Self-Modification:** A long-term goal is to grant the AI limited capabilities to modify its own code or configuration to fix errors or improve performance, with human oversight.

### 2.3. Core Application Suite
- **Virtual Machine:** Integrate a lightweight, browser-based virtual machine (e.g., using WebAssembly) to allow for sandboxed code execution.
- **Mail App:** Fully implement the `MailApp` with a real backend service.

## Phase 3: Developer & Community Platform (Extensibility)

This phase focuses on transforming AetherOS into a platform that others can build upon.

### 3.1. Developer SDK & App Store
- **App Manifest:** Formalize the `App` type in `src/lib/apps.ts` into a public manifest file.
- **Developer SDK:** Create an SDK that allows third-party developers to build and submit their own applications for AetherOS.
- **Dynamic App Loading:** Implement a system to dynamically load and install new applications from a central "App Store" without requiring a full redeployment of the OS.

### 3.2. Open Source & Community
- **Documentation:** Create comprehensive public documentation for the architecture, AI flows, and developer SDK.
- **Contribution Guidelines:** Establish clear guidelines for community contributions to the open-source project.
