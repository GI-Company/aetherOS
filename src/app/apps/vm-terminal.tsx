
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { cn } from '@/lib/utils';
import { agenticToolUser } from '@/ai/flows/agenticToolUser';
import { Loader2 } from 'lucide-react';

type HistoryItem = {
  type: 'command' | 'response' | 'system';
  content: string;
};

export default function VmTerminalApp() {
  const { user } = useFirebase();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => [
    { type: 'response', content: 'AetherOS Natural Language Shell [Version 1.0.0]' },
    { type: 'response', content: 'Use natural language to interact with the OS. Try "open the browser" or "what is AetherOS?"' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const endOfHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const username = user?.displayName?.split(' ')[0].toLowerCase() || 'guest';
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
    if (!input.trim()) return;

    const command = input.trim();
    const newHistory: HistoryItem[] = [
      ...history,
      { type: 'command', content: `${prompt} ${command}` },
    ];
    setHistory(newHistory);
    setInput('');
    setIsLoading(true);

    try {
        const result = await agenticToolUser(command);
        let responseHistory = [...newHistory];

        if (result.isWorkflow && result.dispatchedEvents) {
            result.dispatchedEvents.forEach(event => {
                responseHistory.push({ type: 'system', content: `[Action Dispatched: ${event.dispatchedEvent}] Payload: ${JSON.stringify(event.payload)}` });
            });
        } else if (result.conversationalResponse) {
            responseHistory.push({ type: 'response', content: result.conversationalResponse });
        } else {
             responseHistory.push({ type: 'response', content: "I was unable to process that command." });
        }
        setHistory(responseHistory);
    } catch (err: any) {
        setHistory(prev => [...prev, { type: 'response', content: `Error: ${err.message}` }]);
    } finally {
        setIsLoading(false);
    }
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
