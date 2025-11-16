
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * Aether SDK for frontend clients.
 * Manages WebSocket connection to the Go kernel.
 */

// This is a placeholder JWT for development.
// In a real application, you'd obtain this from your authentication provider
// after the user logs in.
const FAKE_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcm9udGVuZC11c2VyIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3NjcyMzkwMjJ9.C6F5_5Jrg9A3p6h4Yl-4I0n-bYd28Y9bJmJgYzRzZDA";

export interface Envelope {
    id: string;
    topic: string;
    payload: any;
    contentType: string;
    createdAt: string;
    meta?: Record<string, any>;
}

export class AetherClient {
  private baseUrl: string;
  private ws: WebSocket | null;
  private subscriptions: Map<string, Array<(payload: any, envelope: Envelope) => void>>;
  private messageQueue: string[];
  private isConnected: boolean;
  private connectionPromise: Promise<void> | null;
  private reconnectAttempts: number;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.ws = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.connectionPromise = null;
    this.reconnectAttempts = 0;
  }

  connect(): Promise<void> {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        return Promise.resolve();
    }
    if (this.connectionPromise) {
        return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
        const url = `${this.baseUrl}?token=${FAKE_JWT}`;
        console.log(`AetherClient: Connecting to ${url}`);
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("Aether-Kernel connection established.");
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.messageQueue.forEach(msg => this.ws!.send(msg));
            this.messageQueue = [];
            resolve();
        };

        this.ws.onmessage = (event) => {
            try {
                const envelope: Envelope = JSON.parse(event.data);
                if (this.subscriptions.has(envelope.topic)) {
                    this.subscriptions.get(envelope.topic)?.forEach(callback => {
                        callback(envelope.payload, envelope);
                    });
                }
            } catch (error) {
                console.error("Error parsing message:", error, "Data:", event.data);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
        };

        this.ws.onclose = () => {
            console.log("WebSocket connection closed.");
            this.isConnected = false;
            this.connectionPromise = null;
            this.handleReconnect();
        };
    });
    return this.connectionPromise;
  }

  handleReconnect() {
    if (this.reconnectAttempts >= 5) {
        console.error("AetherClient: Max reconnect attempts reached. Please refresh the page.");
        return;
    }
    const delay = Math.pow(2, this.reconnectAttempts) * 1000;
    this.reconnectAttempts++;
    console.log(`AetherClient: Attempting to reconnect in ${delay / 1000}s...`);
    setTimeout(() => {
        this.connect();
    }, delay);
  }

  async publish(topic: string, payload: any, appId?: string): Promise<void> {
    const fullEnvelope: Envelope = {
        id: crypto.randomUUID(),
        topic: topic,
        contentType: 'application/json',
        payload: payload,
        createdAt: new Date().toISOString(),
        meta: {
            appId: appId || 'system',
        },
    };

    const message = JSON.stringify(fullEnvelope);

    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
      if (!this.connectionPromise) {
          this.connect();
      }
    }
  }

  subscribe(topic: string, callback: (payload: any, envelope: Envelope) => void): () => void {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    const callbacks = this.subscriptions.get(topic)!;
    callbacks.push(callback);
    
    return () => {
        const currentCallbacks = this.subscriptions.get(topic);
        if (currentCallbacks) {
            this.subscriptions.set(topic, currentCallbacks.filter(cb => cb !== callback));
        }
    }
  }
  
  close() {
    if (this.ws) {
        this.ws.close();
    }
  }
}

const AetherContext = createContext<AetherClient | null>(null);

export const AetherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client, setClient] = useState<AetherClient | null>(null);

    useEffect(() => {
        const wsHost = process.env.NEXT_PUBLIC_WS_HOST || 'localhost';
        const wsPort = process.env.NEXT_PUBLIC_WS_PORT || '8080';
        const wsPath = process.env.NEXT_PUBLIC_WS_PATH || '/v1/bus/ws';
        const wsProtocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss' : 'ws';

        const aetherClient = new AetherClient(`${wsProtocol}://${wsHost}:${wsPort}${wsPath}`);
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
        React.createElement(AetherContext.Provider, { value: client }, children)
    );
};

export const useAether = (): AetherClient | null => {
    return useContext(AetherContext);
};
