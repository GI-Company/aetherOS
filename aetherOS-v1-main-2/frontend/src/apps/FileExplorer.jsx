import React, { useState, useEffect, useCallback } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Folder, File, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

const FileExplorer = () => {
  const [files, setFiles] = useState([]);
  const [currentPath, setCurrentPath] = useState('/home/user');
  const [isLoading, setIsLoading] = useState(true);
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
      // Ensure we're updating the correct directory
      if (path === currentPath) {
        setFiles(receivedFiles || []);
        setIsLoading(false);
      }
    };
    
    // Subscribe to the result topic
    const unsubscribe = aether.subscribe('vfs:list:result', handleFileList);
    
    // Initial fetch
    fetchFiles(currentPath);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [aether, currentPath, fetchFiles]);
  
  const handleDoubleClick = (item) => {
    if (item.isDir) {
      // In a real implementation, you'd handle path joining properly.
      // This basic join works for the current in-memory VFS.
      const newPath = item.path;
      setCurrentPath(newPath);
    } else {
      // Handle file open
      console.log(`Opening file: ${item.name}`);
    }
  };


  return (
    <div className="h-full w-full bg-gray-800 text-white flex flex-col">
      <div className="p-2 border-b border-gray-700 text-sm">
        Current Path: {currentPath}
      </div>
      <div className="flex-grow overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {files.map((item) => (
              <div
                key={item.name}
                className="flex flex-col items-center p-2 rounded hover:bg-gray-700 cursor-pointer"
                onDoubleClick={() => handleDoubleClick(item)}
              >
                {item.isDir ? (
                  <Folder className="h-12 w-12 text-blue-400" />
                ) : (
                  <File className="h-12 w-12 text-gray-400" />
                )}
                <span className="text-xs text-center break-all mt-1">{item.name}</span>
              </div>
            ))}
            {files.length === 0 && !isLoading && (
              <div className="col-span-full text-center text-gray-500 mt-8">
                This folder is empty.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileExplorer;
