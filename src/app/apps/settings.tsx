
"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateAdaptivePalette } from "@/ai/flows/adaptive-color-palettes";
import { generateAccentColor } from "@/ai/flows/generate-accent-color";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Wand2, Loader2, Palette, Sparkles, User } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/use-theme";
import { useFirebase } from "@/firebase";
import AuthForm from "@/firebase/auth/auth-form";


export default function SettingsApp() {
  const [themePrompt, setThemePrompt] = useState("");
  const [accentPrompt, setAccentPrompt] = useState("");
  const [isLoading, setIsLoading] = useState<"theme" | "accent" | null>(null);
  const { toast } = useToast();
  const { applyTheme, setScheme } = useTheme();
  const { user } = useFirebase();

  const handleGenerateTheme = async () => {
    if (!themePrompt) {
      toast({title: "Error", description: "Please enter a content description.", variant: "destructive"});
      return;
    }
    setIsLoading("theme");
    try {
      const result = await generateAdaptivePalette({ contentDescription: themePrompt });
      applyTheme({ palette: result.palette });
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
      const accentForegroundColor = luma < 128 ? '#FFFFFF' : '#0B0D1A';

      applyTheme({ accent: { accentColor, accentForegroundColor } });

      toast({title: "Accent Color Applied!", description: "The new adaptive accent color has been set."});
    } catch(e) {
      console.error(e);
      toast({title: "Error", description: "Failed to generate accent color.", variant: "destructive"});
    } finally {
      setIsLoading(null);
    }
  }

  const renderAccountContent = () => {
    if (user?.isAnonymous) {
      return (
        <div className="text-center mt-8">
          <User className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">You are in Trial Mode</h3>
          <p className="text-sm text-muted-foreground mb-4">Sign in to create a permanent account and save your settings.</p>
          <AuthForm allowAnonymous={false} />
        </div>
      )
    }
    return <p className="text-muted-foreground">Manage your account details here.</p>;
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
                Describe the kind of theme you want, and let the AI generate it for you. This feature is disabled in trial mode.
              </p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme-prompt">Base Theme (Background/Text)</Label>
                  <Textarea 
                    id="theme-prompt" 
                    placeholder="e.g., 'A dark, modern theme with high contrast for coding', 'A light, airy theme for writing'..."
                    value={themePrompt}
                    onChange={(e) => setThemePrompt(e.target.value)}
                    disabled={!!isLoading || user?.isAnonymous}
                  />
                  <Button onClick={handleGenerateTheme} disabled={!!isLoading || user?.isAnonymous} className="w-full sm:w-auto">
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
                    disabled={!!isLoading || user?.isAnonymous}
                  />
                  <Button onClick={handleGenerateAccent} disabled={!!isLoading || user?.isAnonymous} className="w-full sm:w-auto">
                    {isLoading === 'accent' ? <Loader2 className="animate-spin" /> : <Sparkles />}
                    Generate Accent
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="account">
          {renderAccountContent()}
        </TabsContent>
        <TabsContent value="system">
          <p className="text-muted-foreground">System settings will be here.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
