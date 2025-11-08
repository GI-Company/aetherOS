"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAdaptivePalette } from "@/ai/flows/adaptive-color-palettes";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Loader2 } from "lucide-react";

function hexToHsl(H: string): [number, number, number] | null {
  // Convert hex to RGB first
  let r: number = 0, g: number = 0, b: number = 0;
  if (H.length == 4) {
    r = parseInt("0x" + H[1] + H[1]);
    g = parseInt("0x" + H[2] + H[2]);
    b = parseInt("0x" + H[3] + H[3]);
  } else if (H.length == 7) {
    r = parseInt("0x" + H[1] + H[2]);
    g = parseInt("0x" + H[3] + H[4]);
    b = parseInt("0x" + H[5] + H[6]);
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  // Then to HSL
  r /= 255; g /= 255; b /= 255;
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0, s = 0, l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return [Math.round(h), Math.round(s), Math.round(l)];
}


export default function SettingsApp() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGeneratePalette = async () => {
    if (!prompt) {
      toast({title: "Error", description: "Please enter a content description.", variant: "destructive"});
      return;
    }
    setIsLoading(true);
    try {
      const result = await generateAdaptivePalette({ contentDescription: prompt });
      const { palette } = result;

      const newColors: Record<string, string> = {
        '--background': palette.backgroundColor,
        '--foreground': palette.textColor,
        '--card': palette.secondaryColor,
        '--primary': palette.primaryColor,
        '--accent': palette.accentColor,
        '--primary-foreground': palette.backgroundColor,
        '--card-foreground': palette.textColor,
        '--popover': palette.secondaryColor,
        '--popover-foreground': palette.textColor,
        '--secondary': palette.secondaryColor,
        '--secondary-foreground': palette.textColor,
        '--muted': palette.secondaryColor,
        '--muted-foreground': palette.textColor,
        '--accent-foreground': palette.backgroundColor,
        '--border': palette.primaryColor,
        '--input': palette.primaryColor,
        '--ring': palette.accentColor,
      };

      for (const [variable, hex] of Object.entries(newColors)) {
        const hsl = hexToHsl(hex);
        if (hsl) {
          document.documentElement.style.setProperty(variable, `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`);
        }
      }

      toast({title: "Palette Applied!", description: "The new adaptive color palette has been set."});
    } catch(e) {
      console.error(e);
      toast({title: "Error", description: "Failed to generate palette.", variant: "destructive"});
    } finally {
      setIsLoading(false);
    }
  };

  const setScheme = (scheme: 'light' | 'dark') => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(scheme);
  }

  return (
    <div className="p-4 h-full">
      <h2 className="text-2xl font-headline mb-4">Settings</h2>
      <Tabs defaultValue="appearance" className="w-full">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="system">System</TabsTrigger>
        </TabsList>
        <TabsContent value="appearance" className="mt-6">
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium mb-2">Theme</h3>
              <p className="text-sm text-muted-foreground mb-4">Select your preferred theme.</p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setScheme('light')}>Light</Button>
                <Button variant="outline" onClick={() => setScheme('dark')}>Dark</Button>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Adaptive Palette (AI)</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Describe the kind of content you're working on, and the AI will generate an adaptive color palette.
              </p>
              <div className="space-y-2">
                <Label htmlFor="adaptive-prompt">Content Description</Label>
                <Textarea 
                  id="adaptive-prompt" 
                  placeholder="e.g., 'Editing a vibrant nature documentary', 'Coding a minimalist text editor'..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <Button className="mt-4" onClick={handleGeneratePalette} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                Generate Palette
              </Button>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="account">
          <p className="text-muted-foreground">Account settings will be here.</p>
        </TabsContent>
        <TabsContent value="system">
          <p className="text-muted-foreground">System settings will be here.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
