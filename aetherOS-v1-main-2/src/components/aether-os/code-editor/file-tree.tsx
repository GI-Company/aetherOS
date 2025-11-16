
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAether } from '@/lib/aether_sdk_client';
import { Loader2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import FileTreeItem from "./file-tree-item";
import { cn } from "@/lib/utils";
import { osEvent } from "@/lib/events";

interface FileSystemItem {
    name: string;
    path: string;
    type: 'folder' | 'file';
    children?: FileSystemItem[];
}

interface FileTreeProps {
    basePath: string;
    onFileSelect: (filePath: string) => void;
}

const buildFileTree = (files: any[], basePath: string): FileSystemItem[] => {
    const allNodes: { [key: string]: FileSystemItem } = {};
    const rootItems: FileSystemItem[] = [];

    if (!files) return [];

    // First pass: create all nodes and map them by path
    files.forEach(file => {
        allNodes[file.path] = {
            name: file.name,
            path: file.path,
            type: file.isDir ? 'folder' : 'file',
            children: file.isDir ? [] : undefined,
        };
    });

    // Second pass: build the tree structure
    Object.values(allNodes).forEach(node => {
        // Find the parent path by slicing the string up to the last '/'
        const parentPath = node.path.substring(0, node.path.lastIndexOf('/'));

        if (parentPath === basePath || (basePath === '/' && parentPath === '')) {
            // This is a root item
             if (!rootItems.some(item => item.path === node.path)) {
                rootItems.push(node);
            }
        } else if (allNodes[parentPath] && allNodes[parentPath].children) {
            // This is a child of another folder in the list
            if (!allNodes[parentPath].children!.some(child => child.path === node.path)) {
                 allNodes[parentPath].children!.push(node);
            }
        }
    });

    const sortChildren = (nodes: FileSystemItem[]) => {
        nodes.sort((a, b) => {
            if (a.type === 'folder' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach(node => {
            if (node.children) {
                sortChildren(node.children);
            }
        });
    };
    
    sortChildren(rootItems);
    return rootItems;
};


export default function FileTree({ basePath, onFileSelect }: FileTreeProps) {
    const aether = useAether();
    const [tree, setTree] = useState<FileSystemItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchFiles = useCallback(async (path: string) => {
        if (!aether) return;
        setIsLoading(true);
        aether.publish('vfs:list', { path });
    }, [aether]);

    useEffect(() => {
        if (!aether || !basePath) return;

        let listSub: (() => void) | undefined;

        const handleFileList = (payload: any) => {
            if (payload.path === basePath) {
                const fileTree = buildFileTree(payload.files, basePath);
                setTree(fileTree);
                setIsLoading(false);
            }
        };
        
        listSub = aether.subscribe('vfs:list:result', handleFileList);
        
        // Listen to global file system changes
        const handleFileSystemChange = () => fetchFiles(basePath);
        osEvent.on('file-system-change', handleFileSystemChange);
        
        fetchFiles(basePath);

        return () => {
            if(listSub) listSub();
            osEvent.off('file-system-change', handleFileSystemChange);
        };

    }, [aether, basePath, fetchFiles]);


    const handleCreate = async (type: 'file' | 'folder', path: string, name: string) => {
        if (!aether || !name) return;
        
        let sub: (() => void) | undefined, errSub: (() => void) | undefined;

        const handleResult = () => {
            toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} Created`, description: name });
            osEvent.emit('file-system-change');
            if (sub) sub();
            if (errSub) errSub();
        };

        const handleError = (payload: any) => {
            toast({ title: 'Creation failed', description: payload.error, variant: 'destructive'});
            if (sub) sub();
            if (errSub) errSub();
        };
        
        const topic = `vfs:create:${type}`;
        const resultTopic = `${topic}:result`;
        const errorTopic = `${topic}:error`;
        
        sub = aether.subscribe(resultTopic, handleResult);
        errSub = aether.subscribe(errorTopic, handleError);

        aether.publish(topic, {path, name});
        toast({ title: `Creating ${type}...`, description: name });
    };
    
    const handleDelete = async (item: FileSystemItem) => {
       if (!aether) return;
       const confirm = window.confirm(`Are you sure you want to delete ${item.name}?`);
       if (confirm) {
           let sub: (() => void) | undefined, errSub: (() => void) | undefined;
           
           const handleResult = () => {
               toast({ title: 'Deleted', description: item.name });
               osEvent.emit('file-system-change');
               if (sub) sub();
               if (errSub) errSub();
           };
            const handleError = (payload: any) => {
               toast({ title: 'Delete failed', description: payload.error, variant: 'destructive'});
               if (sub) sub();
               if (errSub) errSub();
            };

           sub = aether.subscribe('vfs:delete:result', handleResult);
           errSub = aether.subscribe('vfs:delete:error', handleError);

           aether.publish('vfs:delete', { path: item.path });
           toast({ title: `Deleting...`, description: item.name });
       }
    };


    return (
        <div className="flex-grow flex flex-col min-h-0">
             <div className="p-2 border-b flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => fetchFiles(basePath)} disabled={isLoading}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                    Refresh
                </Button>
            </div>
            <ScrollArea className="flex-grow">
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
                        <p className="text-muted-foreground text-center p-4">Project is empty.</p>
                     }
                </div>
            </ScrollArea>
        </div>
    );
}
