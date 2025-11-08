"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { aiCodeGeneration } from "@/ai/flows/ai-code-generation";
import { useState }from "react";
import { Wand2, Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export default function CodeEditorApp() {
  const [code, setCode] = useState(`import { ai } from '@/ai/genkit';
import { z } from 'zod';

/**
 * Aether-Architect Core: Proactive OS Assistance
 * This flow provides proactive assistance based on user activity.
 */
export async function proactiveOsAssistance(input: ProactiveOsAssistanceInput): Promise<ProactiveOsAssistanceOutput> {
  const prompt = \`Based on user activity: \${input.activity}, suggest an action.\`;
  
  // AI call to be implemented
  
  return { suggestion: "Arrange windows side-by-side." };
}
`);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"generate" | "refactor" | null>(null);
  const { toast } = useToast();

  const handleGenerateCode = async () => {
    if (!prompt) {
      toast({ title: "Prompt is empty", description: "Please enter a prompt to generate code.", variant: "destructive" });
      return;
    }
    setIsLoading("generate");
    try {
      const result = await aiCodeGeneration({ description: prompt });
      setCode(currentCode => currentCode + "\n\n" + result.code);
      toast({ title: "Code Generated", description: "The new code has been appended to the editor." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate code.", variant: "destructive" });
    } finally {
      setIsLoading(null);
    }
  };

  const handleRefactorCode = async () => {
    if (!code) {
      toast({ title: "No code to refactor", description: "The editor is empty.", variant: "destructive" });
      return;
    }
    setIsLoading("refactor");
    try {
      const refactorPrompt = `Please refactor the following code. Keep the existing functionality but improve its structure, readability, and performance. Add comments where necessary to explain complex parts.\n\n---\n\n${code}`;
      const result = await aiCodeGeneration({ description: refactorPrompt });
      setCode(result.code);
      toast({ title: "Refactoring Complete", description: "The code has been updated." });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to refactor code.", variant: "destructive" });
    } finally {
      setIsLoading(null);
    }
  }


  return (
    <div className="flex h-full bg-background">
      <div className="w-2/3 flex flex-col">
        <div className="flex-shrink-0 p-2 border-b text-sm text-muted-foreground">
          File: /src/ai/flows/proactive-os-assistance.ts
        </div>
        <Textarea 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-grow w-full h-full rounded-none border-none resize-none focus-visible:ring-0 font-mono text-sm bg-card"
          placeholder="Start coding with Aether-Architect..."
        />
      </div>
      <div className="w-1/3 border-l p-4 flex flex-col gap-4">
        <h3 className="text-lg font-headline flex items-center gap-2"><Wand2 className="text-accent" /> Aether-Architect</h3>
        
        <div className="space-y-2">
          <Label htmlFor="code-prompt">Code Generation</Label>
          <Textarea 
            id="code-prompt" 
            placeholder="Describe the code to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px]"
          />
          <Button onClick={handleGenerateCode} disabled={!!isLoading} className="w-full">
            {isLoading === 'generate' ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate & Append
          </Button>
        </div>

        <Separator />
        
        <div className="space-y-2">
          <h4 className="font-medium">Intelligent Refactoring</h4>
          <p className="text-sm text-muted-foreground">Let the AI analyze and improve the code currently in the editor.</p>
          <Button onClick={handleRefactorCode} variant="secondary" disabled={!!isLoading} className="w-full">
            {isLoading === 'refactor' ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Refactor Current Code
          </Button>
        </div>
        
      </div>
    </div>
  );
}
