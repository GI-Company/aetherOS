
'use client';

import { useEffect, useRef } from 'react';

const useInactivityTimer = (
  onIdle: () => void,
  timeoutMinutes: number,
  enabled: boolean = true
) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // If not enabled or timeout is 0, do nothing and clean up.
    if (!enabled || timeoutMinutes <= 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    const timeoutMs = timeoutMinutes * 60 * 1000;

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(onIdle, timeoutMs);
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimer();
    };

    // Set up event listeners
    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Initialize the timer
    resetTimer();

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [onIdle, timeoutMinutes, enabled]);
};

export { useInactivityTimer };
