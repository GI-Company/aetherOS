import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Folder, File, Loader2, MoreVertical, Trash2, ChevronDown, FilePlus, FolderPlus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '../components/Table';
import { Button } from '../components/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/DropdownMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/AlertDialog';
import { Input } from '../components/Input';
import { APPS } from '../lib/apps';
import { getStorage, ref, listAll, getMetadata, deleteObject, uploadString, uploadBytesResumable } from 'firebase/storage';
import { Progress } from '../components/Progress';

const Dropzone = ({ visible }) => (
    <div
        className={`pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
        <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-blue-400 p-12">
            <FolderPlus className="h-16 w-16 text-blue-400" />
            <p className="text-lg font-semibold text-blue-400">Drop files to upload</p>
        </div>
    </div>
);


const FileExplorer = ({ onAppOpen }) => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('users/default-user'); // Default path for demo
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [creatingItemType, setCreatingItemType] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { user } = useAether(); // Using user from SDK context for path
  
  useEffect(() => {
    // In a real app, you'd get the user's UID after they log in
    if(user?.uid) {
        setCurrentPath(`users/${user.uid}`);
    }
  }, [user]);

  const fetchFiles = useCallback(async (path) => {
    setIsLoading(true);
    try {
        const storage = getStorage();
        const listRef = ref(storage, path);
        const res = await listAll(listRef);

        const fetchedFiles = [];

        // Add folders
        for (const prefix of res.prefixes) {
            fetchedFiles.push({
                name: prefix.name,
                type: 'folder',
                path: prefix.fullPath,
                size: 0,
                modTime: new Date(), // Firebase Storage doesn't expose folder metadata
            });
        }

        // Add files
        for (const itemRef of res.items) {
             if (itemRef.name === '.placeholder') continue;
            const metadata = await getMetadata(itemRef);
            fetchedFiles.push({
                name: metadata.name,
                type: 'file',
                path: metadata.fullPath,
                size: metadata.size,
                modTime: new Date(metadata.updated),
            });
        }
        
        // Sort folders first, then by name
        fetchedFiles.sort((a, b) => {
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;
            return a.name.localeCompare(b.name);
        });
        
        setFiles(fetchedFiles);
    } catch (err) {
        console.error("Error listing files:", err);
    } finally {
        setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath, fetchFiles]);
  
  const handleDoubleClick = (item) => {
    if (item.type === 'folder') {
      setCurrentPath(item.path);
    } else {
      const codeEditorApp = APPS.find(app => app.id === 'code-editor');
      if (codeEditorApp && onAppOpen) {
          onAppOpen(codeEditorApp, { filePath: item.path });
      }
    }
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    
    const deleteFolderContents = async (folderPath) => {
      const storage = getStorage();
      const listRef = ref(storage, folderPath);
      const res = await listAll(listRef);
      
      // Delete all files in the folder
      await Promise.all(res.items.map(itemRef => deleteObject(itemRef)));
      // Recursively delete all subfolders
      await Promise.all(res.prefixes.map(folderRef => deleteFolderContents(folderRef.fullPath)));
    }

    try {
      const storage = getStorage();
      if (itemToDelete.type === 'folder') {
        await deleteFolderContents(itemToDelete.path);
      } else {
        const itemRef = ref(storage, itemToDelete.path);
        await deleteObject(itemRef);
      }
      setItemToDelete(null);
      fetchFiles(currentPath);
    } catch (err) {
      console.error("Failed to delete item:", err);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleCreate = async (name) => {
      if (!name || !creatingItemType) return;
      
      const path = creatingItemType === 'folder' 
        ? `${currentPath}/${name}/.placeholder` // Create a placeholder file to represent the folder
        : `${currentPath}/${name}`;

      try {
          const storage = getStorage();
          const itemRef = ref(storage, path);
          await uploadString(itemRef, ""); // Upload an empty string
          setCreatingItemType(null);
          fetchFiles(currentPath);
      } catch (err) {
          console.error("Error creating item:", err);
      }
  };

  const handleUpload = async (filesToUpload) => {
    if (!filesToUpload || filesToUpload.length === 0) return;
    setIsUploading(true);
    setUploadProgress(0);
    
    const file = filesToUpload[0];
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
        setIsUploading(false);
      },
      () => {
        setIsUploading(false);
        fetchFiles(currentPath);
      }
    );
  }
  
  // Drag and drop handlers
  const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  
  const formatBytes = (bytes, decimals = 2) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
  
  const NewItemRow = ({ type, onCancel, onCreate }) => {
    const [name, setName] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onCreate(name.trim());
    };

    return (
        <TableRow className="bg-gray-700/50">
            <TableCell colSpan={4} className="p-2">
                <form onSubmit={handleCreateSubmit} className="flex items-center gap-2">
                    {type === 'folder' ? <Folder className="h-5 w-5 text-blue-400"/> : <File className="h-5 w-5 text-gray-400"/>}
                    <Input
                        ref={inputRef}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={onCancel}
                        onKeyDown={(e) => e.key === 'Escape' && onCancel()}
                        placeholder={`Enter ${type} name...`}
                        className="h-8 bg-gray-800 border-gray-600"
                    />
                    <Button type="submit" size="sm" className="h-8" disabled={!name.trim()}>Create</Button>
                    <Button type="button" variant="ghost" size="sm" className="h-8" onClick={onCancel}>Cancel</Button>
                </form>
            </TableCell>
        </TableRow>
    );
  };


  return (
    <div
      className="h-full w-full bg-gray-800 text-white flex flex-col relative"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
    >
       <Dropzone visible={isDragOver} />
      <div className="p-2 border-b border-gray-700 flex justify-between items-center text-sm">
        <div>Path: {currentPath}</div>
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={!!creatingItemType}>
                    New
                    <ChevronDown className="h-4 w-4 ml-2"/>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => setCreatingItemType('file')}>
                    <FilePlus className="mr-2 h-4 w-4" /> New File
                </DropdownMenuItem>
                 <DropdownMenuItem onSelect={() => setCreatingItemType('folder')}>
                    <FolderPlus className="mr-2 h-4 w-4" /> New Folder
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isUploading && <Progress value={uploadProgress} className="w-full h-1" />}
      <div className="flex-grow overflow-y-auto">
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
                  <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-red-500 hover:bg-red-600">
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Delete
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Last Modified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
             {creatingItemType && (
                <NewItemRow type={creatingItemType} onCancel={() => setCreatingItemType(null)} onCreate={handleCreate} />
             )}
              {files.map((item) => (
                <TableRow key={item.name} onDoubleClick={() => handleDoubleClick(item)} className="cursor-pointer group">
                  <TableCell className="flex items-center gap-2">
                    {item.type === 'folder' ? <Folder className="h-5 w-5 text-blue-400" /> : <File className="h-5 w-5 text-gray-400" />}
                    {item.name}
                  </TableCell>
                  <TableCell>{item.type === 'folder' ? '--' : formatBytes(item.size)}</TableCell>
                  <TableCell>{new Date(item.modTime).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                         </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setItemToDelete(item)} className="text-red-400">
                          <Trash2 className="mr-2 h-4 w-4"/>
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {files.length === 0 && !creatingItemType && (
                 <TableRow>
                   <TableCell colSpan={4} className="text-center h-24 text-gray-500">
                     This folder is empty.
                   </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
