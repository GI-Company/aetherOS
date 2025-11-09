

"use client";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { aiCodeGeneration } from "@/ai/flows/ai-code-generation";
import { useState, useEffect }from "react";
import { Wand2, Sparkles, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

interface CodeEditorAppProps {
  filePath?: string;
  initialContent?: string;
}

export default function CodeEditorApp({ filePath: initialFilePath, initialContent = '' }: CodeEditorAppProps) {
  const [filePath, setFilePath] = useState(initialFilePath || '/untitled');
  const [code, setCode] = useState(initialContent);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"generate" | "refactor" | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    if (initialFilePath) {
      setFilePath(initialFilePath);
    }
  }, [initialFilePath]);

  useEffect(() => {
    setCode(initialContent);
  }, [initialContent]);


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
      const fullPrompt = `File Path: ${filePath}\n\nTask: ${prompt}\n\n---\n\nGenerate the complete code for the file based on the task.`;
      const result = await aiCodeGeneration({ description: fullPrompt });
      setCode(cleanCode(result.code));
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
      setCode(cleanCode(result.code));
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
      description: `${filePath} has been saved. (This is a simulation)`,
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
          placeholder="Start coding with Aether-Architect... Open a file from the File Explorer to begin."
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
