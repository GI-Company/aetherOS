
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useFirebase } from "@/firebase";
import { getStorage, ref, listAll, uploadString, deleteObject } from 'firebase/storage';
import { Loader2, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { osEvent } from "@/lib/events";
import FileTreeItem, { FileSystemItem } from "./file-tree-item";

interface FileTreeProps {
    basePath: string;
    onFileSelect: (filePath: string) => void;
}

const buildFileTree = (paths: string[], basePath: string): FileSystemItem[] => {
    const root: FileSystemItem = { name: 'root', type: 'folder', path: basePath, children: [] };
    const nodeMap: { [key: string]: FileSystemItem } = { [basePath]: root };

    paths.sort().forEach(path => {
        const parts = path.substring(basePath.length).split('/').filter(p => p);
        let currentPath = basePath;
        let parentNode = root;

        parts.forEach((part, index) => {
            currentPath = `${currentPath}/${part}`;
            const isLastPart = index === parts.length - 1;
            const isFile = isLastPart && !path.endsWith('/');

            if (!nodeMap[currentPath]) {
                const newNode: FileSystemItem = {
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: currentPath,
                    children: isFile ? undefined : [],
                };
                parentNode.children?.push(newNode);
                nodeMap[currentPath] = newNode;
            }
            if (!isFile) {
                parentNode = nodeMap[currentPath];
            }
        });
    });

    const sortChildren = (node: FileSystemItem) => {
        if (node.children) {
            node.children.sort((a, b) => {
                if (a.type === 'folder' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
            });
            node.children.forEach(sortChildren);
        }
    };

    sortChildren(root);
    return root.children || [];
};

export default function FileTree({ basePath, onFileSelect }: FileTreeProps) {
    const { user } = useFirebase();
    const storage = useStorage();
    const [tree, setTree] = useState<FileSystemItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchFiles = useCallback(async () => {
        if (!user || !storage) return;
        setIsLoading(true);
        try {
            const storageRef = ref(storage, basePath);
            const allItems = await listAll(storageRef);

            const allPaths = [
                ...allItems.items.map(item => item.fullPath),
                ...allItems.prefixes.map(prefix => prefix.fullPath + '/')
            ];

            // A more robust way to get all nested files
            const nestedPrefixes = [...allItems.prefixes];
            while (nestedPrefixes.length > 0) {
                const prefix = nestedPrefixes.pop();
                if (prefix) {
                    const nestedItems = await listAll(prefix);
                    nestedItems.items.forEach(item => allPaths.push(item.fullPath));
                    nestedItems.prefixes.forEach(p => {
                        allPaths.push(p.fullPath + '/');
                        nestedPrefixes.push(p);
                    });
                }
            }

            const uniquePaths = [...new Set(allPaths)].filter(p => !p.endsWith('.placeholder'));
            const fileTree = buildFileTree(uniquePaths, basePath);
            setTree(fileTree);
        } catch (error) {
            console.error("Error fetching file tree:", error);
            toast({ title: "Error", description: "Could not load file tree.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, storage, basePath, toast]);

    useEffect(() => {
        fetchFiles();

        const handleFileSystemChange = () => fetchFiles();
        osEvent.on('file-system-change', handleFileSystemChange);

        return () => {
            osEvent.off('file-system-change', handleFileSystemChange);
        };
    }, [fetchFiles]);


    const handleCreate = async (type: 'file' | 'folder', path: string, name: string) => {
        if (!storage || !name) return;

        const fullPath = `${path}/${name}`;
        const finalPath = type === 'folder' ? `${fullPath}/.placeholder` : fullPath;
        
        try {
            const itemRef = ref(storage, finalPath);
            await uploadString(itemRef, '', 'raw');
            toast({ title: `Successfully created ${type}`, description: `Created ${name} in ${path}` });
            osEvent.emit('file-system-change');
        } catch (error: any) {
            console.error(error);
            toast({ title: `Failed to create ${type}`, description: error.message, variant: "destructive" });
        }
    };
    
    const handleDelete = async (item: FileSystemItem) => {
        if (!storage) return;

        const deleteFolderContents = async (folderPath: string) => {
            const listRef = ref(storage, folderPath);
            const res = await listAll(listRef);

            // Delete all files in the folder
            await Promise.all(res.items.map(itemRef => deleteObject(itemRef)));
            // Recursively delete all subfolders
            await Promise.all(res.prefixes.map(prefixRef => deleteFolderContents(prefixRef.fullPath)));
        };

        try {
            if (item.type === 'file') {
                const fileRef = ref(storage, item.path);
                await deleteObject(fileRef);
            } else {
                await deleteFolderContents(item.path);
            }
            toast({ title: "Item deleted", description: `${item.name} was successfully deleted.` });
            osEvent.emit('file-system-change');
        } catch (error: any) {
             console.error(error);
             toast({ title: "Deletion failed", description: error.message, variant: "destructive" });
        }
    };


    return (
        <div className="flex-grow flex flex-col min-h-0">
             <div className="p-2 border-b flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={fetchFiles} disabled={isLoading}>
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

    