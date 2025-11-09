
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, File, Search, Loader2, Upload, FolderPlus, ArrowUp } from "lucide-react";
import { semanticFileSearch } from "@/ai/flows/semantic-file-search";
import { useToast } from "@/hooks/use-toast";
import { useFirebase } from "@/firebase";
import { getStorage, ref, listAll, getMetadata, uploadBytes, uploadString } from 'firebase/storage';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";

type FileItem = {
  name: string;
  type: "folder" | "file";
  size: number;
  modified: Date;
  path: string;
};

const useStorageFiles = (currentPath: string) => {
    const { user } = useFirebase();
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        if (!user) return;
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
                const metadata = await getMetadata(itemRef);
                fetchedFiles.push({
                    name: metadata.name,
                    type: 'file',
                    path: metadata.fullPath,
                    size: metadata.size,
                    modified: new Date(metadata.updated),
                });
            }

            setFiles(fetchedFiles.sort((a, b) => a.name.localeCompare(b.name)));
        } catch (err: any) {
            setError(err);
            console.error("Error listing files:", err);
        } finally {
            setIsLoading(false);
        }
    }, [user, currentPath]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return { files, setFiles, isLoading, error, refresh };
};


interface FileExplorerAppProps {
  onOpenFile?: (filePath: string) => void;
}

export default function FileExplorerApp({ onOpenFile }: FileExplorerAppProps) {
  const { user } = useFirebase();
  const basePath = useMemo(() => user ? `users/${user.uid}` : '', [user]);
  const [currentPath, setCurrentPath] = useState(basePath);
  
  const { files, setFiles, isLoading, refresh } = useStorageFiles(currentPath);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [uploadFile, setUploadFile] = useState<globalThis.File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { toast } = useToast();
  
  useEffect(() => {
      setCurrentPath(basePath);
  }, [basePath])
  

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery) {
      refresh();
      return;
    }
    // This is a mock search for now
    toast({ title: "Semantic Search", description: "This feature is coming soon!" });
  };
  
  const handleDoubleClick = (file: FileItem) => {
    if (file.type === 'folder') {
        setCurrentPath(file.path);
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
        refresh();
    } catch(err: any) {
        console.error(err);
        toast({ title: "Upload Failed", description: err.message, variant: "destructive"});
    } finally {
        setIsUploading(false);
        setUploadFile(null);
    }
  }

  const handleCreateFolder = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newFolderName || !user) return;

      const folderName = newFolderName.trim();
      if (!folderName) return;

      try {
          const storage = getStorage();
          // Create a placeholder file to represent the folder
          const folderRef = ref(storage, `${currentPath}/${folderName}/.placeholder`);
          await uploadString(folderRef, '');
          toast({ title: 'Folder Created', description: `Folder "${folderName}" was created.` });
          setNewFolderName('');
          setIsCreatingFolder(false);
          refresh();
      } catch (err: any) {
          console.error("Error creating folder:", err);
          toast({ title: "Folder Creation Failed", description: err.message, variant: "destructive" });
      }
  }
  
  const goUpOneLevel = () => {
      if (currentPath === basePath) return;
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      setCurrentPath(parentPath);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="icon" onClick={goUpOneLevel} disabled={currentPath === basePath}>
            <ArrowUp className="h-4 w-4" />
        </Button>
         <form onSubmit={handleSearch} className="relative flex-grow">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Semantic Search..." 
              className="pl-9 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isSearching}
            />
        </form>
        <div className="flex items-center gap-2">
           <Input type="file" onChange={e => setUploadFile(e.target.files ? e.target.files[0] : null)} className="text-xs" disabled={isUploading} />
           <Button onClick={handleUpload} disabled={!uploadFile || isUploading}>
               {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="h-4 w-4" />}
           </Button>
        </div>
        {!isCreatingFolder ? (
             <Button variant="outline" onClick={() => setIsCreatingFolder(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                New Folder
            </Button>
        ) : (
            <form onSubmit={handleCreateFolder} className="flex items-center gap-2">
                <Input value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Folder name..." autoFocus />
                <Button type="submit">Create</Button>
                <Button variant="ghost" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
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
            ) : files.length > 0 ? (
                 files.map((file) => (
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
                        This folder is empty.
                    </TableCell>
                 </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
      <div className="p-2 border-t text-xs text-muted-foreground">
        {isLoading ? 'Loading...' : `${files.length} items`} | Path: {currentPath.replace(basePath, '~')}
      </div>
    </div>
  );
}
