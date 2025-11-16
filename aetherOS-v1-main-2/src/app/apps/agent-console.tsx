
'use client';

import { Bot, GitCommitHorizontal, History, List, Terminal, ChevronRight } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useAether } from '@/lib/aether_sdk_client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TaskGraphEvent {
    topic: string;
    payload: any;
    meta: {
        timestamp: string;
    };
}

export default function AgentConsoleApp() {
    const aether = useAether();
    const [events, setEvents] = useState<TaskGraphEvent[]>([]);
    const [selectedTask, setSelectedTask] = useState<string | null>(null);

    useEffect(() => {
        if (!aether) return;

        const topics = [
            "agent.taskgraph.created",
            "agent.taskgraph.started",
g            "agent.taskgraph.completed",
            "agent.taskgraph.canceled",
            "agent.tasknode.started",
            "agent.tasknode.completed",
            "agent.tasknode.failed",
            "agent.tasknode.logs",
        ];

        const handleEvent = (payload: any, envelope: any) => {
             setEvents(prev => [...prev, {
                topic: envelope.topic,
                payload: payload,
                meta: { timestamp: new Date().toISOString() }
            }]);
        };
        
        const subscriptions = topics.map(topic => aether.subscribe(topic, handleEvent));

        return () => {
            subscriptions.forEach(unsubscribe => unsubscribe());
        };

    }, [aether]);

    const renderStatusBadge = (status: string) => {
        const color = {
            'pending': 'bg-gray-500',
            'running': 'bg-blue-500',
            'completed': 'bg-green-500',
            'failed': 'bg-red-500'
        }[status] || 'bg-gray-400';
        return <Badge className={cn(color, "text-white")}>{status}</Badge>;
    }


  return (
    <div className="h-full bg-background flex flex-row text-foreground">
        <div className="w-[280px] border-r flex flex-col">
             <div className="p-3 border-b flex-shrink-0 flex items-center gap-2">
                <History className="h-5 w-5" />
                <h3 className="font-headline text-lg">Task History</h3>
            </div>
            <ScrollArea className="flex-grow">
                {/* This will eventually be a list of tasks */}
                <div className="p-4 text-center text-sm text-muted-foreground">
                    No tasks run yet.
                </div>
            </ScrollArea>
        </div>

        <div className="flex-grow flex flex-col">
            <div className="p-3 border-b flex-shrink-0 flex items-center gap-2">
                <Bot className="h-5 w-5 text-accent" />
                <h3 className="font-headline text-lg">AI Agent Console</h3>
            </div>
            
            <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                <GitCommitHorizontal className="h-16 w-16 mb-4" />
                <h4 className="text-xl font-semibold text-foreground">Task Graph Visualization</h4>
                <p>When an AI agent runs a multi-step task, its execution plan will be visualized here.</p>
                <Button variant="secondary" className="mt-4" disabled>
                    Run New Task
                </Button>
            </div>
        </div>

        <div className="w-[400px] border-l flex flex-col">
            <div className="p-3 border-b flex-shrink-0 flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <h3 className="font-headline text-lg">Logs & Details</h3>
            </div>
            <ScrollArea className="flex-grow font-mono text-xs">
                 <div className="p-4">
                    {events.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground font-sans">
                            Awaiting agent events...
                        </div>
                    ) : (
                        events.map((event, i) => (
                           <div key={i} className="flex items-start gap-2 mb-2">
                                <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <div className="flex-grow">
                                     <span className="text-muted-foreground mr-2">[{new Date(event.meta.timestamp).toLocaleTimeString()}]</span>
                                     <span className="font-bold text-accent">{event.topic}</span>
                                     <pre className="text-xs whitespace-pre-wrap mt-1 p-2 bg-muted/50 rounded-sm">
                                         {JSON.stringify(event.payload, null, 2)}
                                     </pre>
                                </div>
                           </div>
                        ))
                    )}
                 </div>
            </ScrollArea>
        </div>

    </div>
  );
}
