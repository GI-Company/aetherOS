
"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { FolderOpen } from "lucide-react";
import WelcomeScreen from "@/components/aether-os/code-editor/welcome-screen";
import FileTree from "@/components/aether-os/code-editor/file-tree";
import EditorTabs, { type EditorFile } from "@/components/aether-os/code-editor/editor-tabs";
import AiPanel from "@/components/aether-os/ai-panel";
import { Button } from "@/components/ui/button";
import { useUser } from "@/firebase";
import { useAppAether } from "@/lib/use-app-aether";

interface CodeEditorAppProps {
  filePath?: string; // Can be used to open a project folder
  fileToOpen?: string;
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
}

export default function CodeEditorApp({ filePath: initialProjectPath, fileToOpen, isDirty, setIsDirty }: CodeEditorAppProps) {
  const { user } = useUser();
  const [projectPath, setProjectPath] = useState<string | null>(() => {
      if (initialProjectPath) return initialProjectPath;
      if (user) return `users/${user.uid}`;
      return null;
  });
  const [openFiles, setOpenFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { publish, subscribe } = useAppAether();

  const handleSetProject = (path: string) => {
    setProjectPath(path);
    setOpenFiles([]);
    setActiveFileId(null);
  };
  
  const handleOpenFile = useCallback((filePath: string, fileContent?: string) => {
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === filePath);
    if (existingFile) {
      setActiveFileId(existingFile.id);
      return;
    }

    const fileId = `file_${Date.now()}`;

    // If content is not provided, fetch it
    if (typeof fileContent === 'undefined') {
        toast({ title: "Opening File...", description: `Loading content for ${filePath}` });
        
        let sub: (() => void) | undefined, errSub: (() => void) | undefined;
        
        const cleanup = () => {
          if (sub) sub();
          if (errSub) errSub();
        };

        const handleReadResult = (payload: any) => {
          if (payload.path === filePath) {
            const newFile: EditorFile = {
              id: fileId,
              name: filePath.split('/').pop() || 'untitled',
              path: filePath,
              content: payload.content || '',
              isDirty: false,
            };
            setOpenFiles(prev => [...prev, newFile]);
            setActiveFileId(fileId);
            cleanup();
          }
        };

        const handleReadError = (payload: any) => {
          console.error("Error opening file:", payload.error);
          toast({ title: "Error", description: `Could not load file: ${payload.error}`, variant: "destructive" });
          cleanup();
        };

        sub = subscribe('vfs:read:result', handleReadResult);
        errSub = subscribe('vfs:read:error', handleReadError);
        publish('vfs:read', { path: filePath });

    } else {
       const newFile: EditorFile = {
        id: fileId,
        name: filePath.split('/').pop() || 'untitled',
        path: filePath,
        content: fileContent || '',
        isDirty: false,
      };
      
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(fileId);
    }
  }, [openFiles, toast, publish, subscribe]);

  useEffect(() => {
    if (fileToOpen) {
      handleOpenFile(fileToOpen);
    }
  }, [fileToOpen, handleOpenFile]);

  const handleCloseFile = (fileId: string) => {
    setOpenFiles(prev => {
      const fileToCloseIndex = prev.findIndex(f => f.id === fileId);
      if (fileToCloseIndex === -1) return prev;
      
      const fileToClose = prev[fileToCloseIndex];

      if (fileToClose.isDirty && !window.confirm("You have unsaved changes. Are you sure you want to close this file?")) {
        return prev;
      }

      const updatedFiles = prev.filter(f => f.id !== fileId);
      if (updatedFiles.length === 0) {
        setIsDirty(false);
      }

      if (activeFileId === fileId) {
        if (updatedFiles.length === 0) {
          setActiveFileId(null);
        } else if (fileToCloseIndex > 0) {
          setActiveFileId(updatedFiles[fileToCloseIndex - 1].id);
        } else {
          setActiveFileId(updatedFiles[0].id);
        }
      }
      return updatedFiles;
    });
  };

  const updateFileContent = (fileId: string, newContent: string) => {
    let fileChanged = false;
    setOpenFiles(prev => prev.map(f => {
      if (f.id === fileId && f.content !== newContent) {
        fileChanged = true;
        return { ...f, content: newContent, isDirty: true }
      }
      return f;
    }));
    if(fileChanged) setIsDirty(true);
  };
  
  const updateActiveFileContent = (newContent: string) => {
    if (activeFileId) {
      updateFileContent(activeFileId, newContent);
    }
  }

  const markFileAsSaved = (fileId: string) => {
    let wasDirty = false;
    setOpenFiles(prev => {
      const newFiles = prev.map(f => {
        if (f.id === fileId) {
          if (f.isDirty) wasDirty = true;
          return { ...f, isDirty: false };
        }
        return f;
      });

      if (wasDirty) {
        const anyDirty = newFiles.some(f => f.isDirty);
        if(!anyDirty) setIsDirty(false);
      }
      return newFiles;
    });
  };

  const activeFile = openFiles.find(f => f.id === activeFileId) || null;

  if (!projectPath) {
    return <WelcomeScreen onSelectProject={handleSetProject} />;
  }

  return (
    <div className="flex h-full bg-background flex-row">
      <div className="w-[250px] bg-card/50 border-r flex flex-col">
        <div className="p-2 border-b">
           <Button variant="ghost" size="sm" className="w-full justify-start text-left" onClick={() => setProjectPath(null)}>
              <FolderOpen className="h-4 w-4 mr-2"/>
              <span className="truncate">{projectPath.split('/').pop() || 'Project'}</span>
           </Button>
        </div>
        <FileTree
          basePath={projectPath}
          onFileSelect={handleOpenFile}
        />
      </div>

      <div className="flex-grow flex flex-col md:w-2/3">
        <div className="flex-grow w-full h-full flex">
          <div className="flex-grow w-2/3 h-full">
            <EditorTabs
              files={openFiles}
              activeFileId={activeFileId}
              onTabClick={setActiveFileId}
              onCloseTab={handleCloseFile}
              onContentChange={updateFileContent}
              onSave={markFileAsSaved}
            />
          </div>
          <div className="w-1/3 border-l h-full">
             <AiPanel
              activeFile={activeFile}
              onCodeUpdate={updateActiveFileContent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
