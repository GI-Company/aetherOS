
"use client";

import React from 'react';
import { Button } from '../Button';
import { FolderPlus, FolderOpen } from 'lucide-react';
import { useAether } from '../../lib/aether_sdk';

interface WelcomeScreenProps {
    onSelectProject: (path: string) => void;
}

export default function WelcomeScreen({ onSelectProject }: WelcomeScreenProps) {
    const aether = useAether();

    const handleCreateProject = () => {
        if (!aether) return;
        const projectName = window.prompt("Enter new project name:");
        if (projectName) {
            const path = `/home/user/${projectName}`;
            // Publish an event to create the folder
            aether.publish('vfs:create:folder', { path: '/home/user', name: projectName });
            onSelectProject(path);
        }
    };
    
    const handleOpenProject = () => {
        // This is a placeholder. A real implementation might open the File Explorer
        // in a specific "project selection" mode.
        alert("Opening projects from the File Explorer will be supported soon. For now, double-click a folder in the File Explorer to open it as a project.");
    }

    return (
        <div className="h-full w-full flex items-center justify-center p-8 bg-gray-900">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
                <h2 className="text-3xl font-bold text-center mb-2 text-white">Code Editor</h2>
                <p className="text-center text-gray-400 mb-6">Create a new project or open an existing one.</p>
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
        </div>
    );
}
