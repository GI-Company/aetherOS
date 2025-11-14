/**
 * Aether SDK for frontend clients to communicate with the Aether Kernel.
 */

// This is a placeholder for a real JWT. In a production system, this would
// be obtained from an authentication service.
const FAKE_JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmcm9udGVuZC11c2VyIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3NjcyMzkwMjJ9.C6F5_5Jrg9A3p6h4Yl-4I0n-bYd28Y9bJmJgYzRzZDA";


export class Client {
  constructor(baseUrl) {
    // The base URL should be ws://localhost:8080/v1/bus/ws
    this.baseUrl = baseUrl;
    this.ws = null;
    this.subscriptions = new Map();
    this.messageQueue = [];
    this.isConnected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
        // The URL no longer needs a topic, as routing is handled by the backend.
        const url = `${this.baseUrl}?token=${FAKE_JWT}`;
        this.ws = new WebSocket(url);

        this.ws.onopen = () => {
            console.log("WebSocket connection established.");
            this.isConnected = true;
            // Send any queued messages
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
            reject(error);
        };

        this.ws.onclose = () => {
            console.log("WebSocket connection closed.");
            this.isConnected = false;
        };
    });
  }

  /**
   * Publishes a message to a topic on the Aether message bus.
   * @param {string} topic The topic to publish to.
   * @param {any} payload The message payload.
   */
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
      // Queue the message if the connection is not yet open
      this.messageQueue.push(message);
      console.log("Connection not open. Queuing message for topic:", topic);
    }
  }

  /**
   * Subscribes to a topic on the Aether message bus.
   * @param {string} topic The topic to subscribe to.
   * @param {function} callback The callback to invoke when a message is received.
   */
  subscribe(topic, callback) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, []);
    }
    this.subscriptions.get(topic).push(callback);
    
    // This just registers the callback client-side. The server now sends all
    // relevant topic messages over the single WebSocket connection.
  }
  
  close() {
    if (this.ws) {
        this.ws.close();
    }
  }
}
