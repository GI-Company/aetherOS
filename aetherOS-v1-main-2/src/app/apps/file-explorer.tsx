
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, File, Search, Loader2, RefreshCw, FilePlus, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileItem } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Dropzone from "@/components/aether-os/dropzone";
import FileRow from "@/components/aether-os/file-row";
import Breadcrumbs from "@/components/aether-os/breadcrumbs";
import { useAether } from "@/lib/aether_sdk_client";
import { useUser } from "@/firebase";


interface FileExplorerAppProps {
  onOpenFile?: (filePath: string, content?: string) => void;
  searchQuery?: string;
}


const NewItemRow = ({
  type,
  onCancel,
  onCreate,
}: {
  type: 'file' | 'folder';
  onCancel: () => void;
  onCreate: (name: string) => void;
}) => {
  const [name, setName] = useState(type === 'file' ? '.tsx' : '');
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (type === 'file' && name.trim() === '.')) return;
    setIsCreating(true);
    onCreate(name.trim());
  };
  
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (type === 'file') {
      const dotIndex = e.target.value.lastIndexOf('.');
      if (dotIndex > 0) { // check > 0 to not select if it's the first char
        e.target.setSelectionRange(0, dotIndex);
      } else {
        e.target.select();
      }
    }
  }

  return (
    <TableRow className="bg-muted/50">
      <TableCell colSpan={4} className="p-2">
        <form onSubmit={handleCreate} className="flex items-center gap-2">
          {type === 'folder' ? (
            <Folder className="h-5 w-5 text-accent flex-shrink-0 ml-1" />
          ) : (
            <File className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-1" />
          )}
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={handleInputFocus}
            onKeyDown={(e) => e.key === 'Escape' && onCancel()}
            placeholder={`Enter ${type} name...`}
            className="h-8"
            disabled={isCreating}
          />
          <Button type="submit" size="sm" className="h-8" disabled={isCreating || !name.trim()}>
            {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onCancel} disabled={isCreating}>
            Cancel
          </Button>
        </form>
      </TableCell>
    </TableRow>
  );
};

