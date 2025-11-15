
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAether } from '@/lib/aether_sdk_client';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type HistoryItem = {
  type: 'command' | 'response' | 'system';
  content: string;
};

export default function VmTerminalApp() {
  const aether = useAether();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => [
    { type: 'response', content: 'AetherOS Natural Language Shell [Version 1.0.0]' },
    { type: 'response', content: 'Use natural language to interact with the OS. Try "open the browser" or "what is AetherOS?"' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const endOfHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Simplified user/host for demo purposes
  const username = 'user';
  const hostname = 'aether-ai';
  const prompt = `${username}@${hostname}:~$`;

  useEffect(() => {
    endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCommand = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !aether) return;

    const command = input.trim();
    const newHistory: HistoryItem[] = [
      ...history,
      { type: 'command', content: `${prompt} ${command}` },
    ];
    setHistory(newHistory);
    setInput('');
    setIsLoading(true);

    aether.publish('ai:generate', command);

    const handleResponse = (payload: any) => {
      setHistory(prev => [...prev, { type: 'response', content: payload }]);
      setIsLoading(false);
      if (resSub) resSub();
      if (errSub) errSub();
    };

    const handleError = (payload: any) => {
       setHistory(prev => [...prev, { type: 'response', content: `Error: ${payload.error}` }]);
       setIsLoading(false);
       if (resSub) resSub();
       if (errSub) errSub();
    };
    
    const resSub = aether.subscribe('ai:generate:resp', handleResponse);
    const errSub = aether.subscribe('ai:generate:error', handleError);
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
        <div key={index} className={cn('whitespace-pre-wrap break-words', {
            'text-green-400': item.type === 'command',
            'text-cyan-400': item.type === 'system',
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
          disabled={isLoading}
        />
        {isLoading && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
      </form>
      <div ref={endOfHistoryRef} />
    </div>
  );
}
