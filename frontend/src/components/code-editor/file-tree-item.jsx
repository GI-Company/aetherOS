
"use client";

import React, { useState } from 'react';
import { Folder, File, ChevronRight, FolderOpen, MoreVertical, FilePlus, FolderPlus, Trash2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../DropdownMenu';
import { Button } from '../Button';
import { Input } from '../Input';

export interface FileSystemItem {
    name: string;
    path: string;
    type: 'folder' | 'file';
    children?: FileSystemItem[];
}

interface FileTreeItemProps {
    item: FileSystemItem;
    onFileSelect: (filePath: string) => void;
    onCreate: (type: 'file' | 'folder', path: string, name: string) => void;
    onDelete: (item: FileSystemItem) => void;
    level?: number;
}

const NewItemInput = ({ type, path, onCreate, onCancel }: { type: 'file' | 'folder', path: string, onCreate: (type: 'file' | 'folder', path: string, name: string) => void, onCancel: () => void }) => {
    const [name, setName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (name) {
            onCreate(type, path, name);
        }
        onCancel();
    };

    return (
        <form onSubmit={handleSubmit} className="flex items-center gap-1 my-1">
            {type === 'file' ? <File className="h-4 w-4" /> : <Folder className="h-4 w-4" />}
            <Input 
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={onCancel}
                onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                className="h-6 text-sm bg-gray-900 border-gray-600"
                onClick={(e) => e.stopPropagation()}
            />
        </form>
    );
};

export default function FileTreeItem({ item, onFileSelect, onCreate, onDelete, level = 0 }: FileTreeItemProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);

    const isFolder = item.type === 'folder';

    const handleSelect = () => {
        if (isFolder) {
            setIsOpen(!isOpen);
        } else {
            onFileSelect(item.path);
        }
    };
    
    const handleCreate = (type: 'file' | 'folder', path: string, name: string) => {
        onCreate(type, path, name);
        setIsCreating(null);
    }
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        onDelete(item);
    }

    return (
        <div>
            <div
                className="flex items-center justify-between rounded hover:bg-gray-700 p-1 cursor-pointer group"
                style={{ paddingLeft: `${level * 16 + 4}px` }}
                onClick={handleSelect}
            >
                <div className="flex items-center gap-2 truncate">
                    {isFolder ? (
                        <>
                            <ChevronRight className={cn("h-4 w-4 transition-transform", isOpen && "rotate-90")} />
                            {isOpen ? <FolderOpen className="h-4 w-4 text-blue-400" /> : <Folder className="h-4 w-4 text-blue-400" />}
                        </>
                    ) : (
                        <File className="h-4 w-4 ml-4 text-gray-400" />
                    )}
                    <span className="truncate">{item.name}</span>
                </div>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button 
                            variant="ghost" size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                         >
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
                        {isFolder && (
                            <>
                                <DropdownMenuItem onSelect={() => { setIsOpen(true); setIsCreating('file')}}>
                                    <FilePlus className="mr-2 h-4 w-4" /> New File
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => { setIsOpen(true); setIsCreating('folder')}}>
                                    <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                                </DropdownMenuItem>
                            </>
                        )}
                        <DropdownMenuItem onSelect={handleDelete} className="text-red-400">
                             <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {isOpen && isFolder && (
                <div style={{ paddingLeft: `${(level + 1) * 16}px` }}>
                    {isCreating && (
                        <NewItemInput 
                            type={isCreating} 
                            path={item.path}
                            onCreate={handleCreate}
                            onCancel={() => setIsCreating(null)}
                        />
                    )}
                    {item.children?.map(child => (
                        <FileTreeItem
                            key={child.path}
                            item={child}
                            level={level + 1}
                            onFileSelect={onFileSelect}
                            onCreate={onCreate}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
