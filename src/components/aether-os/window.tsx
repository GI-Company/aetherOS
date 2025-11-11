
"use client";

import { Card, CardContent, CardHeader } from "../ui/card";
import { X, Minus, Square } from "lucide-react";
import type { WindowInstance } from "./desktop";
import { cn } from "@/lib/utils";
import React, { useRef, useState, useEffect } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";
import TutorialDialog from "./tutorial-dialog";
import { TUTORIALS } from "@/lib/tutorials";

type WindowProps = {
  instance: WindowInstance;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  updateAppPosition: (id: number, pos: { x: number; y: number }) => void;
  updateSize: (id: number, size: { width: number, height: number }) => void;
  isFocused: boolean;
  bounds: React.RefObject<HTMLElement>;
  dockRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  userPreferences: any;
  onHideTutorial: (appId: string) => void;
};

export default function Window({
  instance,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  updateAppPosition,
  updateSize,
  isFocused,
  bounds,
  dockRef,
  children,
  userPreferences,
  onHideTutorial,
}: WindowProps) {
  const { id, app, position, size, zIndex, isMinimized, isMaximized, isDirty } = instance;
  const headerRef = useRef<HTMLDivElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const appTutorial = TUTORIALS[app.id];
  const isAppTutorialHidden = userPreferences?.tutorials?.hiddenAppTutorials?.includes(app.id);
  const [showAppTutorial, setShowAppTutorial] = useState(false);

  useEffect(() => {
      // Show tutorial if it exists and hasn't been hidden
      if (appTutorial && !isAppTutorialHidden) {
          setShowAppTutorial(true);
      }
  }, [app.id, appTutorial, isAppTutorialHidden]);


  const getDockPosition = () => {
    if (dockRef.current) {
      const dockIcon = dockRef.current.querySelector(`[data-app-id="${app.id}"]`);
      if (dockIcon) {
        const rect = dockIcon.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 40 };
  };


  const [{ x, y, width, height, scale, opacity }, api] = useSpring(() => ({
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    scale: 1,
    opacity: 1,
    config: { friction: 25, tension: 180 },
    onRest: (result) => {
      // After minimizing animation, if scale is 0, hide the element
      if (isMinimized && result.value.scale < 0.1) {
        const el = document.getElementById(`window-${id}`);
        if(el) el.style.display = 'none';
      }
    }
  }));

  React.useEffect(() => {
    const el = document.getElementById(`window-${id}`);
    

    if (isMinimized) {
       const dockPos = getDockPosition();
       api.start({
        to: { x: dockPos.x - size.width/2, y: dockPos.y - size.height/2, scale: 0, opacity: 0 },
      });
    } else {
      if(el) el.style.display = 'block';
      api.start({
        to: { x: position.x, y: position.y, width: size.width, height: size.height, scale: 1, opacity: 1 },
      });
    }
  }, [isMinimized, position, size, api, id, app.id, size.width, size.height]);

  const bind = useDrag(
    ({ down, movement: [mx, my], last, memo }) => {
      if (isMaximized) return; // Don't drag if maximized
      if (!memo) {
        memo = [x.get(), y.get()];
      }

      const newX = memo[0] + mx;
      const newY = memo[1] + my;
      
      api.start({ x: newX, y: newY, immediate: down });
      
      if (last) {
        updateAppPosition(id, { x: newX, y: newY });
      }
      return memo;
    },
    {
      target: headerRef,
      enabled: hasMounted,
      from: () => [x.get(), y.get()],
      bounds: (state) => {
        if (!bounds.current) return {};
        const currentWidth = width.get();
        const currentHeight = height.get();
        const topBarHeight = 32;
        const dockHeight = dockRef.current?.offsetHeight || 80;
        return {
          left: 0,
          top: topBarHeight,
          right: bounds.current.clientWidth - currentWidth,
          bottom: bounds.current.clientHeight - currentHeight - dockHeight,
        }
      },
      filterTaps: true,
      eventOptions: { passive: false },
      // This prevents the drag gesture from firing when interacting with child buttons
      pointer: { buttons: 1 } 
    }
  );
  
  const handleFinishAppTutorial = (dontShowAgain: boolean) => {
    setShowAppTutorial(false);
    if (dontShowAgain) {
        onHideTutorial(app.id);
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if(window.confirm('You have unsaved changes. Are you sure you want to close this window?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };


  return (
    <animated.div
      id={`window-${id}`}
      style={{
        width: isMaximized ? '100%' : width,
        height: isMaximized ? `calc(100vh - 32px - ${(dockRef.current?.offsetHeight || 80)}px)` : height,
        zIndex,
        x,
        y,
        scale,
        opacity,
      }}
      className={cn(
        "absolute rounded-lg shadow-2xl",
        isFocused ? "shadow-accent/50" : "shadow-black/50",
        isMaximized && 'rounded-none'
      )}
      onMouseDownCapture={onFocus}
      onPointerDownCapture={onFocus}
    >
      <Card
        className={cn(
          "w-full h-full flex flex-col bg-card/80 backdrop-blur-xl border-white/20 overflow-hidden transition-colors duration-200",
          isFocused ? "border-accent/50" : "border-white/20",
          "md:rounded-lg",
           isMaximized && 'rounded-none border-0'
        )}
      >
        <CardHeader
          ref={headerRef}
          className={cn(
            "p-2 flex-shrink-0 flex flex-row items-center justify-between border-b relative touch-none",
            isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"
          )}
        >
          <div className="flex items-center gap-2">
            <app.Icon className="h-4 w-4 ml-1" />
            <span className="text-sm font-medium select-none">{app.name}{isDirty ? '*' : ''}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMinimize} className="p-1.5 rounded-full hover:bg-white/10"><Minus className="h-3 w-3" /></button>
            <button onClick={onMaximize} className="p-1.5 rounded-full hover:bg-white/10 hidden md:block"><Square className="h-3 w-3" /></button>
            <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-red-500/50"><X className="h-3 w-3" /></button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow relative overflow-y-auto">
            {showAppTutorial && appTutorial && (
                 <div className="absolute inset-0 z-50">
                    <TutorialDialog
                        tutorial={appTutorial}
                        onFinish={handleFinishAppTutorial}
                        onSkip={() => setShowAppTutorial(false)}
                    />
                </div>
            )}
          <div className={cn("w-full h-full", showAppTutorial && "blur-sm")}>
            {children}
          </div>
           {!isMaximized && (
             <div 
               data-resize="true"
               className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize" 
             />
           )}
        </CardContent>
      </Card>
    </animated.div>
  );
}
