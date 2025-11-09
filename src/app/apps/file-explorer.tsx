
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, File, Search, Loader2, Upload, FolderPlus, ArrowUp, RefreshCw, FilePlus } from "lucide-react";
import { semanticFileSearch } from "@/ai/flows/semantic-file-search";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { getStorage, ref, listAll, getMetadata, uploadBytes, uploadString } from 'firebase/storage';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { osEvent } from "@/lib/events";
import { FileItem } from "@/lib/types";
import { APPS } from "@/lib/apps";

const useStorageFiles = (currentPath: string) => {
    const { user } = useFirebase();
    const [allFiles, setAllFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        if (!user || !currentPath) return;
        setIsLoading(true);
        setError(null);
        try {
            const storage = getStorage();
            const listRef = ref(storage, currentPath);
            const res = await listAll(listRef);

            const fetchedFiles: FileItem[] = [];

            for (const prefix of res.prefixes) {
                fetchedFiles.push({
                    name: prefix.name,
                    type: 'folder',
                    path: prefix.fullPath,
                    size: 0,
                    modified: new Date(), // Storage API doesn't provide folder metadata
                });
            }

            for (const itemRef of res.items) {
                 if (itemRef.name.endsWith('.placeholder')) continue;
                const metadata = await getMetadata(itemRef);
                fetchedFiles.push({
                    name: metadata.name,
                    type: 'file',
                    path: metadata.fullPath,
                    size: metadata.size,
                    modified: new Date(metadata.updated),
                });
            }
            
            const sortedFiles = fetchedFiles.sort((a, b) => {
                if (a.type === 'folder' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
            });

            setAllFiles(sortedFiles);
        } catch (err: any) {
            setError(err);
            console.error("Error listing files:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user, currentPath]);

    useEffect(() => {
        refresh();
        
        // Subscribe to file system changes
        const handleFileSystemChange = () => {
            console.log("File system change detected, refreshing explorer...");
            refresh();
        };

        osEvent.on('file-system-change', handleFileSystemChange);

        return () => {
            osEvent.off('file-system-change', handleFileSystemChange);
        };
    }, [refresh]);

    return { allFiles, isLoading, error, refresh };
};


interface FileExplorerAppProps {
  onOpenFile?: (filePath: string) => void;
  searchQuery?: string;
  onOpenApp?: (app: (typeof APPS)[0], props?: Record<string, any>) => void;
}

export default function FileExplorerApp({ onOpenFile, searchQuery: initialSearchQuery, onOpenApp }: FileExplorerAppProps) {
  const { user } = useFirebase();
  const basePath = useMemo(() => user ? `users/${user.uid}` : '', [user]);
  const [currentPath, setCurrentPath] = useState(basePath);
  
  const { allFiles, isLoading, refresh } = useStorageFiles(currentPath);
  const [displayedFiles, setDisplayedFiles] = useState<FileItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [isSearching, setIsSearching] = useState(false);
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  const [isCreating, setIsCreating] = useState<'folder' | 'file' | null>(null);
  const [newName, setNewName] = useState('');


  const { toast } = useToast();
  
  useEffect(() => {
    if (basePath && !currentPath) {
      setCurrentPath(basePath);
    }
  }, [basePath, currentPath])


  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setDisplayedFiles(allFiles); // Reset to all files if search is cleared
      return;
    }
    setIsSearching(true);
    try {
      // In a deep file structure, we'd need to recursively list all files,
      // but for this prototype, we'll search the current directory.
      const allFilePaths = allFiles.map(f => f.path);
      const result = await semanticFileSearch({ query: query, availableFiles: allFilePaths });
      
      const searchResultFiles = allFiles.filter(f => result.results.some(r => r.path === f.path));
      setDisplayedFiles(searchResultFiles);
      
      toast({
          title: "Search Complete",
          description: `Found ${result.results.length} matching item(s).`
      });

    } catch (err: any) {
        console.error("Semantic search failed:", err);
        toast({ title: "Search Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsSearching(false);
    }
  }, [allFiles, toast]);


  useEffect(() => {
    // If an initial search query is passed, run the search.
    if (initialSearchQuery) {
        setSearchQuery(initialSearchQuery);
        if (allFiles.length > 0) {
            handleSearch(initialSearchQuery);
        }
    } else {
        // By default, display all files from storage.
        setDisplayedFiles(allFiles);
    }
  }, [allFiles, initialSearchQuery, handleSearch]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  }
  
  const handleDoubleClick = (file: FileItem) => {
    if (file.type === 'folder') {
        setCurrentPath(file.path);
        setSearchQuery(''); // Clear search when navigating
    } else if (file.type === 'file' && onOpenFile) {
      onOpenFile(file.path);
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !user) return;
    setIsUploading(true);
    setUploadProgress(0);
    try {
        const storage = getStorage();
        const storageRef = ref(storage, `${currentPath}/${uploadFile.name}`);
        // In a real app, you'd use `uploadBytesResumable` to get progress
        await uploadBytes(storageRef, uploadFile);
        setUploadProgress(100);
        toast({ title: "Upload Complete", description: `${uploadFile.name} has been uploaded.` });
        osEvent.emit('file-system-change', undefined);
    } catch(err: any) {
        console.error(err);
        toast({ title: "Upload Failed", description: err.message, variant: "destructive"});
    } finally {
        setIsUploading(false);
        setUploadFile(null);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName || !user || !isCreating) return;

      const trimmedName = newName.trim();
      if (!trimmedName) return;

      let fullPath: string;
      let successMessage: string;

      if (isCreating === 'folder') {
          // Create a placeholder file to represent the folder
          fullPath = `${currentPath}/${trimmedName}/.placeholder`;
          successMessage = `Folder "${trimmedName}" was created.`;
      } else { // isCreating === 'file'
          fullPath = `${currentPath}/${trimmedName}`;
          successMessage = `File "${trimmedName}" was created.`;
      }

      try {
          const storage = getStorage();
          const itemRef = ref(storage, fullPath);
          await uploadString(itemRef, '');
          toast({ title: 'Success', description: successMessage });
          setNewName('');
          setIsCreating(null);
          osEvent.emit('file-system-change', undefined);
      } catch (err: any) {
          console.error(`Error creating ${isCreating}:`, err);
          toast({ title: `Failed to create ${isCreating}`, description: err.message, variant: "destructive" });
      }
  }
  
  const goUpOneLevel = () => {
      if (currentPath === basePath) return;
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      setCurrentPath(parentPath);
      setSearchQuery(''); // Clear search when navigating
  }
  
  const cancelCreation = () => {
    setIsCreating(null);
    setNewName('');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goUpOneLevel} disabled={currentPath === basePath || isLoading}>
                <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={refresh} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
        </div>
         <form onSubmit={handleSearchSubmit} className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Semantic Search for files..." 
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching || isLoading}
            />
             {isSearching && <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin" />}
        </form>
        <div className="flex items-center gap-2">
           <Input type="file" onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)} className="text-xs" disabled={isUploading} />
           <Button onClick={handleUpload} disabled={!uploadFile || isUploading}>
               {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="h-4 w-4" />}
           </Button>
        </div>
        {!isCreating ? (
            <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsCreating('file')}>
                    <FilePlus className="h-4 w-4 mr-2" />
                    New File
                </Button>
                <Button variant="outline" onClick={() => setIsCreating('folder')}>
                    <FolderPlus className="h-4 w-4 mr-2" />
                    New Folder
                </Button>
            </div>
        ) : (
            <form onSubmit={handleCreate} className="flex items-center gap-2">
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder={`New ${isCreating} name...`} autoFocus />
                <Button type="submit">Create</Button>
                <Button variant="ghost" onClick={cancelCreation}>Cancel</Button>
            </form>
        )}
      </div>
      {isUploading && <Progress value={uploadProgress} className="w-full h-1" />}
      <ScrollArea className="flex-grow">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="w-[120px]">Size</TableHead>
              <TableHead className="w-[180px]">Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
                <TableRow>
                    <TableCell colSpan={3} className="text-center p-8">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                    </TableCell>
                </TableRow>
            ) : displayedFiles.length > 0 ? (
                 displayedFiles.map((file) => (
                    <TableRow key={file.path} onDoubleClick={() => handleDoubleClick(file)} className="cursor-pointer">
                        <TableCell className="font-medium flex items-center gap-2">
                        {file.type === 'folder' ? <Folder className="h-4 w-4 text-accent" /> : <File className="h-4 w-4 text-muted-foreground" />}
                        {file.name}
                        </TableCell>
                        <TableCell>{file.type === 'file' ? formatBytes(file.size) : '--'}</TableCell>
                        <TableCell>{format(file.modified, "PPp")}</TableCell>
                    </TableRow>
                ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={3} className="text-center p-8 text-muted-foreground">
                        {searchQuery ? 'No items matched your search.' : 'This folder is empty.'}
                    </TableCell>
                 </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="p-2 border-t text-xs text-muted-foreground">
        {isLoading ? 'Loading...' : `${allFiles.length} items`} | Path: {currentPath.replace(basePath, '~')}
      </div>
    </div>
  );
}

    

    