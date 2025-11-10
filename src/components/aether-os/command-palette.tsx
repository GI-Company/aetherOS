
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
import { FileItem as FileItemType } from "@/lib/types";
import { semanticFileSearch } from "@/ai/flows/semantic-file-search";
import { generateImage } from "@/ai/flows/generate-image";
import { designByPromptUiGeneration } from "@/ai/flows/design-by-prompt-ui-generation";

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
  const [fileSearchResults, setFileSearchResults] = useState<FileItemType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useFirebase();

  const handleValueChange = (value: string) => {
    setSearchValue(value);
    if (agentResponse) {
      setAgentResponse(null);
    }
    if (fileSearchResults.length > 0) {
        setFileSearchResults([]);
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

  const handleOpenFile = (path: string) => {
      onOpenFile(path);
      setOpen(false);
  }
  
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchValue || !user) return;
    
    setIsLoading(true);
    setAgentResponse(null);
    setFileSearchResults([]);

    try {
      const storage = getStorage();
      const basePath = `users/${user.uid}`;
      const listRef = ref(storage, basePath);
      const res = await listAll(listRef);
      const allFiles = res.items.map(item => item.fullPath);

      const openAppNames = openApps.map(a => a.app.name);
      
      const workflow = await agenticToolUser(searchValue, {
          openApps: openAppNames,
          allFiles: allFiles,
      });

      if (workflow.steps.length > 0) {
        let stepResult: any = {}; // Store results from steps to pass to the next
        for (const step of workflow.steps) {
            let toolInput = {...step.inputs};
            // Allow chaining results. e.g. use `imageUrl` from `generateImage` in `setWallpaper`
            if (toolInput.imageUrl === '{{result.imageUrl}}') toolInput.imageUrl = stepResult.imageUrl;
            if (toolInput.content === '{{result.code}}') toolInput.content = stepResult.code;
            if (toolInput.filePath === '{{result.filePath}}' && stepResult.filePath) toolInput.filePath = stepResult.filePath;
            else if (toolInput.filePath === '{{result.filePath}}' && stepResult.results?.[0]?.path) toolInput.filePath = stepResult.results[0].path;


            switch(step.toolId) {
                case 'openApp': onOpenApp(APPS.find(a => a.id === toolInput.appId)!, toolInput.props); break;
                case 'arrangeWindows': onArrangeWindows(); break;
                case 'openFile': onOpenFile(toolInput.filePath); break;
                case 'searchFiles': 
                    stepResult = await semanticFileSearch({query: toolInput.query, availableFiles: allFiles}); 
                    break;
                case 'setWallpaper': setWallpaper(toolInput.imageUrl); break;
                case 'writeFile': onOpenFile(toolInput.filePath, toolInput.content); break;
                case 'generateImage': stepResult = await generateImage({prompt: toolInput.prompt}); break;
                case 'designComponent': 
                    const result = await designByPromptUiGeneration({ prompt: toolInput.prompt });
                    stepResult = { code: result.uiElementCode.replace(/```.*\n/g, '').replace(/```/g, '').trim() };
                    break;
            }
        }
      } else {
        // If no steps, it's a conversational response. We can call the model again without tools for a text response.
         const response = await ai.generate({ prompt: searchValue });
         setAgentResponse(response.text());
      }
      
      // Close palette unless we have something to show the user here.
      if (!agentResponse) {
          setOpen(false);
      }

    } catch (err) {
      console.error("Agentic tool user failed:", err);
      setAgentResponse("Sorry, I encountered an error.");
    } finally {
      setIsLoading(false);
    }
  }, [searchValue, openApps, onOpenApp, setOpen, onArrangeWindows, user, onOpenFile, setWallpaper, agentResponse]);

  useEffect(() => {
    if (!open) {
      setSearchValue("");
      setAgentResponse(null);
      setFileSearchResults([]);
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
    
    if (fileSearchResults.length > 0) {
        return (
            <CommandGroup heading="Found Items">
                {fileSearchResults.map(item => (
                     <CommandItem key={item.path} onSelect={() => handleOpenFile(item.path)}>
                        {item.type === 'folder' ? <Folder className="mr-2 h-4 w-4" /> : <File className="mr-2 h-4 w-4" />}
                        <span>{item.path.split('/').pop()}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{item.path.replace(`users/${user?.uid}/`, '~/')}</span>
                    </CommandItem>
                ))}
            </CommandGroup>
        )
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
                 <CommandItem onSelect={() => {setSearchValue("find my auth form component and open it"); handleSubmit(new Event('submit') as any);}}>
                  <File className="mr-2 h-4 w-4" />
                  <span>Find and open a file...</span>
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
