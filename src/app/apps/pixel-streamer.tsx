
"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateImage } from "@/ai/flows/generate-image";
import { useToast } from "@/hooks/use-toast";
import { Layers, Loader2, Wand2, Save } from "lucide-react";
import { useFirebase, useStorage, errorEmitter, FirestorePermissionError } from "@/firebase";
import { ref, uploadString, uploadBytes } from "firebase/storage";
import { osEvent } from "@/lib/events";

export default function PixelStreamerApp() {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<"generate" | "save" | null>(null);
  const { toast } = useToast();
  const { user } = useFirebase();
  const storage = useStorage();

  const handleGenerate = async () => {
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
    try {
      const result = await generateImage({ prompt });
      setGeneratedImage(result.imageUrl);
      toast({
        title: "Image Generated!",
        description: "The Pixel Streamer engine has rendered your prompt."
      })
    } catch (error) {
      console.error("Error generating image:", error);
      toast({
        title: "Generation Failed",
        description: "An error occurred while communicating with the image generation service.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(null);
    }
  };

  const handleSaveImage = async () => {
    if (!generatedImage || !user || !storage) {
      toast({ title: "No image to save or user not logged in.", variant: "destructive" });
      return;
    }

    toast({
        title: "Saving Image...",
        description: "Your new creation is being saved to the File Explorer."
    });
    
    setIsLoading("save");

    try {
      // Create a filename from the prompt
      const safePrompt = prompt.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 50);
      const fileName = `${safePrompt}_${Date.now()}.png`;
      const filePath = `users/${user.uid}/${fileName}`;

      // Convert data URI to Blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      
      const storageRef = ref(storage, filePath);
      
      uploadBytes(storageRef, blob)
        .then(() => {
           toast({
            title: "Image Saved!",
            description: `${fileName} has been saved to your File Explorer.`
          });
          osEvent.emit('file-system-change', undefined);
        })
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: storageRef.fullPath,
            operation: 'write',
            requestResourceData: '(image data)',
          });
          errorEmitter.emit('permission-error', permissionError);
        }).finally(() => {
            setIsLoading(null);
        });

    } catch (error) {
        console.error("Error preparing image for save:", error);
        toast({
            title: "Save Failed",
            description: "An unexpected error occurred while preparing the image.",
            variant: "destructive"
        });
        setIsLoading(null);
    }
  };


  return (
    <div className="h-full w-full flex flex-col p-4 gap-4">
       <CardTitle className="flex items-center gap-2 font-headline">
          <Layers />
          Pixel Streamer Engine
      </CardTitle>
      
      <div className="flex flex-col gap-2">
        <Label htmlFor="image-prompt">Generation Prompt</Label>
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
            <div className="relative w-full h-full flex items-center justify-center rounded-md overflow-hidden bg-card/50">
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
