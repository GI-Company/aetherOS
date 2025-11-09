
"use client";

import Image from "next/image";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateImage } from "@/ai/flows/generate-image";
import { useToast } from "@/hooks/use-toast";
import { Layers, Loader2, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PixelStreamerApp() {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt) {
      toast({
        title: "Prompt is empty",
        description: "Please enter a description for the image you want to generate.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
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
      setIsLoading(false);
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
            disabled={isLoading}
            />
            <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? (
                    <Loader2 className="animate-spin" />
                ) : (
                    <Wand2 />
                )}
                Generate
            </Button>
        </div>
      </div>

      <Card className="flex-grow relative bg-background/50 overflow-hidden">
        <CardContent className="p-2 h-full">
            <div className="relative w-full h-full flex items-center justify-center rounded-md overflow-hidden bg-card/50">
             {isLoading ? (
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
