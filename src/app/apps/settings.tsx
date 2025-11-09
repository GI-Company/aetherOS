"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAdaptivePalette } from "@/ai/flows/adaptive-color-palettes";
import { generateAccentColor } from "@/ai/flows/generate-accent-color";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Loader2, Palette, Sparkles } from "lucide-react";
import { Separator } from "@/components/ui/separator";

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

const applyHsl = (variable: string, hex: string) => {
  const hsl = hexToHsl(hex);
  if (hsl) {
    document.documentElement.style.setProperty(variable, `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`);
  }
}

export default function SettingsApp() {
  const [themePrompt, setThemePrompt] = useState("");
  const [accentPrompt, setAccentPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"theme" | "accent" | null>(null);
  const { toast } = useToast();

  const handleGenerateTheme = async () => {
    if (!themePrompt) {
      toast({title: "Error", description: "Please enter a content description.", variant: "destructive"});
      return;
    }
    setIsLoading("theme");
    try {
      const result = await generateAdaptivePalette({ contentDescription: themePrompt });
      const { palette } = result;

      applyHsl('--background', palette.backgroundColor);
      applyHsl('--foreground', palette.textColor);
      applyHsl('--card', palette.secondaryColor);
      applyHsl('--card-foreground', palette.textColor);
      applyHsl('--popover', palette.secondaryColor);
      applyHsl('--popover-foreground', palette.textColor);
      applyHsl('--secondary', palette.secondaryColor);
      applyHsl('--secondary-foreground', palette.textColor);
      applyHsl('--muted', palette.secondaryColor);
      applyHsl('--muted-foreground', palette.textColor);
      applyHsl('--border', palette.primaryColor);
      applyHsl('--input', palette.primaryColor);
      
      toast({title: "Base Theme Applied!", description: "The new adaptive base theme has been set."});
    } catch(e) {
      console.error(e);
      toast({title: "Error", description: "Failed to generate theme.", variant: "destructive"});
    } finally {
      setIsLoading(null);
    }
  };

  const handleGenerateAccent = async () => {
    if (!accentPrompt) {
      toast({title: "Error", description: "Please enter an accent description.", variant: "destructive"});
      return;
    }
    setIsLoading("accent");
    try {
      const result = await generateAccentColor({ description: accentPrompt });
      const { accentColor } = result;

      // We need to determine a good foreground color for the new accent.
      // A simple heuristic: if the color is dark, use a light foreground.
      const rgb = parseInt(accentColor.substring(1), 16);
      const r = (rgb >> 16) & 0xff;
      const g = (rgb >> 8) & 0xff;
      const b = (rgb >> 0) & 0xff;
      const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const accentForeground = luma < 128 ? '#FFFFFF' : '#0B0D1A';

      applyHsl('--primary', accentColor);
      applyHsl('--accent', accentColor);
      applyHsl('--ring', accentColor);
      applyHsl('--primary-foreground', accentForeground);
      applyHsl('--accent-foreground', accentForeground);


      toast({title: "Accent Color Applied!", description: "The new adaptive accent color has been set."});
    } catch(e) {
      console.error(e);
      toast({title: "Error", description: "Failed to generate accent color.", variant: "destructive"});
    } finally {
      setIsLoading(null);
    }
  }

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
              <h3 className="text-lg font-medium mb-2">Color Scheme</h3>
              <p className="text-sm text-muted-foreground mb-4">Select your preferred color scheme.</p>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => setScheme('light')}>Light</Button>
                <Button variant="outline" onClick={() => setScheme('dark')}>Dark</Button>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="text-lg font-medium mb-2">AI Theme Generation</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Describe the kind of theme you want, and let the AI generate it for you.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme-prompt">Base Theme (Background/Text)</Label>
                  <Textarea 
                    id="theme-prompt" 
                    placeholder="e.g., 'A dark, modern theme with high contrast for coding', 'A light, airy theme for writing'..."
                    value={themePrompt}
                    onChange={(e) => setThemePrompt(e.target.value)}
                  />
                  <Button onClick={handleGenerateTheme} disabled={!!isLoading} className="w-full sm:w-auto">
                    {isLoading === 'theme' ? <Loader2 className="animate-spin" /> : <Palette />}
                    Generate Base Theme
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accent-prompt">Accent Color</Label>
                  <Textarea 
                    id="accent-prompt" 
                    placeholder="e.g., 'A vibrant electric blue', 'A calming, soft lavender'..."
                    value={accentPrompt}
                    onChange={(e) => setAccentPrompt(e.target.value)}
                  />
                  <Button onClick={handleGenerateAccent} disabled={!!isLoading} className="w-full sm:w-auto">
                    {isLoading === 'accent' ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    Generate Accent
                  </Button>
                </div>
              </div>
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
