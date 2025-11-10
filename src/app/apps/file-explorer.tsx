
'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Folder, File, Search, Loader2, RefreshCw, FilePlus, ChevronDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useFirebase, useMemoFirebase } from "@/firebase";
import { getStorage, ref, listAll, getMetadata, uploadString, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { osEvent } from "@/lib/events";
import { FileItem } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import Dropzone from "@/components/aether-os/dropzone";
import { semanticFileSearch } from "@/ai/flows/semantic-file-search";
import FileRow from "@/components/aether-os/file-row";
import Breadcrumbs from "@/components/aether-os/breadcrumbs";


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
        
        const handleFileSystemChange = () => {
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
  const { user } = useFirebase();
  const basePath = useMemo(() => user ? `users/${user.uid}` : '', [user]);
  const [currentPath, setCurrentPath] = useState(basePath);
  
  const { allFiles, isLoading, refresh } = useStorageFiles(currentPath);
  const [displayedFiles, setDisplayedFiles] = useState<FileItem[]>([]);
  
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery || "");
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  const [creatingItemType, setCreatingItemType] = useState<'folder' | 'file' | null>(null);

  const [itemToDelete, setItemToDelete] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { toast } = useToast();
  
  useEffect(() => {
    if (basePath && !currentPath) {
      setCurrentPath(basePath);
    }
  }, [basePath, currentPath])

  useEffect(() => {
    if (!searchQuery) {
        setDisplayedFiles(allFiles);
    }
  }, [allFiles, searchQuery]);


  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setDisplayedFiles(allFiles);
      return;
    }
    setIsSearching(true);
    setCreatingItemType(null);
    try {
      const storage = getStorage();
      const rootRef = ref(storage, basePath);
      const allPathsResult = await listAll(rootRef);
      // This is a simplified approach. A real app might have a backend service to get all file paths.
      const availableFilePaths = [
          ...allPathsResult.items.map(item => item.fullPath),
          ...allPathsResult.prefixes.map(prefix => prefix.fullPath)
      ];

      const { results } = await semanticFileSearch({ query, availableFiles: availableFilePaths });
      
      const searchResultPromises = results.map(async (result) => {
          if (result.type === 'folder') {
              return { name: result.path.split('/').pop()!, type: 'folder', path: result.path, size: 0, modified: new Date() };
          }
          const metadata = await getMetadata(ref(storage, result.path));
          return { name: metadata.name, type: 'file', path: metadata.fullPath, size: metadata.size, modified: new Date(metadata.updated) };
      });

      const searchResults = (await Promise.all(searchResultPromises)) as FileItem[];
      
      setDisplayedFiles(searchResults);
      
      toast({
          title: "Search Complete",
          description: `Found ${searchResults.length} matching item(s).`
      });

    } catch (err: any) {
        console.error("Search failed:", err);
        toast({ title: "Search Failed", description: err.message, variant: "destructive" });
    } finally {
        setIsSearching(false);
    }
  }, [allFiles, basePath, toast]);


  useEffect(() => {
     if (initialSearchQuery) {
        handleSearch(initialSearchQuery);
     }
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearchQuery]);


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

  const handleUpload = async (files: File[] | FileList) => {
    if (!files || files.length === 0 || !user) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    const file = files[0];
    const storage = getStorage();
    const storageRef = ref(storage, `${currentPath}/${file.name}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      },
      (error) => {
        console.error(error);
        toast({ title: "Upload Failed", description: error.message, variant: "destructive"});
        setIsUploading(false);
      },
      () => {
        toast({ title: "Upload Complete", description: `${file.name} has been uploaded.` });
        osEvent.emit('file-system-change');
        setIsUploading(false);
      }
    );
  }

  const handleCreate = async (name: string) => {
      if (!name || !user || !creatingItemType) return;
      
      const isFile = creatingItemType === 'file';
      const pathSegment = isFile ? name : `${name}/.placeholder`;
      const fullPath = `${currentPath}/${pathSegment}`;
      
      try {
          const storage = getStorage();
          const itemRef = ref(storage, fullPath);
          await uploadString(itemRef, '');
          
          toast({ title: 'Success', description: `Successfully created ${creatingItemType} "${name}".` });
          
          osEvent.emit('file-system-change');

          if (isFile && onOpenFile) {
            onOpenFile(`${currentPath}/${name}`, '');
          }
      } catch (err: any) {
          console.error(`Error creating ${creatingItemType}:`, err);
          toast({ title: `Failed to create ${creatingItemType}`, description: err.message, variant: "destructive" });
      } finally {
          setCreatingItemType(null);
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
        // Recursively delete folder contents
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
         // After deleting contents, try to delete the .placeholder file if it exists,
         // which is used to represent the folder itself in some cases.
        const placeholderRef = ref(storage, `${item.path}/.placeholder`);
        try {
          await deleteObject(placeholderRef);
        } catch (error: any) {
            if (error.code !== 'storage/object-not-found') {
              console.warn(`Could not delete placeholder for ${item.path}:`, error);
            }
        }
      }
    };

    deleteItem(itemToDelete)
      .then(() => {
        toast({ title: 'Item Deleted', description: `"${itemToDelete.name}" was successfully deleted.` });
        osEvent.emit('file-system-change');
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
