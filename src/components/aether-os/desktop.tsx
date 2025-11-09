
"use client";

import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import React, { useEffect, useState, useCallback, useRef } from "react";
import TopBar from "./top-bar";
import Dock from "./dock";
import Window from "./window";
import { App, APPS } from "@/lib/apps";
import CommandPalette from "./command-palette";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "../ui/toast";
import { proactiveOsAssistance } from "@/ai/flows/proactive-os-assistance";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import AuthForm from "@/firebase/auth/auth-form";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { doc, serverTimestamp } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

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
  },
  props?: Record<string, any>; // For passing props to app components
};

// Simulate reading file content
const PROACTIVE_ASSISTANCE_CONTENT = `'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing proactive OS assistance based on user activity and context.
 *
 * - proactiveOsAssistance - A function that triggers the proactive assistance flow.
 * - ProactiveOsAssistanceInput - The input type for the proactiveOsAssistance function.
 * - ProactiveOsAssistanceOutput - The return type for the proactiveOsAssistance function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ProactiveOsAssistanceInputSchema = z.object({
  userActivity: z.string().describe("A description of the user\\'s current activity."),
  context: z.string().describe("Additional context about the user\\'s environment and tasks."),
});
export type ProactiveOsAssistanceInput = z.infer<typeof ProactiveOsAssistanceInputSchema>;

const ProactiveOsAssistanceOutputSchema = z.object({
  suggestion: z.string().describe('A proactive, short, and actionable suggestion for the user. Should be empty if no suggestion is relevant.'),
  reason: z.string().describe('The reasoning behind the suggestion.'),
});
export type ProactiveOsAssistanceOutput = z.infer<typeof ProactiveOsAssistanceOutputSchema>;

export async function proactiveOsAssistance(input: ProactiveOsAssistanceInput): Promise<ProactiveOsAssistanceOutput> {
  return proactiveOsAssistanceFlow(input);
}

const proactiveOsAssistancePrompt = ai.definePrompt({
  name: 'proactiveOsAssistancePrompt',
  input: {schema: ProactiveOsAssistanceInputSchema},
  output: {schema: ProactiveOsAssistanceOutputSchema},
  prompt: \`You are the core intelligence of the AetherOS, responsible for proactively assisting the user.
  Based on the user's current activity and context, provide a single, actionable suggestion.
  The suggestion should be concise and helpful. If no clear, high-value suggestion is available, return an empty string for the suggestion.

  Examples:
  - If user is in Code Editor and Browser is also open, suggest: "Arrange windows side-by-side for a better workflow?"
  - If user is in Design Studio, suggest: "Need some inspiration? I can generate a new color palette."
  - If many apps are open, suggest: "Feeling cluttered? I can close all background apps."

  Current State:
  Activity: {{{userActivity}}}
  Context: {{{context}}}
  
  Your response should be based on the provided activity and context.\`,
});

const proactiveOsAssistanceFlow = ai.defineFlow(
  {
    name: 'proactiveOsAssistanceFlow',
    inputSchema: ProactiveOsAssistanceInputSchema,
    outputSchema: ProactiveOsAssistanceOutputSchema,
  },
  async input => {
    const {output} = await proactiveOsAssistancePrompt(input);
    return output!;
  }
);
`;


