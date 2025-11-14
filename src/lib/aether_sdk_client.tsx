
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Aether SDK for frontend clients.
 * Manages WebSocket connection to the Go kernel.
 */

// This is a placeholder JWT for development.
// In a real application, you'd obtain this from your authentication provider
// after the user logs in.
const FAKE_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcm9udGVuZC11c2VyIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3NjcyMzkwMjJ9.C6F5_5Jrg9A3p6h4Yl-4I0n-bYd28Y9bJmJgYzRzZDA";

interface Envelope {
    id: string;
    topic: string;
    payload: any;
    createdAt: string;
    meta?: Record<string, string>;
}

class AetherClient {
  private baseUrl: string;
  private ws: WebSocket | null;
  private subscriptions: Map<string, Array<(envelope: Envelope) => void>>;
  private messageQueue: string[];
  private isConnected: boolean;
  private connectionPromise: Promise<void> | null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.ws = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.connectionPromise = null;
  }

  connect(): Promise<void> {
    if (this.isConnected && this.ws) {
        return Promise.resolve();
    }
    if (this.connectionPromise) {
        return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
        const url = `${this.baseUrl}?token=${FAKE_JWT}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("Aether-Kernel connection established.");
            this.isConnected = true;
            this.messageQueue.forEach(msg => this.ws!.send(msg));
            this.messageQueue = [];
            resolve();
        };

        this.ws.onmessage = (event) => {
            try {
                const envelope: Envelope = JSON.parse(event.data);
                if (this.subscriptions.has(envelope.topic)) {
                    this.subscriptions.get(envelope.topic)?.forEach(callback => {
                        callback(envelope);
                    });
                }
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.connectionPromise = null; // Allow retrying
            reject(error);
        };

        this.ws.onclose = () => {
            console.log("WebSocket connection closed.");
            this.isConnected = false;
            this.connectionPromise = null; // Allow retrying
        };
    });
    return this.connectionPromise;
  }

  async publish(topic: string, payload: any): Promise<void> {
    const envelope: Partial<Envelope> = {
      id: crypto.randomUUID(),
      topic,
      payload,
      createdAt: new Date().toISOString(),
    };

    const message = JSON.stringify(envelope);

    if (this.isConnected && this.ws) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
      // Attempt to connect if not already doing so
      if (!this.connectionPromise) {
          this.connect();
      }
    }
  }

  subscribe(topic: string, callback: (envelope: Envelope) => void): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic)!.push(callback);
    
    // Return an unsubscribe function
    return () => {
        const callbacks = this.subscriptions.get(topic);
        if (callbacks) {
            this.subscriptions.set(topic, callbacks.filter(cb => cb !== callback));
        }
    }
  }
  
  close() {
    if (this.ws) {
        this.ws.close();
    }
  }
}

// React Context for the Aether Client
const AetherContext = createContext<AetherClient | null>(null);

export const AetherProvider = ({ children }: { children: React.ReactNode }) => {
    const [client, setClient] = useState<AetherClient | null>(null);

    useEffect(() => {
        const aetherClient = new AetherClient('ws://localhost:8080/v1/bus/ws');
        aetherClient.connect()
            .then(() => {
                setClient(aetherClient);
            })
            .catch(err => {
                console.error("Failed to connect Aether client in provider", err);
            });
        
        return () => {
            aetherClient.close();
        };
    }, []);
    

    return (
        <AetherContext.Provider value={client}>
            {children}
        </AetherContext.Provider>
    );
};

export const useAether = (): AetherClient | null => {
    return useContext(AetherContext);
};
