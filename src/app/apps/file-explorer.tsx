
'use client';

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, File, Search, Loader2, ArrowUp, RefreshCw, FilePlus, ChevronDown, MoreVertical, Trash2 } from "lucide-react";
import { semanticFileSearch } from "@/ai/flows/semantic-file-search";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { getStorage, ref, listAll, getMetadata, uploadString, getDownloadURL, deleteObject, uploadBytes } from 'firebase/storage';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import { formatBytes } from "@/lib/utils";
import { osEvent } from "@/lib/events";
import { FileItem } from "@/lib/types";
import { APPS } from "@/lib/apps";
import Image from "next/image";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Dropzone from "@/components/aether-os/dropzone";


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
  onOpenFile?: (filePath: string, content?: string) => void;
  searchQuery?: string;
  onOpenApp?: (app: (typeof APPS)[0], props?: Record<string, any>) => void;
}

const FileRow = ({ file, onDoubleClick, onDelete }: { file: FileItem, onDoubleClick: (file: FileItem) => void, onDelete: (file: FileItem) => void }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  const isImage = file.type === 'file' && /\.(jpg|jpeg|png|gif|webp)$/i.test(file.name);

  useEffect(() => {
    const fetchUrl = async () => {
      if (isImage) {
        setIsLoadingUrl(true);
        try {
          const storage = getStorage();
          const url = await getDownloadURL(ref(storage, file.path));
          setImageUrl(url);
        } catch (error) {
          console.error("Error fetching image URL for thumbnail:", error);
          setImageUrl(null);
        } finally {
          setIsLoadingUrl(false);
        }
      }
    };
    fetchUrl();
  }, [file.path, isImage]);
  
  const renderIcon = () => {
    if (file.type === 'folder') {
      return <Folder className="h-5 w-5 text-accent" />;
    }
    
    if (isImage) {
      return (
        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center overflow-hidden">
          {isLoadingUrl ? <Skeleton className="h-full w-full" /> : imageUrl ? (
             <Image src={imageUrl} alt={file.name} width={32} height={32} className="object-cover h-full w-full" />
          ) : <File className="h-5 w-5 text-muted-foreground" />}
        </div>
      );
    }
    
    return <File className="h-5 w-5 text-muted-foreground" />;
  }

  return (
    <TableRow onDoubleClick={() => onDoubleClick(file)} className="cursor-pointer group">
      <TableCell className="font-medium flex items-center gap-3">
        {renderIcon()}
        <span>{file.name}</span>
      </TableCell>
      <TableCell>{file.type === 'file' ? formatBytes(file.size) : '--'}</TableCell>
      <TableCell className="hidden md:table-cell">{format(file.modified, "PPp")}</TableCell>
      <TableCell className="text-right">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onDelete(file)} className="text-destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

export default function FileExplorerApp({ onOpenFile, searchQuery: initialSearchQuery, onOpenApp }: FileExplorerAppProps) {
  const { user } = useFirebase();
  const basePath = useMemo(() => user ? `users/${user.uid}` : '', [user]);
  const [currentPath, setCurrentPath] = useState(basePath);
  
  const { allFiles, isLoading, refresh } = useStorageFiles(currentPath);
  const [optimisticFiles, setOptimisticFiles] = useState<FileItem[]>([]);
  
  const displayedFiles = useMemo(() => {
    const combined = [...allFiles, ...optimisticFiles];
    const unique = Array.from(new Map(combined.map(f => [f.path, f])).values());
     return unique.sort((a, b) => {
        if (a.type === 'folder' && b.type === 'file') return -1;
        if (a.type === 'file' && b.type === 'folder') return 1;
        return a.name.localeCompare(b.name);
    });
  }, [allFiles, optimisticFiles]);
  
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [isCreating, setIsCreating] = useState<'folder' | 'file' | null>(null);
  const [newName, setNewName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  
  useEffect(() => {
    if (basePath && !currentPath) {
      setCurrentPath(basePath);
    }
  }, [basePath, currentPath])


  const handleSearch = useCallback(async (query: string) => {
    if (!query) {
      setOptimisticFiles([]); // Clear optimistic files on search
      refresh();
      return;
    }
    setIsSearching(true);
    setOptimisticFiles([]);
    try {
      const allFilePaths = allFiles.map(f => f.path);
      const result = await semanticFileSearch({ query: query, availableFiles: allFilePaths });
      
      const searchResultFiles = allFiles.filter(f => result.results.some(r => r.path === f.path));
       setOptimisticFiles(searchResultFiles.map(f => ({ ...f, path: f.path + '-search' }))); // temporary hack for display
      
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
  }, [allFiles, toast, refresh]);


  useEffect(() => {
    if (!initialSearchQuery) {
        setOptimisticFiles([]);
    }
  }, [allFiles, initialSearchQuery]);
  
  useEffect(() => {
     if (initialSearchQuery && allFiles.length > 0) {
        handleSearch(initialSearchQuery);
     }
  }, [initialSearchQuery, allFiles, handleSearch]);


  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(searchQuery);
  }
  
  const handleDoubleClick = (file: FileItem) => {
    if (file.type === 'folder') {
        setCurrentPath(file.path);
        setSearchQuery(''); // Clear search when navigating
        setOptimisticFiles([]);
    } else if (file.type === 'file' && onOpenFile) {
      onOpenFile(file.path);
    }
  }

  const handleUpload = async (files: File[] | FileList) => {
    if (!files || files.length === 0 || !user) return;
    setIsUploading(true);
    setUploadProgress(0);
    const file = files[0];
    try {
        const storage = getStorage();
        const storageRef = ref(storage, `${currentPath}/${file.name}`);
        // In a real app, you'd use `uploadBytesResumable` to get progress
        await uploadBytes(storageRef, file);
        setUploadProgress(100);
        toast({ title: "Upload Complete", description: `${file.name} has been uploaded.` });
        osEvent.emit('file-system-change', undefined);
    } catch(err: any) {
        console.error(err);
        toast({ title: "Upload Failed", description: err.message, variant: "destructive"});
    } finally {
        setIsUploading(false);
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName || !user || !isCreating) return;

      const trimmedName = newName.trim();
      if (!trimmedName) return;

      let fullPath: string;
      let optimisticItem: FileItem;
      const isFile = isCreating === 'file';

      if (isFile) {
          fullPath = `${currentPath}/${trimmedName}`;
          optimisticItem = {
              name: trimmedName,
              type: 'file',
              path: fullPath,
              size: 0,
              modified: new Date(),
          };
      } else { // isCreating === 'folder'
          fullPath = `${currentPath}/${trimmedName}/.placeholder`;
          optimisticItem = {
              name: trimmedName,
              type: 'folder',
              path: `${currentPath}/${trimmedName}`,
              size: 0,
              modified: new Date(),
          };
      }
      
      setOptimisticFiles(prev => [...prev, optimisticItem]);
      setNewName('');
      setIsCreating(null);

      try {
          const storage = getStorage();
          const itemRef = ref(storage, fullPath);
          await uploadString(itemRef, '');
          
          toast({ title: 'Success', description: `Successfully created ${isCreating} "${trimmedName}".` });
          
          osEvent.emit('file-system-change', undefined);
          setOptimisticFiles(prev => prev.filter(f => f.path !== optimisticItem.path));


          if (isFile && onOpenFile) {
            onOpenFile(`${currentPath}/${trimmedName}`, '');
          }

      } catch (err: any) {
          console.error(`Error creating ${isCreating}:`, err);
          toast({ title: `Failed to create ${isCreating}`, description: err.message, variant: "destructive" });
          setOptimisticFiles(prev => prev.filter(f => f.path !== optimisticItem.path));
      }
  }

  const confirmDelete = () => {
    if (!itemToDelete) return;
    setIsDeleting(true);

    const deleteItem = async (item: FileItem) => {
      const storage = getStorage();

      if (item.type === 'file') {
        const fileRef = ref(storage, item.path);
        await deleteObject(fileRef);
      } else if (item.type === 'folder') {
        // Recursive deletion for folders
        const listRef = ref(storage, item.path);
        const res = await listAll(listRef);
        // Delete all files in the folder
        await Promise.all(res.items.map(itemRef => deleteObject(itemRef)));
        // Recursively delete all subfolders
        await Promise.all(res.prefixes.map(folderRef => deleteItem({
          name: folderRef.name,
          path: folderRef.fullPath,
          type: 'folder',
          size: 0,
          modified: new Date(),
        })));
      }
    };

    deleteItem(itemToDelete)
      .then(() => {
        toast({ title: 'Item Deleted', description: `"${itemToDelete.name}" was successfully deleted.` });
        osEvent.emit('file-system-change', undefined);
      })
      .catch((err: any) => {
        console.error("Deletion failed:", err);
        toast({ title: "Deletion Failed", description: err.message, variant: "destructive" });
      })
      .finally(() => {
        setIsDeleting(false);
        setItemToDelete(null);
      });
  };
  
  const goUpOneLevel = () => {
      if (currentPath === basePath) return;
      const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
      setCurrentPath(parentPath);
      setSearchQuery(''); // Clear search when navigating
      setOptimisticFiles([]);
  }
  
  const cancelCreation = () => {
    setIsCreating(null);
    setNewName('');
  }
  
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
                    This action cannot be undone. This will permanently delete the {itemToDelete?.type} "{itemToDelete?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} disabled={isDeleting}>
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Continue
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
        <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goUpOneLevel} disabled={currentPath === basePath || isLoading}>
                <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => { setOptimisticFiles([]); refresh(); }} disabled={isLoading}>
                <RefreshCw className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
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
        {!isCreating ? (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        New Item
                        <ChevronDown className="h-4 w-4 ml-2"/>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsCreating('file')}>
                        <FilePlus className="h-4 w-4 mr-2" />
                        New File
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsCreating('folder')}>
                        <Folder className="h-4 w-4 mr-2" />
                        New Folder
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
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
            ) : displayedFiles.length > 0 ? (
                 displayedFiles.map((file) => (
                    <FileRow key={file.path} file={file} onDoubleClick={handleDoubleClick} onDelete={setItemToDelete} />
                ))
            ) : (
                 <TableRow>
                    <TableCell colSpan={4} className="text-center p-8 text-muted-foreground">
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
    </>
  );
}
