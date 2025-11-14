import React, { useState, useEffect } from 'react';
import { Wifi, BatteryFull } from 'lucide-react';

const TopBar = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const timerId = setInterval(updateClock, 1000);
    return () => clearInterval(timerId);
  }, []);

  return (
    <div className="absolute top-0 left-0 right-0 h-8 bg-black/20 backdrop-blur-md flex items-center justify-between px-3 text-sm z-50 text-white">
      <div className="flex items-center gap-4">
        <div className="font-bold">Aether</div>
      </div>
      <div className="flex items-center gap-3">
        <Wifi className="h-4 w-4" />
        <BatteryFull className="h-4 w-4" />
        <div>{time}</div>
      </div>
    </div>
  );
};

export default TopBar;
