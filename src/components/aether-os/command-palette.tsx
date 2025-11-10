
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
import { Settings, Power, Layout, Command, BrainCircuit, Loader2, File, Folder } from "lucide-react";
import { agenticToolUser } from "@/ai/flows/agenticToolUser";
import React, { useEffect, useState, useCallback } from "react";
import { WindowInstance } from "./desktop";
import { getStorage, ref, listAll } from "firebase/storage";
import { useFirebase } from "@/firebase";


type CommandPaletteProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onOpenApp: (app: App, props?: Record<string, any>) => void;
    openApps: WindowInstance[];
    onArrangeWindows: () => void;
    onOpenFile: (filePath: string, content?: string) => void;
    setWallpaper: (imageUrl: string) => void;
}

export default function CommandPalette({ open, setOpen, onOpenApp, openApps, onArrangeWindows, onOpenFile, setWallpaper }: CommandPaletteProps) {
  const settingsApp = APPS.find(app => app.id === 'settings');
  const [searchValue, setSearchValue] = useState("");
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useFirebase();

  const handleValueChange = (value: string) => {
    setSearchValue(value);
    if (agentResponse) {
      setAgentResponse(null);
    }
  }

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
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue || !user) return;
    
    setIsLoading(true);
    setAgentResponse(null);

    try {
      const result = await agenticToolUser(searchValue);

      if (result.isWorkflow && result.dispatchedEvents) {
        // The flow executed a workflow, now dispatch the client-side events.
        for (const event of result.dispatchedEvents) {
            switch(event.dispatchedEvent) {
                case 'openApp':
                    const appToOpen = APPS.find(a => a.id === event.payload.appId);
                    if (appToOpen) onOpenApp(appToOpen, event.payload.props);
                    break;
                case 'arrangeWindows':
                    onArrangeWindows();
                    break;
                case 'openFile':
                    onOpenFile(event.payload.filePath, event.payload.content);
                    break;
                case 'setWallpaper':
                    setWallpaper(event.payload.imageUrl);
                    break;
                // Add other event handlers here as tools evolve
            }
        }
        setOpen(false); // Close palette after executing tools
      } else if (result.conversationalResponse) {
        // The flow returned a conversational response.
         setAgentResponse(result.conversationalResponse);
      }

    } catch (err: any) {
      console.error("Agentic tool user failed:", err);
      setAgentResponse(err.message || "Sorry, I encountered an error.");
    } finally {
      setIsLoading(false);
    }
  }, [searchValue, onOpenApp, setOpen, onArrangeWindows, user, onOpenFile, setWallpaper]);

  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setAgentResponse(null);
      setIsLoading(false);
    }
  }, [open]);

  const filteredApps = APPS.filter(app => 
      !searchValue || app.name.toLowerCase().includes(searchValue.toLowerCase())
  );

  const renderContent = () => {
    if(isLoading) {
        return (
            <div className="flex justify-center items-center p-4">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                <span>Aether is thinking...</span>
            </div>
        );
    }

    if (agentResponse) {
        return <div className="p-4 text-sm text-center">{agentResponse}</div>;
    }

    if (searchValue && filteredApps.length === 0) {
        return <CommandEmpty>No results found. Press Enter to ask AI.</CommandEmpty>
    }

    return (
        <>
            {searchValue && filteredApps.length > 0 ? (
                <CommandGroup heading="Apps">
                    {filteredApps.map(app => (
                        <CommandItem key={app.id} onSelect={() => handleOpenApp(app)}>
                            <app.Icon className="mr-2 h-4 w-4" />
                            <span>{app.name}</span>
                        </CommandItem>
                    ))}
                </CommandGroup>
            ) : !searchValue ? (
                <CommandGroup heading="Suggestions">
                <CommandItem onSelect={() => {setSearchValue("Arrange windows for coding"); handleSubmit(new Event('submit') as any);}}>
                    <Layout className="mr-2 h-4 w-4" />
                    <span>Arrange windows for coding</span>
                </CommandItem>
                 <CommandItem onSelect={() => {setSearchValue("find my auth form component"); handleSubmit(new Event('submit') as any);}}>
                  <File className="mr-2 h-4 w-4" />
                  <span>Find a file...</span>
                </CommandItem>
                 <CommandItem onSelect={() => {setSearchValue("Design a login form and save it to src/components/login-form.tsx"); handleSubmit(new Event('submit') as any);}}>
                  <BrainCircuit className="mr-2 h-4 w-4" />
                  <span>Design a component...</span>
                </CommandItem>
                <CommandItem onSelect={handleOpenSettings}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Open Settings</span>
                </CommandItem>
                </CommandGroup>
            ) : null}

            { (filteredApps.length > 0 || !searchValue) && <CommandSeparator /> }
            
            <CommandGroup heading="System">
            <CommandItem onSelect={() => { onArrangeWindows(); setOpen(false); }}>
                <Layout className="mr-2 h-4 w-4" />
                <span>Arrange Windows</span>
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
                <Power className="mr-2 h-4 w-4" />
                <span>Shutdown</span>
            </CommandItem>
            </CommandGroup>
        </>
    );
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <form onSubmit={handleSubmit}>
        <CommandInput 
          placeholder="Ask AI or search apps & files..." 
          value={searchValue}
          onValueChange={handleValueChange}
          disabled={isLoading}
        />
      </form>
      <CommandList>
        {renderContent()}
      </CommandList>
    </CommandDialog>
  );
}
