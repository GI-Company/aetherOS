"use client";

import { useState, useEffect } from "react";
import { Wifi, BatteryFull, Command } from "lucide-react";

function AetherLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-5 w-5 fill-current text-foreground">
      <path d="M50 0 L100 50 L50 100 L0 50 Z M50 20 L80 50 L50 80 L20 50 Z" />
    </svg>
  );
}

export default function TopBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <header className="absolute top-0 left-0 right-0 h-8 bg-black/20 backdrop-blur-md flex items-center justify-between px-3 text-sm z-50">
      <div className="flex items-center gap-4">
        <AetherLogo />
        <span className="font-bold text-foreground">AetherOS</span>
      </div>
      <div className="flex items-center gap-3 text-foreground/80">
        <Command className="h-4 w-4" />
        <Wifi className="h-4 w-4" />
        <BatteryFull className="h-4 w-4" />
        <span>{time}</span>
      </div>
    </header>
  );
}
