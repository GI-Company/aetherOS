
import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Loader2, Save } from 'lucide-react';
import { Button } from '../components/Button';

const Editor = lazy(() => import('@monaco-editor/react'));

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
      // Basic correlation check
      if (env.payload.path === filePath) {
          setContent(env.payload.content);
          setIsLoading(false);
      }
    };

    const handleReadError = (env) => {
      console.error('VFS Read Error:', env.payload.error);
      setError(env.payload.error);
      setIsLoading(false);
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
        setTimeout(() => setIsSaving(false), 1000); 
    } catch(err) {
        console.error("Save failed:", err);
        setError("Failed to save the file.");
        setIsSaving(false);
    }
  };
  
  const handleEditorChange = (value) => {
      setContent(value || '');
  }

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
          <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>}>
            <Editor
              height="100%"
              language="javascript"
              theme="vs-dark"
              value={content}
              onChange={handleEditorChange}
              options={{ minimap: { enabled: false } }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
