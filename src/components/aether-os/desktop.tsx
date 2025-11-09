
"use client";

import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { useEffect, useState, useCallback, useRef } from "react";
import TopBar from "./top-bar";
import Dock from "./dock";
import Window from "./window";
import { App, APPS } from "@/lib/apps";
import CommandPalette from "./command-palette";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { proactiveOsAssistance } from "@/ai/flows/proactive-os-assistance";
import { cn } from "@/lib/utils";

export type WindowInstance = {
  id: number;
  app: App;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  previousState?: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  }
};

export default function Desktop() {
  const wallpaper = PlaceHolderImages.find((img) => img.id === "aether-os-wallpaper");
  const [openApps, setOpenApps] = useState<WindowInstance[]>([]);
  const [focusedAppId, setFocusedAppId] = useState<number | null>(null);
  const nextId = useRef(0);
  const [highestZIndex, setHighestZIndex] = useState(10);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { toast } = useToast();
  const desktopRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  const arrangeWindows = () => {
    const codeEditor = openApps.find(a => a.app.id === 'code-editor');
    const browser = openApps.find(a => a.app.id === 'browser');

    if (codeEditor) focusApp(codeEditor.id);
    if (browser) focusApp(browser.id);

    toast({
      title: "Windows Arranged",
      description: "Code Editor and Browser are now focused.",
    });
  }

  useEffect(() => {
    const focusedApp = openApps.find(app => app.id === focusedAppId);
    
    // Proactive Assistance AI
    if (focusedApp) {
       const proactiveToastTimeout = setTimeout(async () => {
        try {
            const openAppNames = openApps.filter(a => !a.isMinimized).map(a => a.app.name).join(', ');
            const assistance = await proactiveOsAssistance({
                userActivity: `Working in the ${focusedApp.app.name} app.`,
                context: `Current open applications: ${openAppNames}. Had ${focusedApp.app.name} focused for 10 seconds.`
            });

            // Only show toast if there's a suggestion
            if (assistance.suggestion) {
              toast({
                  title: "Proactive OS Assistance",
                  description: assistance.suggestion,
                  // Conditionally show action button for specific suggestions
                  action: assistance.suggestion.includes("Arrange windows") 
                      ? <Button variant="outline" size="sm" onClick={arrangeWindows}>Arrange</Button> 
                      : undefined,
              });
            }
        } catch (error) {
            console.warn("Proactive assistance AI call failed:", error);
        }
      }, 10000); // 10 seconds

      return () => clearTimeout(proactiveToastTimeout);
    }
  }, [focusedAppId, openApps, toast]);

  const openApp = useCallback((app: App) => {
    const existingAppInstance = openApps.find(a => a.app.id === app.id);
    if (existingAppInstance) {
        // If app is minimized, restore it and focus
        if (existingAppInstance.isMinimized) {
            toggleMinimize(existingAppInstance.id);
        } else { // Otherwise, just focus it
            focusApp(existingAppInstance.id);
        }
        return;
    }

    const currentId = nextId.current;
    setHighestZIndex((prev) => prev + 1);
    const newWindow: WindowInstance = {
      id: currentId,
      app: app,
      position: { x: 50 + (currentId % 10) * 20, y: 50 + (currentId % 10) * 20 },
      size: app.defaultSize,
      zIndex: highestZIndex + 1,
      isMinimized: false,
      isMaximized: false,
    };
    setOpenApps((prev) => [...prev, newWindow]);
    setFocusedAppId(currentId);
    nextId.current += 1;
  }, [highestZIndex, openApps]);
  
  const closeApp = (id: number) => {
    setOpenApps((prev) => prev.filter((app) => app.id !== id));
  };

  const focusApp = (id: number) => {
    const appInstance = openApps.find(app => app.id === id);
    if (!appInstance) return;

    if (appInstance.isMinimized) {
        toggleMinimize(id);
        return;
    }

    setFocusedAppId(id);
    if (appInstance.zIndex === highestZIndex) return;
    
    setHighestZIndex((prev) => prev + 1);
    setOpenApps((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, zIndex: highestZIndex + 1 } : app
      )
    );
  };
  
  const updateAppPosition = (id: number, position: { x: number, y: number }) => {
    setOpenApps(prev => prev.map(app => app.id === id ? { ...app, position } : app));
  };

  const updateAppSize = (id: number, size: { width: number, height: number }) => {
    setOpenApps(prev => prev.map(app => app.id === id ? { ...app, size } : app));
  };


  const toggleMinimize = (id: number) => {
     setOpenApps(prev => prev.map(app => {
        if (app.id === id) {
          const isNowMinimized = !app.isMinimized;
          if (isNowMinimized && focusedAppId === id) {
            const nextApp = prev.filter(a => a.id !== id && !a.isMinimized).sort((a,b) => b.zIndex - a.zIndex)[0];
            setFocusedAppId(nextApp ? nextApp.id : null);
          } else if (!isNowMinimized) {
            // When un-minimizing, focus the app
            setFocusedAppId(id);
            setHighestZIndex(prevZ => prevZ + 1);
            return { ...app, isMinimized: false, zIndex: highestZIndex + 1 };
          }
          return { ...app, isMinimized: isNowMinimized, isMaximized: false };
        }
        return app;
     }));
  }

  const toggleMaximize = (id: number) => {
    setOpenApps(prev => prev.map(app => {
      if (app.id === id) {
        const isNowMaximized = !app.isMaximized;
        if (isNowMaximized) {
          // Store previous state before maximizing
          const topBarHeight = 32; // from TopBar component h-8
          return {
            ...app,
            isMaximized: true,
            previousState: { position: app.position, size: app.size },
            position: { x: 0, y: topBarHeight },
            size: {
              width: desktopRef.current?.clientWidth || window.innerWidth,
              height: (desktopRef.current?.clientHeight || window.innerHeight) - topBarHeight,
            }
          };
        } else {
          // Restore previous state
          return {
            ...app,
            isMaximized: false,
            position: app.previousState?.position || app.position,
            size: app.previousState?.size || app.size,
            previousState: undefined,
          };
        }
      }
      return app;
    }));
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-background font-body flex flex-col">
      {wallpaper && (
        <Image
          src={wallpaper.imageUrl}
          alt={wallpaper.description}
          data-ai-hint={wallpaper.imageHint}
          fill
          quality={100}
          className="object-cover z-0"
          priority
        />
      )}
      <div className="relative z-10 flex-grow w-full flex flex-col" ref={desktopRef}>
        <TopBar />
        <div className="flex-grow relative" >
          {openApps.map((window) => (
            <Window
              key={window.id}
              instance={window}
              onClose={() => closeApp(window.id)}
              onFocus={() => focusApp(window.id)}
              onMinimize={() => toggleMinimize(window.id)}
              onMaximize={() => toggleMaximize(window.id)}
              updatePosition={updateAppPosition}
              updateSize={updateAppSize}
              isFocused={focusedAppId === window.id}
              bounds={desktopRef}
              dockRef={dockRef}
            />
          ))}
        </div>
        <Dock ref={dockRef} onAppClick={openApp} openApps={openApps} onAppFocus={focusApp} />
      </div>
      <CommandPalette open={commandPaletteOpen} setOpen={setCommandPaletteOpen} onOpenApp={openApp} />
    </div>
  );
}
