
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderPlus, FolderOpen } from 'lucide-react';
import { useAether } from '@/lib/aether_sdk_client';
import { useUser } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { osEvent } from '@/lib/events';

interface WelcomeScreenProps {
    onSelectProject: (path: string) => void;
}

export default function WelcomeScreen({ onSelectProject }: WelcomeScreenProps) {
    const aether = useAether();
    const { user } = useUser();
    const { toast } = useToast();

    const handleCreateProject = () => {
        if (!aether || !user) return;
        const projectName = window.prompt("Enter new project name:");
        if (projectName) {
            const path = `users/${user.uid}/${projectName}`;
            aether.publish('vfs:create:folder', { path: `users/${user.uid}`, name: projectName });
            onSelectProject(path);
            toast({title: "Project Created", description: `Switched to new project: ${projectName}`})
        }
    };
    
    const handleOpenProject = () => {
        toast({
            title: "Action Not Implemented",
            description: "Double-click a folder in the File Explorer to open it as a project.",
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
