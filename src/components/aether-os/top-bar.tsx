
"use client";

import { useState, useEffect } from "react";
import { Wifi, BatteryFull, Command, LogOut, Shield } from "lucide-react";
import { useFirebase } from "@/firebase";
import { getAuth, signOut } from "firebase/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTrialTimer } from "@/hooks/use-trial-timer";

function AetherLogo() {
  return (
    <svg viewBox="0 0 100 100" className="h-5 w-5 fill-current text-foreground">
      <path d="M50 0 L100 50 L50 100 L0 50 Z M50 20 L80 50 L50 80 L20 50 Z" />
    </svg>
  );
}

export default function TopBar() {
  const [time, setTime] = useState("");
  const { user } = useFirebase();
  const auth = getAuth();
  const { timeRemaining, formattedTime } = useTrialTimer(user);

  const getInitials = (name?: string | null) => {
    if (!name) return "?";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2);
  }

  useEffect(() => {
    const updateClock = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, []);

  const renderUserMenu = () => {
    if (!user) return null;

    if (user.isAnonymous) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 text-sm text-yellow-400 outline-none">
            <Shield className="h-4 w-4" />
            <span>Trial Mode: {formattedTime}</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Guest Session</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => signOut(auth)}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>
            <div className="font-normal">
              <p className="font-semibold">{user.displayName}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut(auth)}>
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <header className="absolute top-0 left-0 right-0 h-8 bg-black/20 backdrop-blur-md flex items-center justify-between px-3 text-sm z-50">
      <div className="flex items-center gap-4">
        <AetherLogo />
        <span className="font-bold text-foreground">AetherOS - Quorium</span>
      </div>
      <div className="flex items-center gap-3 text-foreground/80">
        <Command className="h-4 w-4" />
        <Wifi className="h-4 w-4" />
        <BatteryFull className="h-4 w-4" />
        <span>{time}</span>
        {renderUserMenu()}
      </div>
    </header>
  );
}
