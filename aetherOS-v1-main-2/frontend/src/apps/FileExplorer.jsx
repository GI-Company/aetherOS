
import React, { useState, useEffect, useCallback } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Folder, File, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '../components/Table';
import { Button } from '../components/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/DropdownMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/AlertDialog';

const FileExplorer = () => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/home/user');
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const aether = useAether();

  const fetchFiles = useCallback(async (path) => {
    if (!aether) return;
    setIsLoading(true);
    console.log(`Requesting file list for path: ${path}`);
    await aether.publish('vfs:list', { path });
  }, [aether]);

  useEffect(() => {
    if (!aether) return;

    const handleFileList = (env) => {
      console.log('Received file list:', env.payload);
      const { path, files: receivedFiles } = env.payload;
      if (path === currentPath) {
        setFiles(receivedFiles || []);
        setIsLoading(false);
      }
    };
    
    const handleDeleteResult = (env) => {
      console.log('Received delete result:', env.payload);
      setIsDeleting(false);
      setItemToDelete(null);
      // Re-fetch files for the current path to show the updated list
      fetchFiles(currentPath); 
    };
    
    const sub = aether.subscribe('vfs:list:result', handleFileList);
    const deleteSub = aether.subscribe('vfs:delete:result', handleDeleteResult);
    
    fetchFiles(currentPath);

    return () => {
      if (sub) sub();
      if (deleteSub) deleteSub();
    };
  }, [aether, currentPath, fetchFiles]);
  
  const handleDoubleClick = (item) => {
    if (item.isDir) {
      setCurrentPath(item.path);
    } else {
      console.log(`Opening file: ${item.name}`);
    }
  };
  
  const confirmDelete = () => {
    if (!itemToDelete || !aether) return;
    setIsDeleting(true);
    aether.publish('vfs:delete', { path: itemToDelete.path });
  };
  
  const formatBytes = (bytes, decimals = 2) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }


  return (
    <div className="h-full w-full bg-gray-800 text-white flex flex-col">
      <div className="p-2 border-b border-gray-700 text-sm">
        Path: {currentPath}
      </div>
      <div className="flex-grow overflow-y-auto">
        <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the {itemToDelete?.isDir ? 'folder' : 'file'} "{itemToDelete?.name}".
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
              {files.map((item) => (
                <TableRow key={item.name} onDoubleClick={() => handleDoubleClick(item)} className="cursor-pointer group">
                  <TableCell className="flex items-center gap-2">
                    {item.isDir ? <Folder className="h-5 w-5 text-blue-400" /> : <File className="h-5 w-5 text-gray-400" />}
                    {item.name}
                  </TableCell>
                  <TableCell>{item.isDir ? '--' : formatBytes(item.size)}</TableCell>
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
              {files.length === 0 && (
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
