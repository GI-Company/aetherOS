
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { EditorFile } from "./editor-tabs";
import { useAppAether } from "../../../lib/use-app-aether";

interface AiPanelProps {
    activeFile: EditorFile | null;
    onCodeUpdate: (newCode: string) => void;
}

export default function AiPanel({ activeFile, onCodeUpdate }: AiPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"generate" | "refactor" | null>(null);
  const { toast } = useToast();
  const { publish, subscribe } = useAppAether();

  const handleGenerateCode = () => {
    if (!prompt) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a description for the code you want to generate.",
        variant: "destructive"
      });
      return;
    }
    if (!activeFile) {
      toast({ title: "No active file", variant: "destructive" });
      return;
    }
    
    setIsLoading("generate");

    publish('ai:generate', { prompt: `Given the existing code:\n\n${activeFile.content}\n\nGenerate new code based on this request: ${prompt}` });
    
    let resSub: (() => void) | undefined, errSub: (() => void) | undefined;
    
    const cleanup = () => {
        if (resSub) resSub();
        if (errSub) errSub();
    };

    const handleResponse = (payload: any) => {
      const cleanedCode = payload.replace(/```(?:\w+\n)?/g, '').replace(/```/g, '').trim();
      onCodeUpdate(cleanedCode);
      setIsLoading(null);
      cleanup();
    };

    const handleError = (payload: any) => {
      console.error("Error generating code:", payload.error);
      toast({
        title: "Generation Failed",
        description: payload.error || "An error occurred while generating code.",
        variant: "destructive"
      });
      setIsLoading(null);
      cleanup();
    };
    
    resSub = subscribe('ai:generate:resp', handleResponse);
    errSub = subscribe('ai:generate:error', handleError);
  };
  
  const handleRefactorCode = () => {
    if (!activeFile) {
      toast({ title: "No active file", variant: "destructive" });
      return;
    }
    setIsLoading("refactor");
    
    const refactorPrompt = `Refactor this code to improve its structure, readability, and performance. Keep the functionality the same.\n\nCode:\n${activeFile.content}`;
    
    publish('ai:generate', { prompt: refactorPrompt });
    
    let resSub: (() => void) | undefined, errSub: (() => void) | undefined;

    const cleanup = () => {
        if (resSub) resSub();
        if (errSub) errSub();
    };

    const handleResponse = (payload: any) => {
      const cleanedCode = payload.replace(/```(?:\w+\n)?/g, '').replace(/```/g, '').trim();
      onCodeUpdate(cleanedCode);
      setIsLoading(null);
      cleanup();
    };

    const handleError = (payload: any) => {
      console.error("Error refactoring code:", payload.error);
      toast({
        title: "Refactor Failed",
        description: payload.error || "An error occurred during refactoring.",
        variant: "destructive"
      });
      setIsLoading(null);
      cleanup();
    };
    
    resSub = subscribe('ai:generate:resp', handleResponse);
    errSub = subscribe('ai:generate:error', handleError);
  };

  return (
      <div className="p-4 flex flex-col gap-4 h-full bg-card text-foreground">
        <h3 className="text-lg font-bold flex items-center gap-2 font-headline"><Wand2 className="text-accent" /> Aether-Architect</h3>
        
        <div className="space-y-2">
          <label htmlFor="code-prompt" className="text-sm font-medium">Code Generation</label>
          <Textarea 
            id="code-prompt" 
            placeholder="Describe the code to generate for the active file..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] flex-grow"
            disabled={!!isLoading || !activeFile}
          />
          <Button onClick={handleGenerateCode} disabled={!!isLoading || !activeFile} className="w-full">
            {isLoading === 'generate' ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4"/>}
            Generate & Replace
          </Button>
        </div>

        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-medium">Intelligent Refactoring</h4>
          <p className="text-sm text-muted-foreground">Let the AI analyze and improve the code currently in the active editor.</p>
          <Button onClick={handleRefactorCode} variant="secondary" disabled={!!isLoading || !activeFile} className="w-full">
            {isLoading === 'refactor' ? <Loader2 className="animate-spin mr-2" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Refactor Current Code
          </Button>
        </div>
      </div>
  );
}
