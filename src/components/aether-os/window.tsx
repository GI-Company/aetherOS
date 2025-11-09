
"use client";

import { Card, CardContent, CardHeader } from "../ui/card";
import { X, Minus, Square } from "lucide-react";
import type { WindowInstance } from "./desktop";
import { cn } from "@/lib/utils";
import React, { useRef } from "react";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

type WindowProps = {
  instance: WindowInstance;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  updatePosition: (id: number, pos: { x: number; y: number }) => void;
  updateSize: (id: number, size: { width: number, height: number }) => void;
  isFocused: boolean;
  bounds: React.RefObject<HTMLElement>;
  dockRef: React.RefObject<HTMLElement>;
};

export default function Window({
  instance,
  onClose,
  onFocus,
  onMinimize,
  onMaximize,
  updatePosition,
  updateSize,
  isFocused,
  bounds,
  dockRef,
}: WindowProps) {
  const { id, app, position, size, zIndex, isMinimized, isMaximized } = instance;
  const AppContent = app.component;
  const headerRef = useRef<HTMLDivElement>(null);
  const MIN_WIDTH = 300;
  const MIN_HEIGHT = 200;

  const getDockPosition = () => {
    if (dockRef.current) {
      const rect = dockRef.current.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top,
      };
    }
    return { x: window.innerWidth / 2, y: window.innerHeight - 30 };
  };

  const [{ x, y, width, height, scale, opacity }, api] = useSpring(() => ({
    x: position.x,
    y: position.y,
    width: size.width,
    height: size.height,
    scale: 1,
    opacity: 1,
    config: { friction: 25, tension: 180 },
  }));
  
  React.useEffect(() => {
    const dockPos = getDockPosition();
    api.start({
      to: isMinimized 
        ? { x: dockPos.x - size.width/2, y: dockPos.y - size.height/2, scale: 0, opacity: 0 } 
        : { x: position.x, y: position.y, width: size.width, height: size.height, scale: 1, opacity: 1 },
    });
  }, [isMinimized, position, size, api]);

  const bind = useDrag(
    ({ down, movement: [mx, my], offset: [ox, oy], pinching, tap, event, memo }) => {
      event.stopPropagation();
      
      const isResizeEvent = (event.target as HTMLElement)?.dataset?.resize === 'true';

      if (pinching || (tap && !isResizeEvent)) return;

      if (!memo) {
        memo = {
          isResizing: isResizeEvent,
          initialSize: [width.get(), height.get()],
          initialPos: [x.get(), y.get()],
        };
      }
      
      if (memo.isResizing) {
        const newWidth = Math.max(MIN_WIDTH, memo.initialSize[0] + mx);
        const newHeight = Math.max(MIN_HEIGHT, memo.initialSize[1] + my);
        api.start({ width: newWidth, height: newHeight });
        if (!down) {
            updateSize(id, { width: newWidth, height: newHeight });
        }
      } else {
        api.start({ x: ox, y: oy });
        if (!down) {
          updatePosition(id, { x: ox, y: oy });
        }
      }

      return memo;
    },
    {
      from: () => [x.get(), y.get()],
      bounds,
      handle: headerRef,
      filterTaps: true,
      pointer: { capture: false },
      enabled: !isMinimized,
      // Configuration for the resize handle
      eventOptions: { passive: false },
      drag: {
        // Allows drag to be triggered by the resize handle as well
        filter: (event) => (event.target as HTMLElement)?.dataset?.resize === 'true'
      }
    }
  );

  // On small screens, windows are always fullscreen
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (isMobile) {
    return (
       <div
        className={cn(
          "absolute inset-0 !transform-none !left-0 !top-0 rounded-none transition-opacity duration-300",
           isMinimized && "opacity-0 pointer-events-none"
        )}
        style={{ zIndex }}
        onMouseDownCapture={onFocus}
      >
        <Card className="w-full h-full flex flex-col bg-card/80 backdrop-blur-xl border-white/20 overflow-hidden rounded-none border-0">
          <CardHeader className="p-2 flex-shrink-0 flex flex-row items-center justify-between border-b cursor-default relative">
            <div className="flex items-center gap-2">
              <app.Icon className="h-4 w-4 ml-1" />
              <span className="text-sm font-medium select-none">{app.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onMinimize} className="p-1.5 rounded-full hover:bg-white/10"><Minus className="h-3 w-3" /></button>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-red-500/50"><X className="h-3 w-3" /></button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-grow relative">
            <AppContent />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <animated.div
      style={{
        width: isMaximized ? '100%' : width,
        height: isMaximized ? '100%' : height,
        zIndex,
        x,
        y,
        scale,
        opacity,
        pointerEvents: isMinimized ? 'none' : 'auto',
        transformOrigin: "center center",
      }}
      className={cn(
        "absolute rounded-lg shadow-2xl",
        isFocused ? "shadow-accent/50" : "shadow-black/50",
        isMaximized && 'rounded-none'
      )}
      onMouseDownCapture={onFocus}
      {...bind()}
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
            "p-2 flex-shrink-0 flex flex-row items-center justify-between border-b relative",
            isMaximized ? "cursor-default" : "cursor-grab active:cursor-grabbing"
          )}
        >
          <div className="flex items-center gap-2">
            <app.Icon className="h-4 w-4 ml-1" />
            <span className="text-sm font-medium select-none">{app.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMinimize} className="p-1.5 rounded-full hover:bg-white/10"><Minus className="h-3 w-3" /></button>
            <button onClick={onMaximize} className="p-1.5 rounded-full hover:bg-white/10 hidden md:block"><Square className="h-3 w-3" /></button>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-red-500/50"><X className="h-3 w-3" /></button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow relative">
          <AppContent />
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
