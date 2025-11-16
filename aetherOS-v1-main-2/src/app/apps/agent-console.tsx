
'use client';

import { Bot, GitCommitHorizontal, History, List, Terminal, ChevronRight, Play, Square, RefreshCcw } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { useAether } from '@/lib/aether_sdk_client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { TaskGraph, TaskGraphEvent, TaskGraphPayload, TaskNode } from '@/lib/agent-types';

interface FullTaskGraph extends TaskGraph {
    status: 'pending' | 'running' | 'completed' | 'canceled' | 'failed';
    nodesStatus: Record<string, any>;
}

export default function AgentConsoleApp() {
    const aether = useAether();
    const [events, setEvents] = useState<TaskGraphEvent[]>([]);
    const [taskGraphs, setTaskGraphs] = useState<Record<string, FullTaskGraph>>({});
    const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);

    useEffect(() => {
        if (!aether) return;

        const topics = [
            "agent.taskgraph.created",
            "agent.taskgraph.started",
            "agent.taskgraph.completed",
            "agent.taskgraph.canceled",
            "agent.tasknode.started",
            "agent.tasknode.completed",
            "agent.tasknode.failed",
            "agent.tasknode.logs",
        ];

        const handleEvent = (payload: any, envelope: any) => {
            const newEvent: TaskGraphEvent = {
                id: envelope.id,
                topic: envelope.topic,
                payload: payload,
                timestamp: envelope.createdAt,
            };

             setEvents(prev => [...prev, newEvent]);

             if (envelope.topic === 'agent.taskgraph.created') {
                const graphPayload = payload as TaskGraphPayload;
                const newGraph: FullTaskGraph = {
                    ...graphPayload.taskGraph,
                    status: 'pending',
                    nodesStatus: {},
                };
                 setTaskGraphs(prev => ({...prev, [newGraph.id]: newGraph}));
                 setSelectedGraphId(newGraph.id);
             }
        };
        
        const subscriptions = topics.map(topic => aether.subscribe(topic, handleEvent));

        return () => {
            subscriptions.forEach(unsubscribe => unsubscribe());
        };

    }, [aether]);

    const selectedGraph = selectedGraphId ? taskGraphs[selectedGraphId] : null;

    const renderStatusBadge = (status: string) => {
        const color = {
            'pending': 'bg-gray-500',
            'running': 'bg-blue-500',
            'completed': 'bg-green-500',
            'failed': 'bg-red-500',
            'canceled': 'bg-yellow-500',
        }[status] || 'bg-gray-400';
        return <Badge className={cn(color, "text-white")}>{status}</Badge>;
    }
    
    const sortedGraphs = useMemo(() => {
        return Object.values(taskGraphs).sort((a, b) => b.createdAt - a.createdAt);
    }, [taskGraphs]);


  return (
    <div className="h-full bg-background flex flex-row text-foreground">
        <div className="w-[280px] border-r flex flex-col">
             <div className="p-3 border-b flex-shrink-0 flex items-center gap-2">
                <History className="h-5 w-5" />
                <h3 className="font-headline text-lg">Task History</h3>
            </div>
            <ScrollArea className="flex-grow">
                {sortedGraphs.length > 0 ? (
                    <div className='p-2 space-y-1'>
                    {sortedGraphs.map(graph => (
                        <button key={graph.id} onClick={() => setSelectedGraphId(graph.id)}
                            className={cn("w-full text-left p-2 rounded-md", selectedGraphId === graph.id ? 'bg-muted' : 'hover:bg-muted/50')}>
                            <div className='flex justify-between items-center'>
                                <p className='font-mono text-xs truncate font-semibold'>{graph.id}</p>
                                {renderStatusBadge(graph.status)}
                            </div>
                            <p className='text-xs text-muted-foreground mt-1'>
                                {graph.nodes.length} steps - {new Date(graph.createdAt).toLocaleString()}
                            </p>
                        </button>
                    ))}
                    </div>
                ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No tasks run yet.
                    </div>
                )}
            </ScrollArea>
        </div>

        <div className="flex-grow flex flex-col">
            <div className="p-3 border-b flex-shrink-0 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-accent" />
                    <h3 className="font-headline text-lg">AI Agent Console</h3>
                </div>
                 {selectedGraph && (
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm"><Play className="h-4 w-4 mr-2" /> Execute</Button>
                        <Button variant="outline" size="sm"><Square className="h-4 w-4 mr-2" /> Cancel</Button>
                        <Button variant="outline" size="sm"><RefreshCcw className="h-4 w-4 mr-2" /> Re-run</Button>
                    </div>
                )}
            </div>
            
            {selectedGraph ? (
                <ScrollArea className="flex-grow">
                    <div className='p-4 space-y-4'>
                        {selectedGraph.nodes.map(node => (
                            <Card key={node.id}>
                                <CardHeader>
                                    <CardTitle className='flex justify-between items-center'>
                                        <div className='flex items-center gap-2'>
                                            <GitCommitHorizontal />
                                            <span>{node.id}: <span className='font-mono text-accent/80'>{node.tool}</span></span>
                                        </div>
                                         {renderStatusBadge('pending')}
                                    </CardTitle>
                                    {node.dependsOn.length > 0 && (
                                        <CardDescription>Depends on: {node.dependsOn.join(', ')}</CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent>
                                    <p className='text-sm font-medium mb-2'>Inputs:</p>
                                    <pre className="text-xs whitespace-pre-wrap p-2 bg-muted/50 rounded-sm">
                                        {JSON.stringify(node.input, null, 2)}
                                    </pre>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </ScrollArea>
            ) : (
                <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                    <List className="h-16 w-16 mb-4" />
                    <h4 className="text-xl font-semibold text-foreground">Select a Task</h4>
                    <p>Select a task from the history panel to view its execution graph and logs.</p>
                </div>
            )}
        </div>

        <div className="w-[400px] border-l flex flex-col">
            <div className="p-3 border-b flex-shrink-0 flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                <h3 className="font-headline text-lg">Event Log</h3>
            </div>
            <ScrollArea className="flex-grow font-mono text-xs">
                 <div className="p-4">
                    {events.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground font-sans">
                            Awaiting agent events...
                        </div>
                    ) : (
                        events.map((event) => (
                           <div key={event.id} className="flex items-start gap-2 mb-2">
                                <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <div className="flex-grow">
                                     <span className="text-muted-foreground mr-2">[{new Date(event.timestamp).toLocaleTimeString()}]</span>
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
