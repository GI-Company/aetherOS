
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppAether } from '@/lib/use-app-aether';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { TaskGraphEvent } from '@/lib/agent-types';

type HistoryItem = {
  type: 'command' | 'response' | 'system' | 'agent';
  content: string;
};

export default function VmTerminalApp() {
  const { publish, subscribe } = useAppAether();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => [
    { type: 'response', content: 'AetherOS Natural Language Shell [Version 1.0.0]' },
    { type: 'response', content: 'Use natural language to interact with the OS. Try "Summarize my main layout file and save it to summary.md"' },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const endOfHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const username = 'user';
  const hostname = 'aether-ai';
  const prompt = `${username}@${hostname}:~$`;

  useEffect(() => {
    endOfHistoryRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const agentTopics = [
      "agent.taskgraph.created", "agent.taskgraph.started",
      "agent.taskgraph.completed", "agent.taskgraph.failed",
      "agent.tasknode.started", "agent.tasknode.completed", "agent.tasknode.failed"
    ];

    const handleAgentEvent = (payload: any, envelope: any) => {
        let message = '';
        const typedEnvelope = envelope as TaskGraphEvent;
        switch(typedEnvelope.topic) {
            case 'agent.taskgraph.created':
                message = `[Agent] Task graph created. Starting execution...`;
                break;
            case 'agent.taskgraph.started':
                message = `[Agent] Executing ${typedEnvelope.payload.graphId}...`;
                break;
            case 'agent.taskgraph.completed':
                message = `[Agent] Task completed successfully.`;
                setIsLoading(false);
                break;
            case 'agent.taskgraph.failed':
                message = `[Agent] Task failed: ${typedEnvelope.payload.error}`;
                setIsLoading(false);
                break;
            case 'agent.tasknode.started':
                const tool = payload.tool || 'unknown tool';
                message = `[Node: ${payload.nodeId}] Running ${tool}...`;
                break;
            case 'agent.tasknode.completed':
                message = `[Node: ${payload.nodeId}] Completed.`;
                break;
            case 'agent.tasknode.failed':
                message = `[Node: ${payload.nodeId}] Failed: ${payload.error}`;
                break;
        }
        if (message) {
            setHistory(prev => [...prev, { type: 'agent', content: message }]);
        }
    };

    const subscriptions = agentTopics.map(topic => subscribe(topic, handleAgentEvent));

    return () => {
        subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe]);

  const handleCommand = (e: React.FormEvent<HTMLFormElement>) => {
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

    publish('ai:agent', { prompt: command });
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
            'text-yellow-400': item.type === 'agent',
        })}>
          {item.content}
        </div>
      ))}

      { isLoading ? (
         <div className="flex items-center">
            <span className="text-yellow-400 mr-2">[Agent] Processing...</span>
            <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />
        </div>
      ) : (
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
        </form>
      )}
      <div ref={endOfHistoryRef} />
    </div>
  );
}
