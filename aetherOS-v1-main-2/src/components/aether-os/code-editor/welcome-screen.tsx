
"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderPlus, FolderOpen } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useAether } from '@/lib/aether_sdk_client';

interface WelcomeScreenProps {
    onSelectProject: (path: string) => void;
}

export default function WelcomeScreen({ onSelectProject }: WelcomeScreenProps) {
    const { user } = useFirebase();
    const { toast } = useToast();
    const aether = useAether();

    const handleCreateProject = () => {
        if (!user || !aether) return;
        const projectName = window.prompt("Enter new project name:");
        if (projectName) {
            const path = `users/${user.uid}/${projectName}`;
            
            let sub: (()=>void) | undefined;
            const handleResult = () => {
                toast({title: "Project Created", description: `Switched to new project: ${projectName}`})
                onSelectProject(path);
                if(sub) sub();
            }
            sub = aether.subscribe('vfs:create:folder:result', handleResult);
            
            aether.publish('vfs:create:folder', { path: `users/${user.uid}`, name: projectName });
        }
    };
    
    const handleOpenProject = () => {
        toast({
            title: "Action Not Implemented",
            description: "Opening projects from the File Explorer will be supported soon. For now, double-click a folder in the File Explorer to open it as a project.",
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
