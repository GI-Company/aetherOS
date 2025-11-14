
import React, { useState, useEffect } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Loader2 } from 'lucide-react';

const CodeEditor = ({ filePath }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const aether = useAether();

  useEffect(() => {
    if (!aether || !filePath) {
        setIsLoading(false);
        setError("No file path provided.");
        return;
    };

    setIsLoading(true);
    setError(null);
    setContent('');

    console.log(`Requesting content for: ${filePath}`);
    aether.publish('vfs:read', { path: filePath });
    
    const handleReadResult = (env) => {
      console.log("Read result received:", env);
      if (env.payload.path === filePath) {
        setContent(env.payload.content);
        setIsLoading(false);
      }
    };
    
    const handleError = (env) => {
       if (env.meta?.correlationId) {
            // How to check if error correlates to our request?
            // For now, assume any read error is for us.
            console.error("VFS Read Error:", env.payload.error);
            setError(env.payload.error);
            setIsLoading(false);
       }
    };

    const readSub = aether.subscribe('vfs:read:result', handleReadResult);
    const errorSub = aether.subscribe('vfs:read:error', handleError);

    return () => {
      if (readSub) readSub();
      if (errorSub) errorSub();
    };
  }, [aether, filePath]);

  return (
    <div className="h-full w-full bg-gray-900 text-white font-mono text-sm overflow-auto">
      {isLoading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : error ? (
         <div className="flex items-center justify-center h-full text-red-400 p-4">
            Error loading file: {error}
        </div>
      ) : (
        <pre className="p-4 whitespace-pre-wrap">{content}</pre>
      )}
    </div>
  );
};

export default CodeEditor;
