import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAether } from '../lib/aether_sdk';
import { Loader2, Save } from 'lucide-react';
import { Button } from '../components/Button';
import { getStorage, ref, getDownloadURL, uploadString } from 'firebase/storage';

const Editor = lazy(() => import('@monaco-editor/react'));

const CodeEditor = ({ filePath }) => {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const aether = useAether(); // Keep for potential future use with AI, etc.

  useEffect(() => {
    if (!filePath) {
      setIsLoading(false);
      setError('No file path provided.');
      return;
    }

    const fetchContent = async () => {
        setIsLoading(true);
        setError(null);
        setContent('');

        try {
            const storage = getStorage();
            const fileRef = ref(storage, filePath);
            const url = await getDownloadURL(fileRef);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch file: ${response.statusText}`);
            const textContent = await response.text();
            setContent(textContent);
        } catch (err) {
            console.error("Error loading file content:", err);
            setError(err.message || "Could not load file.");
        } finally {
            setIsLoading(false);
        }
    }
    
    fetchContent();
    
  }, [filePath]);
  
  const handleSave = async () => {
    if (!filePath || isSaving) return;
    setIsSaving(true);
    setError(null);

    try {
        const storage = getStorage();
        const fileRef = ref(storage, filePath);
        await uploadString(fileRef, content);
        setTimeout(() => {
            setIsSaving(false)
            // Ideally, we'd also mark the file as "not dirty"
        }, 1000); 
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
