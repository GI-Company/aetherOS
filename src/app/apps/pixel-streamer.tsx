import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cpu, Layers, Rss } from "lucide-react";

export default function PixelStreamerApp() {
  const bgImage = PlaceHolderImages.find((img) => img.id === "pixel-streamer-bg");

  return (
    <div className="h-full w-full flex items-center justify-center p-4 relative overflow-hidden">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          data-ai-hint={bgImage.imageHint}
          fill
          quality={100}
          className="object-cover z-0 opacity-20 blur-sm"
        />
      )}
      <Card className="z-10 bg-card/70 backdrop-blur-lg max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers />
            Pixel Streamer Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            This is a simulation of the AetherOS foundational rendering engine. All graphical output is processed through this neural-enhanced pipeline.
          </p>
          <div className="flex justify-around text-center">
            <div className="flex flex-col items-center gap-1">
              <Cpu className="h-6 w-6 text-accent" />
              <span className="text-sm font-bold">Neural Core</span>
              <span className="text-xs text-muted-foreground">Active</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Rss className="h-6 w-6 text-accent" />
              <span className="text-sm font-bold">Stream Target</span>
              <span className="text-xs text-muted-foreground">Display 0</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
