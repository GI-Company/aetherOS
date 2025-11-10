
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
import { TOOLS, type ToolExecutionContext } from "@/lib/tools";
import { generateText } from "@/ai/flows/generate-text";


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
      const workflow = await agenticToolUser(searchValue);

      if (workflow.steps.length > 0) {
        let stepResult: any = {}; // Store results from steps to pass to the next
        
        const toolContext: ToolExecutionContext = {
            onOpenApp,
            onOpenFile,
            onArrangeWindows,
            setWallpaper,
        };
        
        for (const step of workflow.steps) {
            const tool = TOOLS[step.toolId];
            if (!tool) {
                throw new Error(`Tool with ID '${step.toolId}' not found.`);
            }

            let toolInput = {...step.inputs};
            
            // Result piping from previous step
            if (toolInput.imageUrl === '{{result.imageUrl}}' && stepResult.imageUrl) {
                 toolInput.imageUrl = stepResult.imageUrl;
            }
            if (toolInput.content === '{{result.code}}' && stepResult.code) {
                 toolInput.content = stepResult.code;
            }

            stepResult = await tool.execute(toolContext, toolInput);
        }
        setOpen(false); // Close palette after executing tools
      } else {
        // If no steps, it's a conversational response.
         const response = await generateText({prompt: searchValue });
         setAgentResponse(response.text);
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
