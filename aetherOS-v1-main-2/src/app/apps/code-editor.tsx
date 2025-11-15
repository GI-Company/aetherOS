
"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FolderOpen } from "lucide-react";
import WelcomeScreen from "@/components/aether-os/code-editor/welcome-screen";
import FileTree from "@/components/aether-os/code-editor/file-tree";
import EditorTabs, { type EditorFile } from "@/components/aether-os/code-editor/editor-tabs";
import AiPanel from "@/components/aether-os/code-editor/ai-panel";
import { Button } from "@/components/ui/button";
import { useAether } from "@/lib/aether_sdk_client";

interface CodeEditorAppProps {
  filePath?: string; // Can be used to open a project folder
  fileToOpen?: string;
}

export default function CodeEditorApp({ filePath: initialProjectPath, fileToOpen }: CodeEditorAppProps) {
  const [projectPath, setProjectPath] = useState<string | null>(initialProjectPath || null);
  const [openFiles, setOpenFiles] = useState<EditorFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  const { toast } = useToast();
  const aether = useAether();

  const handleSetProject = (path: string) => {
    setProjectPath(path);
    setOpenFiles([]);
    setActiveFileId(null);
  };
  
  const handleOpenFile = useCallback(async (filePath: string, fileContent?: string) => {
    if (!aether) return;
    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === filePath);
    if (existingFile) {
      setActiveFileId(existingFile.id);
      return;
    }

    const fileId = `file_${Date.now()}`;
    let content = fileContent;

    // If content is not provided, fetch it
    if (typeof content === 'undefined') {
        toast({ title: "Opening File...", description: `Loading content for ${filePath}` });
        
        aether.publish('vfs:read', { path: filePath });

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
            // Unsubscribe after getting the result
            aether.subscribe('vfs:read:result', handleReadResult)();
          }
        };

        const handleReadError = (payload: any) => {
          console.error("Error opening file:", payload.error);
          toast({ title: "Error", description: `Could not load file: ${payload.error}`, variant: "destructive" });
          aether.subscribe('vfs:read:error', handleReadError)();
        };

        aether.subscribe('vfs:read:result', handleReadResult);
        aether.subscribe('vfs:read:error', handleReadError);

    } else {
       const newFile: EditorFile = {
        id: fileId,
        name: filePath.split('/').pop() || 'untitled',
        path: filePath,
        content: content || '',
        isDirty: false,
      };
      
      setOpenFiles(prev => [...prev, newFile]);
      setActiveFileId(fileId);
    }
  }, [openFiles, toast, aether]);

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

      // If the closed file was the active one, select a new active file
      if (activeFileId === fileId) {
        if (updatedFiles.length === 0) {
          setActiveFileId(null);
        } else if (fileToCloseIndex > 0) {
          // Select previous tab
          setActiveFileId(updatedFiles[fileToCloseIndex - 1].id);
        } else {
          // Select next tab
          setActiveFileId(updatedFiles[0].id);
        }
      }
      return updatedFiles;
    });
  };

  const updateFileContent = (fileId: string, newContent: string) => {
    setOpenFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, content: newContent, isDirty: true } : f
    ));
  };
  
  const updateActiveFileContent = (newContent: string) => {
    if (activeFileId) {
      updateFileContent(activeFileId, newContent);
    }
  }

  const markFileAsSaved = (fileId: string) => {
    setOpenFiles(prev => prev.map(f =>
      f.id === fileId ? { ...f, isDirty: false } : f
    ));
  };

  const activeFile = openFiles.find(f => f.id === activeFileId) || null;

  if (!aether) {
    return <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  }
  
  if (!projectPath) {
    return <WelcomeScreen onSelectProject={handleSetProject} />;
  }

  return (
    <div className="flex h-full bg-background flex-row">
      {/* File Tree Panel */}
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

      {/* Editor and AI Panel */}
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

    