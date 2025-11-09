
"use client";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { App, APPS } from "@/lib/apps";
import { File, Settings, Power, Wand2, Loader2, Layout } from "lucide-react";
import { proactiveOsAssistance } from "@/ai/flows/proactive-os-assistance";
import { useEffect, useState } from "react";
import { WindowInstance } from "./desktop";

type CommandPaletteProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onOpenApp: (app: App) => void;
    openApps: WindowInstance[];
    onArrangeWindows: () => void;
}

export default function CommandPalette({ open, setOpen, onOpenApp, openApps, onArrangeWindows }: CommandPaletteProps) {
  const settingsApp = APPS.find(app => app.id === 'settings');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

  useEffect(() => {
    if (open) {
      const getSuggestion = async () => {
        setIsLoadingSuggestion(true);
        try {
          const openAppNames = openApps.filter(a => !a.isMinimized).map(a => a.app.name).join(', ');
          const focusedApp = openApps.find(a => !a.isMinimized);
          
          const assistance = await proactiveOsAssistance({
              userActivity: focusedApp ? `Working in ${focusedApp.app.name}` : 'On the desktop',
              context: `Current open applications: ${openAppNames || 'None'}.`
          });
          
          if (assistance.suggestion) {
            setAiSuggestion(assistance.suggestion);
          } else {
            setAiSuggestion(null);
          }
        } catch (e) {
          console.error("Failed to get AI suggestion for command palette", e);
          setAiSuggestion(null);
        } finally {
          setIsLoadingSuggestion(false);
        }
      };
      getSuggestion();
    } else {
      // Reset when closed
      setAiSuggestion(null);
    }
  }, [open]);

  const handleOpenApp = (app: App) => {
    onOpenApp(app);
    setOpen(false);
  }

  const handleOpenSettings = () => {
    if (settingsApp) {
      onOpenApp(settingsApp);
    }
    setOpen(false);
  }
  
  const handleAiSuggestion = () => {
    if (aiSuggestion?.includes("Arrange windows")) {
        onArrangeWindows();
    }
    setOpen(false);
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {(isLoadingSuggestion || aiSuggestion) && (
            <CommandGroup heading="AI Suggestion">
                {isLoadingSuggestion ? (
                     <CommandItem disabled>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Thinking...</span>
                    </CommandItem>
                ) : aiSuggestion && (
                     <CommandItem onSelect={handleAiSuggestion}>
                        {aiSuggestion.includes("Arrange windows") ? <Layout className="mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        <span>{aiSuggestion}</span>
                    </CommandItem>
                )}
            </CommandGroup>
        )}

        <CommandGroup heading="Applications">
            {APPS.map(app => (
                 <CommandItem key={app.id} onSelect={() => handleOpenApp(app)}>
                    <app.Icon className="mr-2 h-4 w-4" />
                    <span>Open {app.name}</span>
                </CommandItem>
            ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="System">
          <CommandItem onSelect={() => setOpen(false)}>
            <File className="mr-2 h-4 w-4" />
            <span>New File</span>
          </CommandItem>
          <CommandItem onSelect={handleOpenSettings}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Open Settings</span>
          </CommandItem>
          <CommandItem onSelect={() => setOpen(false)}>
            <Power className="mr-2 h-4 w-4" />
            <span>Shutdown</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