export default function Desktop() {
  const { user, isUserLoading } = useUser();
  const { applyTheme } = useTheme();
  const firestore = useFirestore();

  const userPreferencesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || user.isAnonymous) return null;
    return doc(firestore, 'userPreferences', user.uid);
  }, [firestore, user?.uid, user?.isAnonymous]);

  const { data: userPreferences, isLoading: isPreferencesLoading } = useDoc(userPreferencesRef);
  
  useEffect(() => {
    if (user && !user.isAnonymous && userPreferences) {
      applyTheme(userPreferences as any, false);
    }
  }, [user, userPreferences, applyTheme]);
  
  const wallpaper = PlaceHolderImages.find((img) => img.id === "aether-os-wallpaper");
  const [openApps, setOpenApps] = useState<WindowInstance[]>([]);
  const [focusedAppId, setFocusedAppId] = useState<number | null>(null);
  const nextId = useRef(0);
  const [highestZIndex, setHighestZIndex] = useState(10);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const { toast } = useToast();
  const desktopRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);

  // When an anonymous user logs in, create a trial document for them
  useEffect(() => {
    if (user?.isAnonymous && firestore) {
      const trialRef = doc(firestore, 'trialUsers', user.uid);
      setDocumentNonBlocking(trialRef, { trialStartedAt: serverTimestamp() });
    }
  }, [user, firestore]);

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
  
  const arrangeWindows = useCallback(() => {
    const codeEditor = openApps.find(a => a.app.id === 'code-editor');
    const browser = openApps.find(a => a.app.id === 'browser');
    
    if (!codeEditor || !browser) {
        toast({
            title: "Arrangement Failed",
            description: "Please open both the Code Editor and Browser to arrange them.",
            variant: "destructive"
        })
        return;
    }

    const desktopWidth = desktopRef.current?.clientWidth || window.innerWidth;
    const desktopHeight = desktopRef.current?.clientHeight || window.innerHeight;
    const topBarHeight = 32;

    const updates = new Map<number, Partial<WindowInstance>>();

    updates.set(browser.id, {
        position: { x: 0, y: topBarHeight },
        size: { width: desktopWidth / 2, height: desktopHeight - topBarHeight },
        isMaximized: false,
        isMinimized: false,
    });

    updates.set(codeEditor.id, {
        position: { x: desktopWidth / 2, y: topBarHeight },
        size: { width: desktopWidth / 2, height: desktopHeight - topBarHeight },
        isMaximized: false,
        isMinimized: false,
    });

    if (updates.size > 0) {
        let newZIndex = highestZIndex;
        setOpenApps(prev => prev.map(app => {
            const appUpdate = updates.get(app.id);
            if (appUpdate) {
                newZIndex++;
                return { ...app, ...appUpdate, zIndex: newZIndex };
            }
            return app;
        }));
        setHighestZIndex(newZIndex);
        setFocusedAppId(codeEditor.id);

        toast({
          title: "Windows Arranged",
          description: "Code Editor and Browser are now side-by-side.",
        });
    }
  }, [openApps, highestZIndex, toast]);

  useEffect(() => {
    const focusedApp = openApps.find(app => app.id === focusedAppId);
    
    if (focusedApp && !user?.isAnonymous) {
       const proactiveToastTimeout = setTimeout(async () => {
        try {
            const openAppNames = openApps.filter(a => !a.isMinimized).map(a => a.app.name).join(', ');
            const assistance = await proactiveOsAssistance({
                userActivity: `Working in the ${focusedApp.app.name} app.`,
                context: `Current open applications: ${openAppNames}. Had ${focusedApp.app.name} focused for 10 seconds.`
            });

            if (assistance.suggestion) {
              let action;
              if (assistance.suggestion.toLowerCase().includes("arrange")) {
                action = <ToastAction altText="Arrange Windows" onClick={arrangeWindows}>Arrange</ToastAction>
              }

              toast({
                  title: "Proactive OS Assistance",
                  description: assistance.suggestion,
                  action: action,
              });
            }
        } catch (error) {
            console.warn("Proactive assistance AI call failed:", error);
        }
      }, 10000); 

      return () => clearTimeout(proactiveToastTimeout);
    }
  }, [focusedAppId, openApps, toast, arrangeWindows, user]);

  const openApp = useCallback((app: App, props: Record<string, any> = {}) => {
    const existingAppInstance = openApps.find(a => a.app.id === app.id);
    if (existingAppInstance) {
        if (existingAppInstance.isMinimized) {
            toggleMinimize(existingAppInstance.id);
        } else {
            focusApp(existingAppInstance.id);
        }
        // If there are new props (like a new file path), update the existing instance
        if(Object.keys(props).length > 0) {
          setOpenApps(prev => prev.map(a => a.id === existingAppInstance.id ? { ...a, props: {...a.props, ...props}} : a));
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
      props,
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
          const topBarHeight = 32;
          return {
            ...app,
            isMaximized: true,
            previousState: { position: app.position, size: app.size },
            position: { x: 0, y: topBarHeight },
            size: {
              width: window.innerWidth,
              height: window.innerHeight - topBarHeight,
            }
          };
        } else {
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
  
  const openFile = (filePath: string) => {
    // This is a simulation. In a real OS, you'd read the file content.
    let content = `// Could not find content for ${filePath}`;
    if (filePath.endsWith('proactive-os-assistance.ts')) {
      content = PROACTIVE_ASSISTANCE_CONTENT;
    }
    
    const editorApp = APPS.find(a => a.id === 'code-editor');
    if (editorApp) {
      openApp(editorApp, { filePath: filePath, initialContent: content });
    }
  }

  if (isUserLoading || (user && !user.isAnonymous && isPreferencesLoading)) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AuthForm />;
  }


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
          {openApps.map((window) => {
            const AppComponent = window.app.component;
            const componentProps: any = { ...window.props };

            if (window.app.id === 'file-explorer') {
              componentProps.onOpenFile = openFile;
            }

            return (
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
              >
                 <AppComponent {...componentProps} />
              </Window>
            );
          })}
        </div>
        <Dock ref={dockRef} onAppClick={openApp} openApps={openApps} onAppFocus={focusApp} />
      </div>
      <CommandPalette 
        open={commandPaletteOpen} 
        setOpen={setCommandPaletteOpen} 
        onOpenApp={openApp}
        openApps={openApps}
        onArrangeWindows={arrangeWindows}
      />
    </div>
  );
}
