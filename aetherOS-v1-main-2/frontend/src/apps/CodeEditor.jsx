
import React, { useState, useEffect, useCallback } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Loader2, Save } from 'lucide-react';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';

const CodeEditor = ({ filePath }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const aether = useAether();

  useEffect(() => {
    if (!aether || !filePath) {
      setIsLoading(false);
      setError('No file path provided.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setContent('');

    console.log(`Requesting content for: ${filePath}`);
    aether.publish('vfs:read', { path: filePath });

    const handleReadResult = (env) => {
      // Check if the response correlates with our request.
      // This is a simplified correlation check.
      const correlationId = env.meta?.correlationId;
      if (correlationId) {
        // A more robust system would match this ID to a sent message ID.
        // For now, we assume the latest response for our path is what we want.
        if (env.payload.path === filePath) {
            setContent(env.payload.content);
            setIsLoading(false);
        }
      }
    };

    const handleReadError = (env) => {
      if (env.meta?.correlationId) {
        console.error('VFS Read Error:', env.payload.error);
        setError(env.payload.error);
        setIsLoading(false);
      }
    };

    const readSub = aether.subscribe('vfs:read:result', handleReadResult);
    const errorSub = aether.subscribe('vfs:read:error', handleReadError);

    return () => {
      if (readSub) readSub();
      if (errorSub) errorSub();
    };
  }, [aether, filePath]);
  
  const handleSave = async () => {
    if (!aether || !filePath || isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
        await aether.publish('vfs:write', { path: filePath, content: content });
        // Optimistically assume save will work and listen for confirmation if needed
        // For now, just mark saving as complete after a short delay
        setTimeout(() => setIsSaving(false), 1000); 
    } catch(err) {
        console.error("Save failed:", err);
        setError("Failed to save the file.");
        setIsSaving(false);
    }
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white flex flex-col">
       <div className="p-2 border-b border-gray-700 flex justify-end">
            <Button onClick={handleSave} disabled={isLoading || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save
            </Button>
        </div>
      <div className="flex-grow relative">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-red-400 p-4">
            Error loading file: {error}
          </div>
        ) : (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="h-full w-full bg-transparent border-0 rounded-none resize-none font-mono text-sm focus:ring-0"
            placeholder="File content goes here..."
          />
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
