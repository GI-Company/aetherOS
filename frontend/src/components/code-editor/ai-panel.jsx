
"use client";

import { Button } from "../Button";
import { Textarea } from "../Textarea";
import { useState } from "react";
import { Wand2, Loader2 } from "lucide-react";
import { useToast } from "../../hooks/useToast";
import { Separator } from "../Separator";
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
    toast({ title: "AI Code Generation Not Implemented", description: "This feature will be connected to an AI flow soon."})
  };

  const handleRefactorCode = async () => {
     toast({ title: "AI Refactoring Not Implemented", description: "This feature will be connected to an AI flow soon."})
  }

  return (
      <div className="p-4 flex flex-col gap-4 h-full bg-gray-800 text-white">
        <h3 className="text-lg font-bold flex items-center gap-2"><Wand2 className="text-blue-400" /> Aether-Architect</h3>
        
        <div className="space-y-2">
          <label htmlFor="code-prompt" className="text-sm font-medium">Code Generation</label>
          <Textarea 
            id="code-prompt" 
            placeholder="Describe the code to generate for the active file..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] flex-grow bg-gray-900 border-gray-600"
            disabled={!!isLoading || !activeFile}
          />
          <Button onClick={handleGenerateCode} disabled={!!isLoading || !activeFile} className="w-full">
            {isLoading === 'generate' ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Generate & Replace
          </Button>
        </div>

        <Separator className="bg-gray-600" />
        
        <div className="space-y-2">
          <h4 className="font-medium">Intelligent Refactoring</h4>
          <p className="text-sm text-gray-400">Let the AI analyze and improve the code currently in the active editor.</p>
          <Button onClick={handleRefactorCode} variant="secondary" disabled={!!isLoading || !activeFile} className="w-full">
            {isLoading === 'refactor' ? <Loader2 className="animate-spin" /> : <Wand2 />}
            Refactor Current Code
          </Button>
        </div>
      </div>
  );
}