export default function FileExplorerApp({ onOpenFile, searchQuery: initialSearchQuery }: FileExplorerAppProps) {
  const { user } = useUser();
  const aether = useAether();
  const basePath = useMemo(() => user ? `users/${user.uid}` : '', [user]);
  const [currentPath, setCurrentPath] = useState(basePath);
  
  const [allFiles, setAllFiles] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  
  const [displayedFiles, setDisplayedFiles] = useState<FileItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const [creatingItemType, setCreatingItemType] = useState<'folder' | 'file' | null>(null);

  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    if (basePath && !currentPath) {
      setCurrentPath(basePath);
    }
  }, [basePath, currentPath])

  const refresh = useCallback(() => {
    if (!aether || !currentPath) return;
    setIsLoading(true);
    aether.publish('vfs:list', { path: currentPath });
  }, [aether, currentPath]);


  useEffect(() => {
    if (!searchQuery) {
        setDisplayedFiles(allFiles);
    }
  }, [allFiles, searchQuery]);
  
  useEffect(() => {
    if (!aether) return;

    const handleFileList = (payload: any) => {
        const { path, files: receivedFiles } = payload;
        if (path === currentPath) {
            setAllFiles(receivedFiles.map((f: any) => ({...f, modTime: new Date(f.modTime)})) || []);
            setIsLoading(false);
        }
    };
    
    const handleMutationResult = () => {
        setIsDeleting(false);
        setItemToDelete(null);
        setCreatingItemType(null);
        refresh();
    };

    const subs = [
      aether.subscribe('vfs:list:result', handleFileList),
      aether.subscribe('vfs:delete:result', handleMutationResult),
      aether.subscribe('vfs:create:file:result', handleMutationResult),
      aether.subscribe('vfs:create:folder:result', handleMutationResult),
    ];
    
    refresh();

    return () => {
      subs.forEach(sub => sub && sub());
    };
  }, [aether, currentPath, refresh]);


  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query || !aether) {
      setDisplayedFiles(allFiles);
      return;
    }
    setIsSearching(true);
    setCreatingItemType(null);
    
    aether.publish('ai:search:files', { query, availableFiles: allFiles.map(f => f.path) });
    
    const handleResponse = (payload: any) => {
        const results = payload.results || [];
        
        const searchResultItems = results.map((result: any) => {
          const foundFile = allFiles.find(f => f.path === result.path);
          return foundFile || { name: result.path.split('/').pop()!, type: result.type, path: result.path, size: 0, modTime: new Date() };
        }) as FileItem[];

        setDisplayedFiles(searchResultItems);

        toast({
            title: "Search Complete",
            description: `Found ${searchResultItems.length} matching item(s).`
        });
        setIsSearching(false);
        if (resSub) resSub();
        if (errSub) errSub();
    };

    const handleError = (payload: any) => {
        toast({ title: "Search Failed", description: payload.error, variant: "destructive" });
        setIsSearching(false);
        if (resSub) resSub();
        if (errSub) errSub();
    };

    const resSub = aether.subscribe('ai:search:files:resp', handleResponse);
    const errSub = aether.subscribe('ai:search:files:error', handleError);

  }, [allFiles, toast, aether]);


  useEffect(() => {
     if (initialSearchQuery) {
        handleSearch(initialSearchQuery);
     }
  }, [initialSearchQuery, handleSearch]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  }
  
  const handleDoubleClick = (file: FileItem) => {
    if (file.type === 'folder') {
        navigateToPath(file.path);
    } else if (file.type === 'file' && onOpenFile) {
      onOpenFile(file.path);
    }
  }
  
  const navigateToPath = (path: string) => {
    setCurrentPath(path);
    setSearchQuery('');
    setCreatingItemType(null);
  }

  const handleUpload = async (files: File[]) => {
    if (!files || files.length === 0 || !user || !aether) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    const file = files[0];
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64Content = reader.result?.toString().split(',')[1];
      if (base64Content) {
        aether.publish('vfs:write', { path: `${currentPath}/${file.name}`, content: base64Content, encoding: 'base64' });

        const sub = aether.subscribe('vfs:write:result', () => {
          toast({ title: "Upload Complete", description: `${file.name} has been uploaded.` });
          setIsUploading(false);
          refresh();
          if (sub) sub();
        });
      }
    };
    reader.onerror = () => {
       toast({ title: "Upload Failed", description: "Could not read file for upload.", variant: "destructive"});
       setIsUploading(false);
    }
  }

  const handleCreate = async (name: string) => {
      if (!name || !user || !creatingItemType || !aether) return;
      const topic = `vfs:create:${creatingItemType}`;
      aether.publish(topic, {path: currentPath, name});
      setCreatingItemType(null);
  }

  const confirmDelete = () => {
    if (!itemToDelete || !aether) return;
    setIsDeleting(true);
    aether.publish('vfs:delete', { path: itemToDelete.path });
  };
  
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };


  return (
    <>
    <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the {itemToDelete?.type} "{itemToDelete?.name}" and all of its contents.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    <div className="flex flex-col h-full relative"
         onDrop={handleDrop}
         onDragOver={handleDragOver}
         onDragEnter={handleDragEnter}
         onDragLeave={handleDragLeave}
    >
      <Dropzone visible={isDragOver} />
      <div className="p-2 border-b flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => { refresh(); setSearchQuery(''); }} disabled={isLoading}>
            <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
        <div className="flex-grow overflow-hidden min-w-0">
             <Breadcrumbs currentPath={searchQuery ? 'Search Results' : currentPath} basePath={basePath} onNavigate={navigateToPath} />
        </div>
        <div className="flex items-center gap-2">
            <form onSubmit={handleSearchSubmit} className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                placeholder="Semantic search..." 
                className="pl-9 h-9 bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={isSearching || isLoading}
                />
                {isSearching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin" />}
            </form>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!!creatingItemType || !!searchQuery}>
                        New
                        <ChevronDown className="h-4 w-4 ml-2"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setCreatingItemType('file')}>
                        <FilePlus className="h-4 w-4 mr-2" />
                        New File
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setCreatingItemType('folder')}>
                        <Folder className="h-4 w-4 mr-2" />
                        New Folder
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      {isUploading && <Progress value={uploadProgress} className="w-full h-1" />}
      <ScrollArea className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[120px]">Size</TableHead>
              <TableHead className="w-[200px] hidden md:table-cell">Last Modified</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && displayedFiles.length === 0 ? (
                <TableRow>
                    <TableCell colSpan={4} className="text-center p-8">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            ) : (
                <>
                    {creatingItemType && (
                        <NewItemRow
                            type={creatingItemType}
                            onCancel={() => setCreatingItemType(null)}
                            onCreate={handleCreate}
                        />
                    )}
                    {displayedFiles.length > 0 ? (
                        displayedFiles.map((file) => (
                            <FileRow key={file.path} file={file} onDoubleClick={handleDoubleClick} onDelete={setItemToDelete} />
                        ))
                    ) : (
                         !creatingItemType && (
                             <TableRow>
                                <TableCell colSpan={4} className="text-center p-8 text-muted-foreground">
                                    {searchQuery ? 'No items matched your search.' : 'This folder is empty.'}
                                </TableCell>
                             </TableRow>
                         )
                    )}
                </>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="p-2 border-t text-xs text-muted-foreground">
        {isLoading ? 'Loading...' : `${allFiles.length} items`}
      </div>
    </div>
    </>
  );
}
