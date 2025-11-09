
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
  updatePosition: (id: number, pos: { x: number; y: number }) => void;
  isFocused: boolean;
  bounds: React.RefObject<HTMLElement>;
  dockRef: React.RefObject<HTMLElement>;
};

export default function Window({
  instance,
  onClose,
  onFocus,
  onMinimize,
  updatePosition,
  isFocused,
  bounds,
  dockRef,
}: WindowProps) {
  const { id, app, position, size, zIndex, isMinimized } = instance;
  const AppContent = app.component;
  const headerRef = useRef<HTMLDivElement>(null);

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

  const [{ x, y, scale, opacity }, api] = useSpring(() => ({
    x: position.x,
    y: position.y,
    scale: 1,
    opacity: 1,
    config: { friction: 25, tension: 180 },
  }));
  
  React.useEffect(() => {
    const dockPos = getDockPosition();
    api.start({
      to: isMinimized 
        ? { x: dockPos.x - size.width/2, y: dockPos.y - size.height/2, scale: 0, opacity: 0 } 
        : { x: position.x, y: position.y, scale: 1, opacity: 1 },
    });
  }, [isMinimized, position, api, size]);

  const bind = useDrag(
    ({ down, offset: [ox, oy], event }) => {
      event.stopPropagation();
      api.start({ x: ox, y: oy, scale: 1, opacity: 1 });
      if (!down) {
        updatePosition(id, { x: ox, y: oy });
      }
    },
    {
      from: () => [x.get(), y.get()],
      bounds,
      handle: headerRef,
      filterTaps: true,
      pointer: { capture: false },
      // Prevent drag when minimized
      enabled: !isMinimized,
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
          <CardHeader className="p-2 flex-shrink-0 flex flex-row items-center justify-between border-b cursor-default">
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
        width: size.width,
        height: size.height,
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
        isFocused ? "shadow-accent/50" : "shadow-black/50"
      )}
      onMouseDownCapture={onFocus}
      {...bind()}
    >
      <Card
        className={cn(
          "w-full h-full flex flex-col bg-card/80 backdrop-blur-xl border-white/20 overflow-hidden transition-colors duration-200",
          isFocused ? "border-accent/50" : "border-white/20",
          "md:rounded-lg"
        )}
      >
        <CardHeader
          ref={headerRef}
          className={cn(
            "p-2 flex-shrink-0 flex flex-row items-center justify-between border-b",
            "cursor-grab active:cursor-grabbing"
          )}
        >
          <div className="flex items-center gap-2">
            <app.Icon className="h-4 w-4 ml-1" />
            <span className="text-sm font-medium select-none">{app.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onMinimize} className="p-1.5 rounded-full hover:bg-white/10"><Minus className="h-3 w-3" /></button>
            <button className="p-1.5 rounded-full hover:bg-white/10 hidden md:block"><Square className="h-3 w-3" /></button>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-red-500/50"><X className="h-3 w-3" /></button>
          </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow relative">
          <AppContent />
        </CardContent>
      </Card>
    </animated.div>
  );
}
