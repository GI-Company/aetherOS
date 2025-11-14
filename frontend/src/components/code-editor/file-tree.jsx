
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAether } from '../../lib/aether_sdk';
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "../Button";
import FileTreeItem, { FileSystemItem } from "./file-tree-item";
import { cn } from "../../lib/utils";

interface FileTreeProps {
    basePath: string;
    onFileSelect: (filePath: string) => void;
}

const buildFileTree = (files: any[], basePath: string): FileSystemItem[] => {
    const rootItems: FileSystemItem[] = [];
    const allNodes: { [key: string]: FileSystemItem } = {};

    // First pass: create all nodes
    files.forEach(file => {
        const node: FileSystemItem = {
            name: file.name,
            path: file.path,
            type: file.isDir ? 'folder' : 'file',
            children: file.isDir ? [] : undefined,
        };
        allNodes[file.path] = node;
    });

    // Second pass: build the tree
    files.forEach(file => {
        const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
        if (parentPath && allNodes[parentPath]) {
            // It's a child of another folder in the list
            allNodes[parentPath].children?.push(allNodes[file.path]);
        } else if (parentPath === basePath || (basePath === '/' && parentPath === '')) {
            // It's a root item
             rootItems.push(allNodes[file.path]);
        }
    });

    // This simplified logic doesn't handle deep nesting from a flat list well.
    // A better approach would be to recursively fetch or get all paths from backend.
    // For now, we just show the direct children.
    const directChildren = files
      .filter(f => f.path.substring(0, f.path.lastIndexOf('/')) === basePath || (basePath ==='/' && !f.path.substring(1).includes('/')))
      .map(file => ({
        name: file.name,
        path: file.path,
        type: file.isDir ? 'folder' : 'file',
        children: file.isDir ? [] : undefined // Placeholder for potential children
      }));


    const sortChildren = (nodes: FileSystemItem[]) => {
        nodes.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
    };

    sortChildren(directChildren);
    return directChildren;
};


export default function FileTree({ basePath, onFileSelect }: FileTreeProps) {
    const aether = useAether();
    const [tree, setTree] = useState<FileSystemItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFiles = useCallback(async () => {
        if (!aether) return;
        setIsLoading(true);
        console.log(`FileTree: Requesting files for ${basePath}`);
        aether.publish('vfs:list', { path: basePath });

        const handleFileList = (env) => {
            if (env.payload.path === basePath) {
                console.log("FileTree: Received files", env.payload.files);
                const fileTree = buildFileTree(env.payload.files, basePath);
                setTree(fileTree);
                setIsLoading(false);
                // Unsubscribe after receiving the data for this specific request
                aether.subscribe('vfs:list:result', handleFileList)();
            }
        };

        aether.subscribe('vfs:list:result', handleFileList);

    }, [aether, basePath]);

    useEffect(() => {
        fetchFiles();
        // Add a listener for global file system changes
        const handleFileSystemChange = () => fetchFiles();
        aether?.subscribe('vfs:delete:result', handleFileSystemChange);
        aether?.subscribe('vfs:create:file:result', handleFileSystemChange);
        aether?.subscribe('vfs:create:folder:result', handleFileSystemChange);

        return () => {
            aether?.subscribe('vfs:delete:result', handleFileSystemChange)();
            aether?.subscribe('vfs:create:file:result', handleFileSystemChange)();
            aether?.subscribe('vfs:create:folder:result', handleFileSystemChange)();
        };
    }, [fetchFiles, aether]);


    const handleCreate = async (type: 'file' | 'folder', path: string, name: string) => {
        if (!aether || !name) return;
        
        const topic = `vfs:create:${type}`;
        aether.publish(topic, {path, name});
    };
    
    const handleDelete = async (item: FileSystemItem) => {
       if (!aether) return;
       const confirm = window.confirm(`Are you sure you want to delete ${item.name}?`);
       if (confirm) {
           aether.publish('vfs:delete', { path: item.path });
       }
    };


    return (
        <div className="flex-grow flex flex-col min-h-0 text-white">
             <div className="p-2 border-b border-gray-700 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={fetchFiles} disabled={isLoading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>
            <div className="flex-grow overflow-y-auto">
                <div className="p-2 text-sm">
                    {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : (
                        tree.map(item => (
                            <FileTreeItem 
                                key={item.path} 
                                item={item}
                                onFileSelect={onFileSelect}
                                onCreate={handleCreate}
                                onDelete={handleDelete}
                             />
                        ))
                    )}
                     { !isLoading && tree.length === 0 &&
                        <p className="text-gray-500 text-center p-4">Project is empty.</p>
                     }
                </div>
            </div>
        </div>
    );
}
