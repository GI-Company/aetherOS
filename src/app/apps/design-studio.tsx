
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { designByPromptUiGeneration } from "@/ai/flows/design-by-prompt-ui-generation";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Loader2, Copy } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

export default function DesignStudioApp() {
  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a description for the UI you want to generate.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    setGeneratedCode("");
    try {
      const result = await designByPromptUiGeneration({ prompt });
      // Clean up the code from markdown fences
      const cleanedCode = result.uiElementCode.replace(/```.*\n/g, '').replace(/```/g, '').trim();
      setGeneratedCode(cleanedCode);
    } catch (error) {
      console.error("Error generating UI:", error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while generating the UI component.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast({ title: "Copied to clipboard!" });
    }).catch(err => {
      toast({ title: "Failed to copy", description: "Could not copy code to clipboard.", variant: "destructive" });
    });
  };

  return (
    <div className="p-4 h-full flex flex-col gap-4">
      <h2 className="text-2xl font-headline">Design by Prompt</h2>
      <p className="text-sm text-muted-foreground -mt-2">
        Describe a UI component, and let the Aether-Architect generate the code for you.
      </p>
      
      <div className="flex flex-col gap-2">
        <Label htmlFor="design-prompt">Component Description</Label>
        <Textarea
          id="design-prompt"
          placeholder="e.g., 'A responsive card component with an image, title, description, and a call-to-action button'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-0"
        />
        <Button onClick={handleGenerate} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Wand2 className="mr-2 h-4 w-4" />
              Generate UI
            </>
          )}
        </Button>
      </div>

      <div className="flex-grow flex flex-col gap-2">
         <Label htmlFor="code-output">Generated Code</Label>
        <Card className="flex-grow relative bg-background/50">
          <CardContent className="p-0 h-full">
            <ScrollArea className="h-full">
              {generatedCode && (
                 <Button size="icon" variant="ghost" className="absolute top-2 right-2 z-10 h-7 w-7" onClick={copyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              )}
              <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                <code>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : generatedCode || "Your generated code will appear here."}
                </code>
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
