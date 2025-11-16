
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppAether } from '@/lib/use-app-aether';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { HELLO_WORLD_WASM_BASE64 } from '@/app/apps/hello-world/hello-world.wasm';

type HistoryItem = {
  type: 'command' | 'response' | 'system' | 'agent' | 'stdout' | 'stderr' | 'error';
  content: string;
};

export default function VmTerminalApp() {
  const { publish, subscribe } = useAppAether();
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>(() => [
    { type: 'response', content: 'AetherOS Natural Language & VM Shell [Version 1.0.0]' },
    { type: 'response', content: 'Use natural language, or type `help` for a list of VM commands.' },
    { type: 'response', content: `Example: run ${HELLO_WORLD_WASM_BASE64.substring(0, 40)}...` },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const endOfHistoryRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeInstances, setActiveInstances] = useState<Record<string, boolean>>({});

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
    const topics = [
      "agent.taskgraph.created", "agent.taskgraph.started",
      "agent.taskgraph.completed", "agent.taskgraph.failed",
      "agent.tasknode.started", "agent.tasknode.completed", "agent.tasknode.failed",
      "vm:started", "vm:stdout", "vm:stderr", "vm:exited", "vm:killed", "vm:crashed", "vm:create:error", "vm:kill:error", "vm:stdin:error"
    ];

    const handleEvent = (payload: any, envelope: any) => {
        let message = '';
        let type: HistoryItem['type'] = 'system';
        switch(envelope.topic) {
            case 'agent.taskgraph.created':
                message = `[Agent] Task graph created. Starting execution...`;
                type = 'agent';
                break;
            case 'agent.taskgraph.completed':
                message = `[Agent] Task completed successfully.`;
                setIsLoading(false);
                type = 'agent';
                break;
            case 'agent.taskgraph.failed':
                message = `[Agent] Task failed: ${payload.error}`;
                setIsLoading(false);
                type = 'agent';
                break;
            case 'agent.tasknode.started':
                message = `[Node: ${payload.nodeId}] Running...`;
                type = 'agent';
                break;
            case 'agent.tasknode.completed':
                message = `[Node: ${payload.nodeId}] Completed.`;
                type = 'agent';
                break;
            case 'agent.tasknode.failed':
                message = `[Node: ${payload.nodeId}] Failed: ${payload.error}`;
                type = 'agent';
                break;
            case 'vm:started':
                message = `[VM] Instance started with ID: ${payload.instanceId}`;
                setActiveInstances(prev => ({...prev, [payload.instanceId]: true}));
                break;
            case 'vm:stdout':
                message = payload.data;
                type = 'stdout';
                break;
            case 'vm:stderr':
                message = `[stderr] ${payload.data}`;
                type = 'stderr';
                break;
            case 'vm:exited':
                message = `[VM] Instance ${payload.instanceId} exited.`;
                setActiveInstances(prev => {
                    const newState = {...prev};
                    delete newState[payload.instanceId];
                    return newState;
                });
                break;
            case 'vm:killed':
                 message = `[VM] Instance ${payload.instanceId} killed.`;
                setActiveInstances(prev => {
                    const newState = {...prev};
                    delete newState[payload.instanceId];
                    return newState;
                });
                 break;
            case 'vm:crashed':
            case 'vm:create:error':
            case 'vm:kill:error':
            case 'vm:stdin:error':
                message = `[VM] Error: ${payload.error}`;
                type = 'error';
                break;
        }
        if (message) {
            setHistory(prev => [...prev, { type, content: message }]);
        }
    };

    const subscriptions = topics.map(topic => subscribe(topic, handleEvent));

    return () => {
        subscriptions.forEach(unsubscribe => unsubscribe());
    };
  }, [subscribe]);

  const handleCommand = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const command = input.trim();
    if (!command) return;

    setHistory(prev => [...prev, { type: 'command', content: `${prompt} ${command}` }]);
    setInput('');
    
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);

    switch(cmd) {
        case 'help':
            setHistory(prev => [...prev, 
                { type: 'response', content: 'Available VM Commands:'},
                { type: 'response', content: '  run <base64_wasm> - Runs a WASM binary.'},
                { type: 'response', content: '  stdin <instanceId> <data> - Sends data to a running VM.'},
                { type: 'response', content: '  kill <instanceId> - Stops a running VM.'},
                { type: 'response', content: '  ps - Lists running VM instances.'},
                { type: 'response', content: 'Any other input is treated as a natural language prompt for the AI Agent.'},
            ]);
            break;
        case 'ps':
            const instanceIds = Object.keys(activeInstances);
            if (instanceIds.length === 0) {
                 setHistory(prev => [...prev, { type: 'response', content: 'No active VM instances.'}]);
            } else {
                 setHistory(prev => [...prev, { type: 'response', content: 'Active VM Instances:'}, ...instanceIds.map(id => ({ type: 'response', content: `  - ${id}` } as HistoryItem))]);
            }
            break;
        case 'run':
            if (args.length < 1) {
                setHistory(prev => [...prev, { type: 'error', content: 'Usage: run <base64_wasm>'}]);
            } else {
                publish('vm:create', { wasmBase64: args[0] });
            }
            break;
        case 'stdin':
            if (args.length < 2) {
                setHistory(prev => [...prev, { type: 'error', content: 'Usage: stdin <instanceId> <data>'}]);
            } else {
                publish('vm:stdin', { instanceId: args[0], data: args.slice(1).join(' ') + '\n' });
            }
            break;
        case 'kill':
            if (args.length < 1) {
                setHistory(prev => [...prev, { type: 'error', content: 'Usage: kill <instanceId>'}]);
            } else {
                publish('vm:kill', { instanceId: args[0] });
            }
            break;
        default:
            setIsLoading(true);
            publish('ai:agent', { prompt: command });
            break;
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
            'text-yellow-400': item.type === 'agent',
            'text-red-400': item.type === 'stderr' || item.type === 'error',
            'text-gray-300': item.type === 'stdout'
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
