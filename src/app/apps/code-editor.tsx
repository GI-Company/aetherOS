
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { aiCodeGeneration } from "@/ai/flows/ai-code-generation";
import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Wand2, Sparkles, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { ref, uploadString } from 'firebase/storage';
import { useFirebase, useStorage, errorEmitter } from "@/firebase";
import { osEvent } from "@/lib/events";
import type Editor from "@monaco-editor/react";
import { FirestorePermissionError } from "@/firebase/errors";

const MonacoEditor = lazy(() => import("@/components/aether-os/monaco-editor"));

interface CodeEditorAppProps {
  filePath?: string;
  initialContent?: string;
}

export default function CodeEditorApp({ filePath: initialFilePath, initialContent = '' }: CodeEditorAppProps) {
  const [filePath, setFilePath] = useState(initialFilePath || '/untitled.tsx');
  const [code, setCode] = useState(initialContent);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"generate" | "refactor" | "save" | null>(null);
  const { toast } = useToast();
  const { user } = useFirebase();
  const storage = useStorage();
  const editorRef = useRef<InstanceType<typeof Editor> | null>(null);

  useEffect(() => {
    if (initialFilePath) {
      setFilePath(initialFilePath);
    }
  }, [initialFilePath]);

  useEffect(() => {
    setCode(initialContent);
  }, [initialContent]);

  const handleEditorDidMount = (editor: InstanceType<typeof Editor>) => {
    editorRef.current = editor;
  };

  const cleanCode = (rawCode: string) => {
    return rawCode.replace(/^```(?:\w+\n)?/, '').replace(/```$/, '').trim();
  }

  const handleGenerateCode = async () => {
    if (!prompt) {
      toast({ title: "Prompt is empty", description: "Please enter a prompt to generate code.", variant: "destructive" });
      return;
    }
    setIsLoading("generate");
    try {
      const fullPrompt = `File Path: ${filePath}\n\nTask: ${prompt}\n\n---\n\nGenerate the complete code for the file based on the task. Ensure the output is a single, complete file content without any extra explanations.`;
      const result = await aiCodeGeneration({ description: fullPrompt });
      const newCode = cleanCode(result.code);
      setCode(newCode);
      toast({ title: "Code Generated", description: `The code in ${filePath} has been updated.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate code.", variant: "destructive" });
    } finally {
      setIsLoading(null);
    }
  };

  const handleRefactorCode = async () => {
    const currentCode = editorRef.current?.getValue();
    if (!currentCode) {
      toast({ title: "No code to refactor", description: "The editor is empty.", variant: "destructive" });
      return;
    }
    setIsLoading("refactor");
    try {
      const response = await fetch('/docs/ROADMAP.md');
      const styleGuide = await response.text();

      const refactorPrompt = `
        File Path: ${filePath}
        
        Architectural Style Guide & Roadmap:
        ---
        ${styleGuide}
        ---

        Task:
        Please act as an expert software architect. Refactor the following code to align with the principles and goals outlined in the Architectural Style Guide & Roadmap provided above.
        Focus on improving structure, readability, performance, and security.
        Return only the raw, complete code for the file.

        Code to Refactor:
        ---
        ${currentCode}
      `;
      const result = await aiCodeGeneration({ description: refactorPrompt });
      const newCode = cleanCode(result.code);
      setCode(newCode);
      toast({ title: "Refactoring Complete", description: `The code in ${filePath} has been updated based on the project's architectural goals.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to refactor code.", variant: "destructive" });
    } finally {
      setIsLoading(null);
    }
  }

  const handleSave = () => {
     const currentCode = editorRef.current?.getValue();
     if (!user || !filePath || filePath === '/untitled.tsx' || !storage || typeof currentCode === 'undefined') {
      toast({
        title: "Cannot Save",
        description: "Please open a valid file from the explorer before saving.",
        variant: "destructive",
      });
      return;
    }
    setIsLoading("save");

    const fileRef = ref(storage, filePath);
    
    uploadString(fileRef, currentCode)
      .then(() => {
        toast({
          title: "File Saved!",
          description: `${filePath} has been saved to your cloud storage.`,
        });
        osEvent.emit('file-system-change', undefined);
      })
      .catch((serverError) => {
        const permissionError = new FirestorePermissionError({
          path: fileRef.fullPath,
          operation: 'write',
          requestResourceData: `(file content of ${currentCode.length} bytes)`,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
          title: "Save Failed",
          description: "Check the console or error overlay for details on the permission error.",
          variant: "destructive",
        });
      })
      .finally(() => {
         setIsLoading(null);
      });
  }

  return (
    <div className="flex h-full bg-background flex-col md:flex-row">
      <div className="flex-grow flex flex-col md:w-2/3">
        <div className="flex-shrink-0 p-2 border-b text-sm text-muted-foreground flex justify-between items-center">
          <span>File: {filePath}</span>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!!isLoading}>
            {isLoading === 'save' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
        <div className="flex-grow w-full h-full bg-card">
           <Suspense fallback={<div className="flex items-center justify-center h-full"><Loader2 className="animate-spin h-8 w-8" /></div>}>
            <MonacoEditor
              value={code}
              onMount={handleEditorDidMount}
              language="typescript"
            />
          </Suspense>
        </div>
      </div>
      <div className="md:w-1/3 border-t md:border-t-0 md:border-l p-4 flex flex-col gap-4">
        <h3 className="text-lg font-headline flex items-center gap-2"><Wand2 className="text-accent" /> Aether-Architect</h3>
        
        <div className="space-y-2">
          <Label htmlFor="code-prompt">Code Generation</Label>
          <Textarea 
            id="code-prompt" 
            placeholder="Describe the code to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] md:min-h-0"
            disabled={!!isLoading}
          />
          <Button onClick={handleGenerateCode} disabled={!!isLoading} className="w-full">
            {isLoading === 'generate' ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate & Replace
          </Button>
        </div>

        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-medium">Intelligent Refactoring</h4>
          <p className="text-sm text-muted-foreground">Let the AI analyze and improve the code currently in the editor based on the project's roadmap and style guides.</p>
          <Button onClick={handleRefactorCode} variant="secondary" disabled={!!isLoading} className="w-full">
            {isLoading === 'refactor' ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Refactor Current Code
          </Button>
        </div>
        
      </div>
    </div>
  );
}
