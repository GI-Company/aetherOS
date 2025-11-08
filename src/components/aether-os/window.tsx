"use client";

import { Card, CardContent, CardHeader } from "../ui/card";
import { X, Minus, Square } from "lucide-react";
import Draggable from "react-draggable";
import type { WindowInstance } from "./desktop";
import { cn } from "@/lib/utils";
import React from "react";

type WindowProps = {
  instance: WindowInstance;
  onClose: () => void;
  onFocus: () => void;
  onMinimize: () => void;
  onMove: (position: { x: number; y: number }) => void;
  isFocused: boolean;
};

export default function Window({ instance, onClose, onFocus, onMinimize, onMove, isFocused }: WindowProps) {
  const { app, position, size, zIndex, isMinimized } = instance;
  const AppContent = app.component;
  const nodeRef = React.useRef(null);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      onStop={(e, data) => onMove({ x: data.x, y: data.y })}
      position={position}
      bounds="parent"
    >
      <div
        ref={nodeRef}
        className={cn(
          "absolute rounded-lg shadow-2xl transition-all duration-300 ease-in-out animate-in fade-in-50 zoom-in-90",
          isMinimized && "opacity-0 pointer-events-none scale-90 -translate-y-4",
          isFocused ? "shadow-accent/50" : "shadow-black/50"
        )}
        style={{
          width: `${size.width}px`,
          height: `${size.height}px`,
          zIndex: zIndex,
        }}
        onMouseDownCapture={onFocus}
      >
        <Card className={cn(
          "w-full h-full flex flex-col bg-card/80 backdrop-blur-xl border-white/20 overflow-hidden transition-colors",
          isFocused ? "border-accent/50" : "border-white/20"
        )}>
          <CardHeader
            className="drag-handle p-2 flex-shrink-0 flex flex-row items-center justify-between border-b cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <app.Icon className="h-4 w-4 ml-1" />
              <span className="text-sm font-medium select-none">{app.name}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onMinimize} className="p-1.5 rounded-full hover:bg-white/10"><Minus className="h-3 w-3" /></button>
              <button className="p-1.5 rounded-full hover:bg-white/10"><Square className="h-3 w-3" /></button>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-red-500/50"><X className="h-3 w-3" /></button>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-grow relative">
            <AppContent />
          </CardContent>
        </Card>
      </div>
    </Draggable>
  );
}
