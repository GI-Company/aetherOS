
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

type CommandPaletteProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onOpenApp: (app: App, props?: Record<string, any>) => void;
    openApps: WindowInstance[];
    onArrangeWindows: () => void;
    onOpenFile: (filePath: string) => void;
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
      // Fetch all files to provide context to the agent
      const storage = getStorage();
      const basePath = `users/${user.uid}`;
      // In a real large-scale app, you'd want a more efficient way to get all file paths
      // like a periodically updated index in Firestore. For now, listAll is fine.
      const listRef = ref(storage, basePath);
      const res = await listAll(listRef);
      const allFiles = res.items.map(item => item.fullPath);

      const openAppNames = openApps.map(a => a.app.name);
      
      const response = await agenticToolUser(searchValue, {
          openApps: openAppNames,
          allFiles: allFiles,
      });

      const toolCalls = response.toolCalls();
      let shouldClose = true;

      if (toolCalls.length > 0) {
        for (const toolCall of toolCalls) {
          switch (toolCall.toolName) {
            case 'openApp':
                const appId = (toolCall.input as any).appId;
                const props = (toolCall.input as any).props;
                const appToOpen = APPS.find(a => a.id === appId);
                if (appToOpen) {
                  onOpenApp(appToOpen, props);
                }
                break;
            case 'arrangeWindows':
                onArrangeWindows();
                break;
            case 'openFile':
                const filePath = (toolCall.input as any).filePath;
                if(filePath) {
                    onOpenFile(filePath);
                }
                break;
            case 'searchFiles':
                const searchResults = (toolCall.output as any).results;
                if(searchResults && searchResults.length > 0) {
                    setFileSearchResults(searchResults);
                    shouldClose = false; // Keep palette open to show results
                }
                break;
             case 'setWallpaper':
                const imageUrl = (toolCall.input as any).imageUrl;
                if(imageUrl) {
                    setWallpaper(imageUrl);
                }
                break;
          }
        }
      }
      
      const textResponse = response.text();
      if (textResponse) {
          setAgentResponse(textResponse);
          // If there's a text response, we shouldn't close the palette.
          shouldClose = false;
      }

      if (shouldClose && toolCalls.length > 0 && !agentResponse) {
        setOpen(false);
      }

    } catch (err) {
      console.error("Agentic tool user failed:", err);
      setAgentResponse("Sorry, I encountered an error.");
    } finally {
      setIsLoading(false);
    }
  }, [searchValue, openApps, onOpenApp, setOpen, onArrangeWindows, user, onOpenFile, setWallpaper]);

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
                <CommandItem onSelect={() => {setSearchValue("Open the code editor and the browser, then arrange them side by side"); handleSubmit(new Event('submit') as any);}}>
                    <Layout className="mr-2 h-4 w-4" />
                    <span>Arrange windows for coding</span>
                </CommandItem>
                 <CommandItem onSelect={() => {setSearchValue("find my auth form component and open it"); handleSubmit(new Event('submit') as any);}}>
                  <File className="mr-2 h-4 w-4" />
                  <span>Find and open a file...</span>
                </CommandItem>
                <CommandItem onSelect={() => {setSearchValue("What applications are running?"); handleSubmit(new Event('submit') as any);}}>
                    <BrainCircuit className="mr-2 h-4 w-4" />
                    <span>Ask about the OS state...</span>
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
