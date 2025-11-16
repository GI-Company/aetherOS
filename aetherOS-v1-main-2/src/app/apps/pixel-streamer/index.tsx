
"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Layers, Loader2, Wand2, Save } from "lucide-react";
import { useUser } from "@/firebase";
import { useAppAether } from "@/lib/use-app-aether";

export default function PixelStreamerApp() {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<"generate" | "save" | null>(null);
  const { toast } = useToast();
  const { publish, subscribe } = useAppAether();
  const { user } = useUser();

  const handleGenerate = () => {
    if (!prompt) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a description for the image you want to generate.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading("generate");
    setGeneratedImage(null);
    
    publish('ai:generate:image', { prompt });

    let resSub: (() => void) | undefined, errSub: (() => void) | undefined;
    
    const cleanup = () => {
        if (resSub) resSub();
        if (errSub) errSub();
    };

    const handleResponse = (payload: any) => {
      setGeneratedImage(payload.imageUrl);
      toast({
        title: "Image Generated!",
        description: "The Pixel Streamer engine has rendered your prompt."
      });
      setIsLoading(null);
      cleanup();
    };

    const handleError = (payload: any) => {
      console.error("Error generating image:", payload.error);
      toast({
        title: "Generation Failed",
        description: payload.error || "An error occurred while communicating with the image generation service.",
        variant: "destructive"
      });
      setIsLoading(null);
      cleanup();
    };

    resSub = subscribe('ai:generate:image:resp', handleResponse);
    errSub = subscribe('ai:generate:image:error', handleError);
  };

  const handleSaveImage = () => {
    if (!generatedImage || !user) {
      toast({ title: "No image to save or user not available.", variant: "destructive" });
      return;
    }

    toast({
        title: "Saving Image...",
        description: "Your new creation is being saved to your file system."
    });
    
    setIsLoading("save");

    const safePrompt = prompt.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);
    const fileName = `${safePrompt}_${Date.now()}.png`;
    const filePath = `users/${user.uid}/${fileName}`;
    
    const base64Content = generatedImage.split(',')[1];
    
    publish('vfs:write', { path: filePath, content: base64Content, encoding: 'base64' });

    let saveSub: (() => void) | undefined, errSub: (() => void) | undefined;

    const cleanup = () => {
        if (saveSub) saveSub();
        if (errSub) errSub();
    };

    const handleSaveResponse = (payload: any) => {
      if (payload.path === filePath) {
        toast({
          title: "Image Saved!",
          description: `${fileName} has been saved.`
        });
        setIsLoading(null);
        cleanup();
      }
    };
    
    const handleSaveError = (payload: any) => {
       toast({
        title: "Save Failed",
        description: payload.error || "Could not save the image.",
        variant: "destructive"
      });
      setIsLoading(null);
      cleanup();
    };

    saveSub = subscribe('vfs:write:result', handleSaveResponse);
    errSub = subscribe('vfs:write:error', handleSaveError);
  };


  return (
    <div className="h-full w-full flex flex-col p-4 gap-4 bg-background text-foreground">
       <CardHeader>
          <CardTitle className="flex items-center gap-2 font-bold text-lg font-headline">
              <Layers />
              Pixel Streamer Engine
          </CardTitle>
       </CardHeader>
      
      <div className="flex flex-col gap-2">
        <label htmlFor="image-prompt" className="text-sm font-medium">Generation Prompt</label>
        <div className="flex gap-2">
            <Input
            id="image-prompt"
            placeholder="e.g., 'A majestic dragon soaring over a mystical forest at dawn'"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={!!isLoading}
            />
            <Button onClick={handleGenerate} disabled={!!isLoading}>
                {isLoading === 'generate' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate
            </Button>
            {generatedImage && (
                <Button variant="outline" onClick={handleSaveImage} disabled={!!isLoading}>
                    {isLoading === 'save' ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Save className="mr-2 h-4 w-4" />
                    )}
                    Save to Files
                </Button>
            )}
        </div>
      </div>

      <Card className="flex-grow relative bg-background/50 overflow-hidden">
        <CardContent className="p-2 h-full">
            <div className="relative w-full h-full flex items-center justify-center rounded-md overflow-hidden bg-muted/50">
             {isLoading === 'generate' ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span>Rendering Pixels...</span>
                    </div>
                ) : generatedImage ? (
                    <Image
                        src={generatedImage}
                        alt={prompt}
                        fill
                        className="object-contain"
                    />
                ) : (
                    <div className="text-center text-muted-foreground p-4">
                        <Layers className="h-12 w-12 mx-auto mb-2" />
                        <p>Your generated image will appear here.</p>
                        <p className="text-xs">Describe what you want to see and click Generate.</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
