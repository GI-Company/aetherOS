
'use client';

import { createContext, useMemo } from 'react';
import { useAether, type AetherClient, type Envelope } from '@/lib/aether_sdk_client';

export interface ScopedAetherClient {
  publish: (topic: string, payload: any) => Promise<void>;
  subscribe: (topic: string, callback: (payload: any, envelope: Envelope) => void) => () => void;
}

export interface AetherAppContextType {
  appId: string;
  client: ScopedAetherClient;
}

export const AetherAppContext = createContext<AetherAppContextType | null>(null);

export const AetherAppProvider: React.FC<{ appId: string; children: React.ReactNode }> = ({ appId, children }) => {
  const aether = useAether();

  const scopedClient = useMemo((): ScopedAetherClient => {
    return {
      publish: (topic: string, payload: any) => {
        if (!aether) {
          console.error("Aether client is not available.");
          return Promise.reject("Aether client is not available.");
        }
        return aether.publish(topic, payload, appId);
      },
      subscribe: (topic: string, callback: (payload: any, envelope: Envelope) => void) => {
        if (!aether) {
          console.warn("Aether client not available for subscription.");
          return () => {}; // Return a no-op unsubscribe function
        }
        return aether.subscribe(topic, callback);
      },
    };
  }, [aether, appId]);

  const contextValue = useMemo(() => ({
    appId,
    client: scopedClient,
  }), [appId, scopedClient]);

  return (
    <AetherAppContext.Provider value={contextValue}>
      {children}
    </AetherAppContext.Provider>
  );
};
