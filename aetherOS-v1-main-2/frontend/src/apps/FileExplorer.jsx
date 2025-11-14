
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Folder, File, Loader2, MoreVertical, Trash2, ChevronDown, FilePlus, FolderPlus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from '../components/Table';
import { Button } from '../components/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/DropdownMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/AlertDialog';
import { Input } from '../components/Input';
import { APPS } from '../lib/apps';
import { osEvent } from '../lib/events';

const FileExplorer = ({ onAppOpen }) => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('users/default-user'); // Default path for demo
  const [isLoading, setIsLoading] = useState(true);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [creatingItemType, setCreatingItemType] = useState(null);
  const aether = useAether(); 
  const { user } = useAether();

  useEffect(() => {
    if(user?.uid) {
        setCurrentPath(`users/${user.uid}`);
    }
  }, [user]);

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
    
    const handleMutationResult = (env) => {
      console.log('Received mutation result:', env.payload);
      setIsDeleting(false);
      setItemToDelete(null);
      setCreatingItemType(null);
      fetchFiles(currentPath); 
    };
    
    const subs = [
      aether.subscribe('vfs:list:result', handleFileList),
      aether.subscribe('vfs:delete:result', handleMutationResult),
      aether.subscribe('vfs:create:file:result', handleMutationResult),
      aether.subscribe('vfs:create:folder:result', handleMutationResult)
    ];

    const handleGlobalFsChange = () => fetchFiles(currentPath);
    osEvent.on('file-system-change', handleGlobalFsChange);
    
    fetchFiles(currentPath);

    return () => {
      subs.forEach(sub => sub && sub());
      osEvent.off('file-system-change', handleGlobalFsChange);
    };
  }, [aether, currentPath, fetchFiles]);
  
  const handleDoubleClick = (item) => {
    if (item.isDir) {
      setCurrentPath(item.path);
    } else {
      const codeEditorApp = APPS.find(app => app.id === 'code-editor');
      if (codeEditorApp && onAppOpen) {
          const projectPath = item.path.substring(0, item.path.lastIndexOf('/')) || '/';
          onAppOpen(codeEditorApp, { filePath: projectPath, fileToOpen: item.path });
      }
    }
  };
  
  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    aether.publish('vfs:delete', { path: itemToDelete.path });
  };
  
  const handleCreate = async (name) => {
      if (!name || !creatingItemType) return;
      
      const topic = `vfs:create:${creatingItemType}`;
      const payload = { path: currentPath, name };
      aether.publish(topic, payload);
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
    <div className="h-full w-full bg-gray-800 text-white flex flex-col relative">
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
             {creatingItemType && (
                <NewItemRow type={creatingItemType} onCancel={() => setCreatingItemType(null)} onCreate={handleCreate} />
             )}
              {files.map((item) => (
                <TableRow key={item.path} onDoubleClick={() => handleDoubleClick(item)} className="cursor-pointer group">
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
