
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

    return (
        <div className="h-full w-full flex items-center justify-center p-8 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="text-3xl font-headline">Code Editor</CardTitle>
                    <CardDescription>Create a new project or open an existing one.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button className="w-full justify-start h-14 text-base" onClick={handleCreateProject}>
                        <FolderPlus className="mr-4 h-6 w-6" />
                        New Project...
                    </Button>
                    <Button variant="secondary" className="w-full justify-start h-14 text-base" onClick={handleOpenProject}>
                        <FolderOpen className="mr-4 h-6 w-6" />
                        Open Project...
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

    