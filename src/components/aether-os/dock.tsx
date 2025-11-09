"use client";

import { App, APPS } from "@/lib/apps";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { cn } from "@/lib/utils";
import { ScrollArea, ScrollBar } from "../ui/scroll-area";
import React from "react";

type WindowInstance = {
  id: number;
  app: App;
  isMinimized: boolean;
};

type DockProps = {
  onAppClick: (app: App) => void;
  openApps: WindowInstance[];
  onAppFocus: (id: number) => void;
};

export default function Dock({ onAppClick, openApps, onAppFocus }: DockProps) {
  const handleDockIconClick = (app: App) => {
    const runningApp = openApps.find(openApp => openApp.app.id === app.id);
    if (runningApp) {
      onAppFocus(runningApp.id);
    } else {
      onAppClick(app);
    }
  };
  
  const viewportRef = React.useRef<HTMLDivElement>(null);

  return (
    <footer className="w-full flex justify-center pb-2 z-50">
        <ScrollArea className="w-full max-w-max mx-auto" viewportRef={viewportRef}>
          <div className={cn(
            "flex items-end gap-2 p-2 bg-black/20 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg w-max mx-auto",
          )}>
            <TooltipProvider delayDuration={0}>
              {APPS.map((app) => (
                <Tooltip key={app.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDockIconClick(app)}
                      className={cn(
                        "w-14 h-14 rounded-xl flex items-center justify-center transition-transform duration-200 hover:scale-110 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-accent flex-shrink-0",
                        "md:w-14 md:h-14",
                        "sm:w-12 sm:h-12 rounded-lg"
                        )}
                      aria-label={`Open ${app.name}`}
                    >
                      <div className="relative">
                        <app.Icon className="w-8 h-8 md:w-8 md:h-8 sm:w-6 sm:h-6 text-white drop-shadow-lg" />
                        {openApps.some(openApp => openApp.app.id === app.id) && (
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-accent rounded-full" />
                        )}
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="mb-2 hidden sm:block">
                    <p>{app.name}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
    </footer>
  );
}
