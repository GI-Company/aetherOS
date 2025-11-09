'use client';

import { useCallback } from "react";
import { useFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export type Palette = {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
};

export type Accent = {
    accentColor: string;
    accentForegroundColor: string;
}

export type ThemeSettings = {
    palette?: Palette;
    accent?: Accent;
}

function hexToHsl(H: string): [number, number, number] | null {
  // Convert hex to RGB first
  let r: number = 0, g: number = 0, b: number = 0;
  if (H.length == 4) {
    r = parseInt("0x" + H[1] + H[1]);
    g = parseInt("0x" + H[2] + H[2]);
    b = parseInt("0x" + H[3] + H[3]);
  } else if (H.length == 7) {
    r = parseInt("0x" + H[1] + H[2]);
    g = parseInt("0x" + H[3] + H[4]);
    b = parseInt("0x" + H[5] + H[6]);
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  // Then to HSL
  r /= 255; g /= 255; b /= 255;
  let cmin = Math.min(r,g,b),
      cmax = Math.max(r,g,b),
      delta = cmax - cmin,
      h = 0, s = 0, l = 0;

  if (delta == 0) h = 0;
  else if (cmax == r) h = ((g - b) / delta) % 6;
  else if (cmax == g) h = (b - r) / delta + 2;
  else h = (r - g) / delta + 4;

  h = Math.round(h * 60);
  if (h < 0) h += 360;
  l = (cmax + cmin) / 2;
  s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return [Math.round(h), Math.round(s), Math.round(l)];
}

const applyHsl = (variable: string, hex: string) => {
  if (typeof document === 'undefined') return;
  const hsl = hexToHsl(hex);
  if (hsl) {
    document.documentElement.style.setProperty(variable, `${hsl[0]} ${hsl[1]}% ${hsl[2]}%`);
  }
}

export function useTheme() {
    const { firestore, user } = useFirebase();

    const applyTheme = useCallback((theme: ThemeSettings, shouldSave: boolean = true) => {
        if (theme.palette) {
            applyHsl('--background', theme.palette.backgroundColor);
            applyHsl('--foreground', theme.palette.textColor);
            applyHsl('--card', theme.palette.secondaryColor);
            applyHsl('--card-foreground', theme.palette.textColor);
            applyHsl('--popover', theme.palette.secondaryColor);
            applyHsl('--popover-foreground', theme.palette.textColor);
            applyHsl('--secondary', theme.palette.secondaryColor);
            applyHsl('--secondary-foreground', theme.palette.textColor);
            applyHsl('--muted', theme.palette.secondaryColor);
            applyHsl('--muted-foreground', theme.palette.textColor);
            applyHsl('--border', theme.palette.primaryColor);
            applyHsl('--input', theme.palette.primaryColor);
        }
        if (theme.accent) {
            applyHsl('--primary', theme.accent.accentColor);
            applyHsl('--accent', theme.accent.accentColor);
            applyHsl('--ring', theme.accent.accentColor);
            applyHsl('--primary-foreground', theme.accent.accentForegroundColor);
            applyHsl('--accent-foreground', theme.accent.accentForegroundColor);
        }

        if (shouldSave && firestore && user) {
            const prefRef = doc(firestore, 'userPreferences', user.uid);
            setDocumentNonBlocking(prefRef, theme, { merge: true });
        }
    }, [firestore, user]);

    const setScheme = useCallback((scheme: 'light' | 'dark') => {
        if (typeof document !== 'undefined') {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(scheme);
        }
    }, []);


    return { applyTheme, setScheme };
}
