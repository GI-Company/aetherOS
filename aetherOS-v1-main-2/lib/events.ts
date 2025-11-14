
import { createEventEmitter, type AppEvents } from "./event-emitter";

// Define all possible OS-level events and their payload types
export interface OsEvents extends AppEvents {
  'file-system-change': void; // Payload is void as it's just a notification
}

// Create and export a singleton instance of the emitter for the entire OS
export const osEvent = createEventEmitter<OsEvents>();
