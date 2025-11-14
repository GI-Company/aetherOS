import React, { useState, useEffect, useRef } from 'react';
import { Client } from '../lib/aether_sdk';
import './Terminal.css';

const Terminal = () => {
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [aetherClient, setAetherClient] = useState(null);
  const endOfHistoryRef = useRef(null);

  // Initialize Aether Client
  useEffect(() => {
    const initializeClient = async () => {
      try {
        // The WebSocket URL is now simpler.
        const client = new Client('ws://localhost:8080/v1/bus/ws');
        await client.connect();
        console.log("Aether client connected.");
        setAetherClient(client);

        // Subscribe to AI responses
        client.subscribe('ai:generate:resp', (env) => {
            console.log("Received AI response:", env);
            setHistory((prevHistory) => [
              ...prevHistory,
              { type: 'response', content: env.payload },
            ]);
        });
        
        client.subscribe('ai:generate:error', (env) => {
            console.error("Received AI error:", env);
             setHistory((prevHistory) => [
              ...prevHistory,
              { type: 'error', content: env.payload.error || "An unknown AI error occurred." },
            ]);
        })

      } catch (error) {
        console.error("Failed to connect Aether client:", error);
        setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'error', content: 'Connection to Aether Kernel failed.' },
        ]);
      }
    };
    initializeClient();

    // Cleanup on unmount
    return () => {
      if (aetherClient) {
        aetherClient.close();
      }
    };
  }, []); // Run only once

  useEffect(() => {
    endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !aetherClient) return;

    const command = input;
    setHistory((prevHistory) => [
      ...prevHistory,
      { type: 'command', content: command },
    ]);
    setInput('');
    
    // Publish command to the AI service
    try {
        await aetherClient.publish('ai:generate', command);
    } catch (error) {
        console.error("Failed to publish command:", error);
         setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'error', content: 'Failed to send command to Aether Kernel.' },
        ]);
    }
  };

  return (
    <div className="terminal">
      <div className="history">
        {history.map((item, index) => (
          <div key={index} className={`history-item ${item.type}`}>
            {item.type === 'command' && <span className="prompt">$ </span>}
            {item.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleFormSubmit} className="input-form">
        <span className="prompt">$</span>
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          className="input"
          autoFocus
          disabled={!aetherClient}
          placeholder={aetherClient ? "Enter a command..." : "Connecting to Aether Kernel..."}
        />
      </form>
      <div ref={endOfHistoryRef} />
    </div>
  );
};

export default Terminal;
