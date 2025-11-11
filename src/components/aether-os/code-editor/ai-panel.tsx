
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { aiCodeGeneration } from "@/ai/flows/ai-code-generation";
import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import type { EditorFile } from "./editor-tabs";

interface AiPanelProps {
    activeFile: EditorFile | null;
    onCodeUpdate: (newCode: string) => void;
}

export default function AiPanel({ activeFile, onCodeUpdate }: AiPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"generate" | "refactor" | null>(null);
  const { toast } = useToast();

  const cleanCode = (rawCode: string) => {
    return rawCode.replace(/^```(?:\w+\n)?/, '').replace(/```$/, '').trim();
  }

  const handleGenerateCode = async () => {
    if (!prompt) {
      toast({ title: "Prompt is empty", description: "Please enter a prompt to generate code.", variant: "destructive" });
      return;
    }
     if (!activeFile) {
      toast({ title: "No active file", description: "Please open a file to generate code into.", variant: "destructive" });
      return;
    }
    setIsLoading("generate");
    try {
      const fullPrompt = `File Path: ${activeFile.path}\n\nTask: ${prompt}\n\n---\n\nGenerate the complete code for the file based on the task. Ensure the output is a single, complete file content without any extra explanations.`;
      const result = await aiCodeGeneration({ description: fullPrompt });
      const newCode = cleanCode(result.code);
      onCodeUpdate(newCode);
      toast({ title: "Code Generated", description: `The code in ${activeFile.path} has been updated.` });
    } catch(e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive"});
    } finally {
      setIsLoading(null);
    }
  };

  const handleRefactorCode = async () => {
    if (!activeFile || !activeFile.content) {
      toast({ title: "No code to refactor", description: "The editor is empty.", variant: "destructive" });
      return;
    }
    setIsLoading("refactor");
    try {
      const response = await fetch('/docs/ROADMAP.md');
      const styleGuide = await response.text();

      const refactorPrompt = `
        File Path: ${activeFile.path}
        
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
        ${activeFile.content}
      `;
      const result = await aiCodeGeneration({ description: refactorPrompt });
      const newCode = cleanCode(result.code);
      onCodeUpdate(newCode);
      toast({ title: "Refactoring Complete", description: `The code in ${activeFile.path} has been updated based on the project's architectural goals.` });
    } catch(e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive"});
    } finally {
      setIsLoading(null);
    }
  }

  return (
      <div className="p-4 flex flex-col gap-4 h-full">
        <h3 className="text-lg font-headline flex items-center gap-2"><Wand2 className="text-accent" /> Aether-Architect</h3>
        
        <div className="space-y-2">
          <Label htmlFor="code-prompt">Code Generation</Label>
          <Textarea 
            id="code-prompt" 
            placeholder="Describe the code to generate for the active file..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] flex-grow"
            disabled={!!isLoading || !activeFile}
          />
          <Button onClick={handleGenerateCode} disabled={!!isLoading || !activeFile} className="w-full">
            {isLoading === 'generate' ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Generate & Replace
          </Button>
        </div>

        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-medium">Intelligent Refactoring</h4>
          <p className="text-sm text-muted-foreground">Let the AI analyze and improve the code currently in the active editor based on the project's roadmap.</p>
          <Button onClick={handleRefactorCode} variant="secondary" disabled={!!isLoading || !activeFile} className="w-full">
            {isLoading === 'refactor' ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Refactor Current Code
          </Button>
        </div>
      </div>
  );
}

    