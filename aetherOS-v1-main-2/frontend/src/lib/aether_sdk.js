import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * Aether SDK for frontend clients to communicate with the Aether Kernel.
 */

// This is a placeholder for a real JWT. In a production system, this would
// be obtained from an authentication service.
const FAKE_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcm9udGVuZC11c2VyIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3NjcyMzkwMjJ9.C6F5_5Jrg9A3p6h4Yl-4I0n-bYd28Y9bJmJgYzRzZDA";

class AetherClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.ws = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.connectionPromise = null;
  }

  connect() {
    if (this.isConnected) {
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
            this.messageQueue.forEach(msg => this.ws.send(msg));
            this.messageQueue = [];
            resolve();
        };

        this.ws.onmessage = (event) => {
            try {
                const envelope = JSON.parse(event.data);
                // console.log("Received envelope:", envelope.topic, envelope.payload);
                if (this.subscriptions.has(envelope.topic)) {
                    this.subscriptions.get(envelope.topic).forEach(callback => {
                        callback(envelope);
                    });
                }
            } catch (error) {
                console.error("Error parsing message:", error);
            }
        };

        this.ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            this.connectionPromise = null;
            reject(error);
        };

        this.ws.onclose = () => {
            console.log("WebSocket connection closed.");
            this.isConnected = false;
            this.connectionPromise = null;
        };
    });
    return this.connectionPromise;
  }

  async publish(topic, payload) {
    const envelope = {
      id: crypto.randomUUID(),
      topic,
      payload,
      createdAt: new Date().toISOString(),
    };

    const message = JSON.stringify(envelope);

    if (this.isConnected) {
      this.ws.send(message);
    } else {
      this.messageQueue.push(message);
    }
  }

  subscribe(topic, callback) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic).push(callback);
    
    // We could add an unsubscribe method to remove callbacks
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
const AetherContext = createContext(null);

export const AetherProvider = ({ children }) => {
    const [client, setClient] = useState(null);

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

export const useAether = () => {
    return useContext(AetherContext);
};
