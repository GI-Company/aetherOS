import React, { useState, useEffect, useRef } from 'react';
import { useAether } from '../lib/aether_sdk';
import './Terminal.css';

const Terminal = () => {
  const [history, setHistory] = useState([
      { type: 'response', content: 'Aether Kernel Terminal [Version 1.0]' },
      { type: 'response', content: '(c) Aether Technologies. All rights reserved.' },
      { type: 'response', content: ' ' },
  ]);
  const [input, setInput] = useState('');
  const aether = useAether(); // Use the context hook
  const endOfHistoryRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
    inputRef.current?.focus();
  }, [history]);

  useEffect(() => {
    if (!aether) return;

    const handleAIResponse = (env) => {
        console.log("Received AI response:", env);
        setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'response', content: env.payload },
        ]);
    };
    
    const handleAIError = (env) => {
        console.error("Received AI error:", env);
         setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'error', content: env.payload.error || "An unknown AI error occurred." },
        ]);
    };
    
    const sub = aether.subscribe('ai:generate:resp', handleAIResponse);
    const errSub = aether.subscribe('ai:generate:error', handleAIError);

    return () => {
        if (sub) sub();
        if (errSub) errSub();
    }
  }, [aether]);


  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || !aether) return;

    const command = input;
    setHistory((prevHistory) => [
      ...prevHistory,
      { type: 'command', content: command },
    ]);
    setInput('');
    
    try {
        await aether.publish('ai:generate', command);
    } catch (error) {
        console.error("Failed to publish command:", error);
         setHistory((prevHistory) => [
          ...prevHistory,
          { type: 'error', content: 'Failed to send command to Aether Kernel.' },
        ]);
    }
  };

  const handleTerminalClick = () => {
      inputRef.current?.focus();
  }

  return (
    <div className="terminal h-full w-full" onClick={handleTerminalClick}>
      <div className="history">
        {history.map((item, index) => (
          <div key={index} className={`history-item ${item.type}`}>
            {item.type === 'command' && <span className="prompt">$ </span>}
            <pre className="whitespace-pre-wrap font-mono">{item.content}</pre>
          </div>
        ))}
        <div ref={endOfHistoryRef} />
      </div>
      <form onSubmit={handleFormSubmit} className="input-form">
        <span className="prompt">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="input"
          disabled={!aether}
          placeholder={aether ? "Enter a command..." : "Connecting to Aether Kernel..."}
        />
      </form>
    </div>
  );
};

export default Terminal;
