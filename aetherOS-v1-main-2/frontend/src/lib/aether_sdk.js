import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * Aether SDK for frontend clients.
 * Manages WebSocket connection to the Go kernel and Firebase initialization.
 */

const FAKE_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcm9udGVuZC11c2VyIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3NjcyMzkwMjJ9.C6F5_5Jrg9A3p6h4Yl-4I0n-bYd28Y9bJmJgYzRzZDA";

const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_API_KEY",
  authDomain: "REPLACE_WITH_YOUR_AUTH_DOMAIN",
  projectId: "REPLACE_WITH_YOUR_PROJECT_ID",
  storageBucket: "REPLACE_WITH_YOUR_STORAGE_BUCKET",
  messagingSenderId: "REPLACE_WITH_YOUR_MESSAGING_SENDER_ID",
  appId: "REPLACE_WITH_YOUR_APP_ID"
};


class AetherClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.ws = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.isConnected = false;
    this.connectionPromise = null;
    
    // Firebase setup
    try {
        this.firebaseApp = initializeApp(firebaseConfig);
        this.auth = getAuth(this.firebaseApp);
    } catch(e) {
        console.error("Firebase initialization failed. Please check your firebaseConfig in aether_sdk.js", e);
        this.firebaseApp = null;
        this.auth = null;
    }
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
    const [user, setUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    useEffect(() => {
        const aetherClient = new AetherClient('ws://localhost:8080/v1/bus/ws');
        aetherClient.connect()
            .then(() => {
                setClient(aetherClient);
                
                if (aetherClient.auth) {
                    const unsubscribe = onAuthStateChanged(aetherClient.auth, (firebaseUser) => {
                        setUser(firebaseUser);
                        setIsLoadingUser(false);
                    });
                    return () => unsubscribe();
                } else {
                    setIsLoadingUser(false);
                }
            })
            .catch(err => {
                console.error("Failed to connect Aether client in provider", err);
                 setIsLoadingUser(false);
            });
        
        return () => {
            aetherClient.close();
        };
    }, []);
    
    // Combine client and user state into the context value
    const contextValue = client ? { ...client, user, isLoadingUser } : null;

    return (
        <AetherContext.Provider value={contextValue}>
            {children}
        </AetherContext.Provider>
    );
};

export const useAether = () => {
    return useContext(AetherContext);
};
