
'use client';

import { createContext, useContext, useMemo } from 'react';
import { useAether, AetherClient, Envelope } from './aether_sdk_client';

// The context will hold the app's ID
const AppAetherContext = createContext<string | null>(null);

// The provider component that will wrap each app in a window
export const AppAetherProvider = AppAetherContext.Provider;

/**
 * A hook for applications to get a scoped Aether client.
 * This client automatically includes the app's ID in all published messages.
 */
export function useAppAether(): {
  publish: (topic: string, payload: any) => Promise<void>;
  subscribe: (topic: string, callback: (payload: any, envelope: Envelope) => void) => () => void;
} {
  const aether = useAether();
  const appId = useContext(AppAetherContext);

  if (!appId) {
    throw new Error('useAppAether must be used within an AppAetherProvider (likely within a Window component).');
  }

  // Memoize the scoped publish function to prevent re-creation on every render
  const publish = useMemo(() => {
    return (topic: string, payload: any) => {
      if (!aether) {
        return Promise.reject(new Error("Aether client is not available."));
      }
      return aether.publish(topic, payload, appId);
    };
  }, [aether, appId]);

  const subscribe = useMemo(() => {
    return (topic: string, callback: (payload: any, envelope: Envelope) => void) => {
        if (!aether) {
            console.warn("Aether client not available for subscription.");
            return () => {}; // Return a no-op unsubscribe function
        }
        return aether.subscribe(topic, callback);
    }
  }, [aether])

  return { publish, subscribe };
}
