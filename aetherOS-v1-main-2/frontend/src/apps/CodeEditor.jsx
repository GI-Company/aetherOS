
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
    if (!filePath || !aether) {
      setIsLoading(false);
      setError('No file path provided or Aether client not ready.');
      return;
    }

    const fetchContent = async () => {
        setIsLoading(true);
        setError(null);
        setContent('');
        
        aether.publish('vfs:read', { path: filePath });
    }
    
    const handleReadResult = (env) => {
        if (env.payload.path === filePath) {
            setContent(env.payload.content || '');
            setIsLoading(false);
        }
    };
    
    const handleReadError = (env) => {
        if(env.meta?.correlationId) { // Check if error corresponds to our request
            setError(env.payload.error || 'Could not load file');
            setIsLoading(false);
        }
    };
    
    const sub = aether.subscribe('vfs:read:result', handleReadResult);
    const errSub = aether.subscribe('vfs:read:error', handleReadError);

    fetchContent();

    return () => {
      sub && sub();
      errSub && errSub();
    };
    
  }, [filePath, aether]);
  
  const handleSave = async () => {
    if (!filePath || isSaving || !aether) return;
    setIsSaving(true);
    setError(null);

    aether.publish('vfs:write', { path: filePath, content });
    
    const sub = aether.subscribe('vfs:write:result', (env) => {
        if(env.payload.path === filePath) {
            setTimeout(() => {
                setIsSaving(false);
            }, 1000);
            sub && sub();
            errSub && errSub();
        }
    });

    const errSub = aether.subscribe('vfs:write:error', (env) => {
        if(env.meta?.correlationId) {
             setError("Failed to save the file.");
             setIsSaving(false);
             sub && sub();
             errSub && errSub();
        }
    });
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
              language="javascript" // Should be dynamic based on file type
              theme="vs-dark"
              value={content}
              onChange={handleEditorChange}
              options={{ minimap: { enabled: false } }}
              path={filePath} // Pass path for better language detection
            />
          </Suspense>
        )}
      </div>
    </div>
  );
};

export default CodeEditor;
