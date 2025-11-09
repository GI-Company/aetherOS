
"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { aiCodeGeneration } from "@/ai/flows/ai-code-generation";
import { useState }from "react";
import { Wand2, Sparkles, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const initialCode = `'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing proactive OS assistance based on user activity and context.
 *
 * - proactiveOsAssistance - A function that triggers the proactive assistance flow.
 * - ProactiveOsAssistanceInput - The input type for the proactiveOsAssistance function.
 * - ProactiveOsAssistanceOutput - The return type for the proactiveOsAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProactiveOsAssistanceInputSchema = z.object({
  userActivity: z.string().describe('A description of the user\\'s current activity.'),
  context: z.string().describe('Additional context about the user\\'s environment and tasks.'),
});
export type ProactiveOsAssistanceInput = z.infer<typeof ProactiveOsAssistanceInputSchema>;

const ProactiveOsAssistanceOutputSchema = z.object({
  suggestion: z.string().describe('A proactive, short, and actionable suggestion for the user. Should be empty if no suggestion is relevant.'),
  reason: z.string().describe('The reasoning behind the suggestion.'),
});
export type ProactiveOsAssistanceOutput = z.infer<typeof ProactiveOsAssistanceOutputSchema>;

export async function proactiveOsAssistance(input: ProactiveOsAssistanceInput): Promise<ProactiveOsAssistanceOutput> {
  return proactiveOsAssistanceFlow(input);
}

const proactiveOsAssistancePrompt = ai.definePrompt({
  name: 'proactiveOsAssistancePrompt',
  input: {schema: ProactiveOsAssistanceInputSchema},
  output: {schema: ProactiveOsAssistanceOutputSchema},
  prompt: \`You are the core intelligence of the AetherOS, responsible for proactively assisting the user.
  Based on the user's current activity and context, provide a single, actionable suggestion.
  The suggestion should be concise and helpful. If no clear, high-value suggestion is available, return an empty string for the suggestion.

  Examples:
  - If user is in Code Editor and Browser is also open, suggest: "Arrange windows side-by-side for a better workflow?"
  - If user is in Design Studio, suggest: "Need some inspiration? I can generate a new color palette."
  - If many apps are open, suggest: "Feeling cluttered? I can close all background apps."

  Current State:
  Activity: {{{userActivity}}}
  Context: {{{context}}}
  
  Your response should be based on the provided activity and context.\`,
});

const proactiveOsAssistanceFlow = ai.defineFlow(
  {
    name: 'proactiveOsAssistanceFlow',
    inputSchema: ProactiveOsAssistanceInputSchema,
    outputSchema: ProactiveOsAssistanceOutputSchema,
  },
  async input => {
    const {output} = await proactiveOsAssistancePrompt(input);
    return output!;
  }
);
`;

export default function CodeEditorApp() {
  const [code, setCode] = useState(initialCode);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"generate" | "refactor" | null>(null);
  const { toast } = useToast();
  const filePath = "/src/ai/flows/proactive-os-assistance.ts";

  const handleGenerateCode = async () => {
    if (!prompt) {
      toast({ title: "Prompt is empty", description: "Please enter a prompt to generate code.", variant: "destructive" });
      return;
    }
    setIsLoading("generate");
    try {
      const fullPrompt = `File Path: ${filePath}\n\nTask: ${prompt}\n\n---\n\nGenerate the complete code for the file based on the task.`;
      const result = await aiCodeGeneration({ description: fullPrompt });
      setCode(result.code);
      toast({ title: "Code Generated", description: `The code in ${filePath} has been updated.` });
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
      const refactorPrompt = `File Path: ${filePath}\n\nPlease refactor the following code. Keep the existing functionality but improve its structure, readability, and performance. Add comments where necessary to explain complex parts.\n\n---\n\n${code}`;
      const result = await aiCodeGeneration({ description: refactorPrompt });
      setCode(result.code);
      toast({ title: "Refactoring Complete", description: `The code in ${filePath} has been updated.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to refactor code.", variant: "destructive" });
    } finally {
      setIsLoading(null);
    }
  }

  const handleSave = () => {
    toast({
      title: "File Saved",
      description: `${filePath} has been saved.`,
    });
  }


  return (
    <div className="flex h-full bg-background flex-col md:flex-row">
      <div className="flex-grow flex flex-col md:w-2/3">
        <div className="flex-shrink-0 p-2 border-b text-sm text-muted-foreground flex justify-between items-center">
          <span>File: {filePath}</span>
          <Button variant="ghost" size="sm" onClick={handleSave} disabled={!!isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
        </div>
        <Textarea 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="flex-grow w-full h-full rounded-none border-none resize-none focus-visible:ring-0 font-mono text-sm bg-card"
          placeholder="Start coding with Aether-Architect..."
          disabled={!!isLoading}
        />
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
