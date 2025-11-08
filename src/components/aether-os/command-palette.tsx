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
import { File, Settings, Power } from "lucide-react";

type CommandPaletteProps = {
    open: boolean;
    setOpen: (open: boolean) => void;
    onOpenApp: (app: App) => void;
}

export default function CommandPalette({ open, setOpen, onOpenApp }: CommandPaletteProps) {
  const settingsApp = APPS.find(app => app.id === 'settings');

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
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
