
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderPlus, FolderOpen, History } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { osEvent } from '@/lib/events';
import { useToast } from '@/hooks/use-toast';

interface WelcomeScreenProps {
    onSelectProject: (path: string) => void;
}

export default function WelcomeScreen({ onSelectProject }: WelcomeScreenProps) {
    const { user } = useFirebase();
    const { toast } = useToast();

    const handleCreateProject = () => {
        if (!user) return;
        const projectName = window.prompt("Enter new project name:");
        if (projectName) {
            const path = `users/${user.uid}/${projectName}`;
            onSelectProject(path);
            // We can emit an event to create the placeholder if needed,
            // or let the file tree handle it on first load.
            toast({title: "Project Created", description: `Switched to new project: ${projectName}`})
            osEvent.emit('file-system-change');
        }
    };
    
    const handleOpenProject = () => {
        // This is a placeholder. A real implementation might open the File Explorer
        // in a specific "project selection" mode.
        toast({
            title: "Action Not Implemented",
            description: "Opening projects from the File Explorer will be supported soon.",
            variant: "default"
        });
    }

    // In a real app, this would be fetched from user preferences
    const recentProjects = [
        `users/${user?.uid}/aether-os-clone`,
        `users/${user?.uid}/my-next-app`,
    ];

    return (
        <div className="h-full w-full flex items-center justify-center p-8 bg-background">
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left side: Actions */}
                <div className="space-y-6">
                    <h1 className="text-4xl font-headline">Code Editor</h1>
                     <div className="space-y-4">
                        <Button className="w-full justify-start h-14 text-base" onClick={handleCreateProject}>
                            <FolderPlus className="mr-4 h-6 w-6" />
                            New Project...
                        </Button>
                        <Button variant="secondary" className="w-full justify-start h-14 text-base" onClick={handleOpenProject}>
                            <FolderOpen className="mr-4 h-6 w-6" />
                            Open Project...
                        </Button>
                    </div>
                </div>
                
                {/* Right side: Recent Projects */}
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5"/>
                            Recent Projects
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {recentProjects.map(path => (
                                <button 
                                    key={path}
                                    onClick={() => onSelectProject(path)}
                                    className="w-full text-left p-3 rounded-md hover:bg-muted"
                                >
                                    <p className="font-medium truncate">{path.split('/').pop()}</p>
                                    <p className="text-sm text-muted-foreground truncate">{path}</p>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

    