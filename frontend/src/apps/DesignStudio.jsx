"use client";

import { useState } from "react";
import { Button } from "../components/Button";
import { Textarea } from "../components/Textarea";
import { useAether } from '../lib/aether_sdk';
import { useToast } from "../hooks/useToast";
import { Wand2, Loader2, Copy } from "lucide-react";
import { ScrollArea } from "../components/ScrollArea";
import { Card, CardContent } from "../components/Card";

export default function DesignStudioApp() {
  const [prompt, setPrompt] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const aether = useAether();
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
    if (!aether) {
      toast({ title: "Aether client not available", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    setGeneratedCode("");

    aether.publish('ai:design:component', { description: prompt });

    const handleResponse = (env: any) => {
      // The payload is now the raw code string
      const cleanedCode = env.payload.replace(/```.*\n/g, '').replace(/```/g, '').trim();
      setGeneratedCode(cleanedCode);
      setIsLoading(false);
      aether.subscribe('ai:design:component:resp', handleResponse)(); // Unsubscribe
    };

    const handleError = (env: any) => {
      console.error("Error generating UI:", env.payload.error);
      toast({
        title: "Generation Failed",
        description: env.payload.error || "An error occurred while generating the UI component.",
        variant: "destructive"
      });
      setIsLoading(false);
      aether.subscribe('ai:design:component:error', handleError)(); // Unsubscribe
    };
    
    aether.subscribe('ai:design:component:resp', handleResponse);
    aether.subscribe('ai:design:component:error', handleError);
  };
  
  const copyToClipboard = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode).then(() => {
      toast({ title: "Copied to clipboard!" });
    }).catch(err => {
      toast({ title: "Failed to copy", description: "Could not copy code to clipboard.", variant: "destructive" });
    });
  };

  return (
    <div className="p-4 h-full flex flex-col gap-4 bg-gray-800 text-white">
      <h2 className="text-2xl font-bold">Design by Prompt</h2>
      <p className="text-sm text-gray-400 -mt-2">
        Describe a UI component, and let the Aether-Architect generate the code for you.
      </p>
      
      <div className="flex flex-col gap-2">
        <label htmlFor="design-prompt" className="text-sm font-medium">Component Description</label>
        <Textarea
          id="design-prompt"
          placeholder="e.g., 'A responsive card component with an image, title, description, and a call-to-action button'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="min-h-0 bg-gray-900 border-gray-600"
          disabled={isLoading}
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
         <label htmlFor="code-output" className="text-sm font-medium">Generated Code</label>
        <Card className="flex-grow relative bg-gray-900/50 border-gray-700">
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
                      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
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
