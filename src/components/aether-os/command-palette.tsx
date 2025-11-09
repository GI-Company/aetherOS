
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
import { Settings, Power, Layout, Command, BrainCircuit, Loader2 } from "lucide-react";
import { agenticToolUser } from "@/ai/flows/agenticToolUser";
import React, { useEffect, useState, useCallback } from "react";
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
  const [searchValue, setSearchValue] = useState("");
  const [agentResponse, setAgentResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    if (!searchValue) return;
    
    setIsLoading(true);
    setAgentResponse(null);

    try {
      const openAppNames = openApps.map(a => a.app.name);
      const response = await agenticToolUser(searchValue, openAppNames);

      const toolCalls = response.toolCalls();

      if (toolCalls.length > 0) {
         let shouldClose = true;
        for (const toolCall of toolCalls) {
          if (toolCall.toolName === 'openApp') {
            const appId = (toolCall.input as any).appId;
            const appToOpen = APPS.find(a => a.id === appId);
            if (appToOpen) {
              onOpenApp(appToOpen);
            }
          } else {
            // If another tool was called, we might want to see the text response.
            shouldClose = false;
          }
        }
        
        const textResponse = response.text();
        if (textResponse) {
            setAgentResponse(textResponse);
            shouldClose = false;
        }

        if (shouldClose) {
          setOpen(false);
        }

      } else {
        const textResponse = response.text();
        setAgentResponse(textResponse);
      }
    } catch (err) {
      console.error("Agentic tool user failed:", err);
      setAgentResponse("Sorry, I encountered an error.");
    } finally {
      setIsLoading(false);
    }
  }, [searchValue, openApps, onOpenApp, setOpen]);

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <form onSubmit={handleSubmit}>
        <CommandInput 
          placeholder="Ask AI or search apps..." 
          value={searchValue}
          onValueChange={handleValueChange}
        />
      </form>
      <CommandList>
        <CommandEmpty>
            {isLoading ? (
                <div className="flex justify-center items-center p-4">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Aether is thinking...</span>
                </div>
            ) : agentResponse ? (
                <div className="p-4 text-sm text-center">{agentResponse}</div>
            ) : (
                "No results found. Press Enter to ask AI."
            )}
        </CommandEmpty>
        
        {!isLoading && !agentResponse && (
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
                    <CommandItem onSelect={() => {setSearchValue("Open the code editor"); handleSubmit(new Event('submit') as any);}}>
                      <Command className="mr-2 h-4 w-4" />
                      <span>Open the code editor</span>
                    </CommandItem>
                     <CommandItem onSelect={() => {setSearchValue("What applications are running?"); handleSubmit(new Event('submit') as any);}}>
                      <BrainCircuit className="mr-2 h-4 w-4" />
                      <span>What applications are running?</span>
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
        )}
        
      </CommandList>
    </CommandDialog>
  );
}
