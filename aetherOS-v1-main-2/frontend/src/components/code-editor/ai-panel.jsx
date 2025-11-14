
"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { useAether } from "@/lib/aether_sdk_client";
import type { EditorFile } from "./editor-tabs";

interface AiPanelProps {
    activeFile: EditorFile | null;
    onCodeUpdate: (newCode: string) => void;
}

export default function AiPanel({ activeFile, onCodeUpdate }: AiPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"generate" | "refactor" | null>(null);
  const { toast } = useToast();
  const aether = useAether();

  const handleGenerateCode = async () => {
    if (!prompt) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a description for the code you want to generate.",
        variant: "destructive"
      });
      return;
    }
    if (!aether || !activeFile) {
      toast({ title: "No active file or Aether client not available", variant: "destructive" });
      return;
    }
    
    setIsLoading("generate");

    const fullPrompt = `The user wants to generate code for the file '${activeFile.name}'.\n\nTheir request is: '${prompt}'\n\nHere is the current content of the file to use as context:\n\n\`\`\`\n${activeFile.content}\n\`\`\``;

    aether.publish('ai:generate', fullPrompt);

    const handleResponse = (env: any) => {
      const cleanedCode = env.payload.replace(/```(?:\w+\n)?/g, '').replace(/```/g, '').trim();
      onCodeUpdate(cleanedCode);
      setIsLoading(null);
      aether.subscribe('ai:generate:resp', handleResponse)(); // Unsubscribe
    };

    const handleError = (env: any) => {
      console.error("Error generating code:", env.payload.error);
      toast({
        title: "Generation Failed",
        description: env.payload.error || "An error occurred while generating code.",
        variant: "destructive"
      });
      setIsLoading(null);
      aether.subscribe('ai:generate:error', handleError)(); // Unsubscribe
    };
    
    aether.subscribe('ai:generate:resp', handleResponse);
    aether.subscribe('ai:generate:error', handleError);
  };
  
  const handleRefactorCode = async () => {
    if (!activeFile || !aether) {
      toast({ title: "No active file or Aether client not available", variant: "destructive" });
      return;
    }
    setIsLoading("refactor");
    
    const refactorPrompt = `Refactor this code to improve its structure, readability, and performance. Keep the functionality the same.\n\nCode:\n${activeFile.content}`;
    
    aether.publish('ai:generate', refactorPrompt);

    const handleResponse = (env: any) => {
      const cleanedCode = env.payload.replace(/```(?:\w+\n)?/g, '').replace(/```/g, '').trim();
      onCodeUpdate(cleanedCode);
      setIsLoading(null);
      toast({ title: "Refactor Complete", description: "The AI has refactored your code." });
      aether.subscribe('ai:generate:resp', handleResponse)();
    };

    const handleError = (env: any) => {
      console.error("Error refactoring code:", env.payload.error);
      toast({
        title: "Refactor Failed",
        description: env.payload.error || "An error occurred during refactoring.",
        variant: "destructive"
      });
      setIsLoading(null);
      aether.subscribe('ai:generate:error', handleError)();
    };
    
    aether.subscribe('ai:generate:resp', handleResponse);
    aether.subscribe('ai:generate:error', handleError);
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
