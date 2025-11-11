
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { cn } from '@/lib/utils';

type HistoryItem = {
  type: 'command' | 'response';
  content: string;
};

export default function VmTerminalApp() {
  const { user } = useFirebase();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => [
    { type: 'response', content: 'AetherOS Virtual Environment [Version 1.0.0]' },
    { type: 'response', content: '(c) Aether Corporation. All rights reserved.' },
  ]);
  const endOfHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const username = user?.displayName?.split(' ')[0].toLowerCase() || 'guest';
  const hostname = 'aether';
  const prompt = `${username}@${hostname}:~$`;

  useEffect(() => {
    endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommand = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) return;

    const command = input.trim();
    const newHistory: HistoryItem[] = [
      ...history,
      { type: 'command', content: `${prompt} ${command}` },
    ];

    // Simulated command execution
    if (command === 'clear') {
      setHistory([]);
    } else if (command === 'help') {
        newHistory.push({ type: 'response', content: 'Available commands: help, clear, date, whoami' });
    } else if (command === 'date') {
        newHistory.push({ type: 'response', content: new Date().toString() });
    } else if (command === 'whoami') {
        newHistory.push({ type: 'response', content: username });
    } else {
        newHistory.push({ type: 'response', content: `command not found: ${command}` });
    }
    
    setHistory(newHistory);
    setInput('');
  };
  
  const handleTerminalClick = () => {
    inputRef.current?.focus();
  }

  return (
    <div 
        className="w-full h-full bg-black text-white font-mono text-sm p-4 overflow-y-auto"
        onClick={handleTerminalClick}
    >
      {history.map((item, index) => (
        <div key={index} className={cn('whitespace-pre-wrap', {
            'text-green-400': item.type === 'command'
        })}>
          {item.content}
        </div>
      ))}

      <form onSubmit={handleCommand} className="flex">
        <span className="text-green-400">{prompt}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-grow bg-transparent text-white outline-none pl-2"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
        />
      </form>
      <div ref={endOfHistoryRef} />
    </div>
  );
}
