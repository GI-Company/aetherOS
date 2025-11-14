import React, { useState, useRef, useEffect, useCallback } from 'react';
import Window from './Window';
import Dock from './Dock';
import TopBar from './TopBar';
import { APPS } from '../lib/apps';
import { AetherProvider } from '../lib/aether_sdk';

const Desktop = () => {
  const [windows, setWindows] = useState([]);
  const [activeWindow, setActiveWindow] = useState(null);
  const nextZIndex = useRef(100);
  const nextId = useRef(0);
  const desktopRef = useRef(null);
  
  const openApp = useCallback((app) => {
    // Check if the app is already open
    const existingWindow = windows.find(w => w.appId === app.id);
    if (existingWindow) {
      setActiveWindow(existingWindow.id);
      // Bring window to front
      setWindows(windows.map(w => w.id === existingWindow.id ? { ...w, zIndex: nextZIndex.current++ } : w));
      return;
    }

    const newWindow = {
      id: nextId.current++,
      appId: app.id,
      title: app.name,
      Icon: app.Icon,
      x: 50 + (windows.length % 10) * 30,
      y: 50 + (windows.length % 10) * 30,
      width: app.defaultSize.width,
      height: app.defaultSize.height,
      zIndex: nextZIndex.current++,
    };
    setWindows([...windows, newWindow]);
    setActiveWindow(newWindow.id);
  }, [windows]);

  const closeWindow = (id) => {
    setWindows(windows.filter(w => w.id !== id));
    if (activeWindow === id) {
      setActiveWindow(null);
    }
  };

  const focusWindow = (id) => {
    if (activeWindow !== id) {
      setActiveWindow(id);
      setWindows(windows.map(w => w.id === id ? { ...w, zIndex: nextZIndex.current++ } : w));
    }
  };

  return (
    <AetherProvider>
      <div ref={desktopRef} className="h-screen w-screen bg-gray-900 overflow-hidden relative">
         <img src="/aether_wallpaper.jpg" className="absolute top-0 left-0 w-full h-full object-cover z-0" alt="desktop wallpaper" />
        <TopBar />
        
        {windows.map((win) => {
          const AppToRender = APPS.find(app => app.id === win.appId).component;
          return (
            <Window
              key={win.id}
              id={win.id}
              title={win.title}
              Icon={win.Icon}
              initialX={win.x}
              initialY={win.y}
              initialWidth={win.width}
              initialHeight={win.height}
              zIndex={win.zIndex}
              onClose={() => closeWindow(win.id)}
              onFocus={() => focusWindow(win.id)}
              isActive={activeWindow === win.id}
              bounds={desktopRef}
            >
              <AppToRender />
            </Window>
          );
        })}
        
        <Dock onAppClick={openApp} openApps={windows} onAppFocus={focusWindow} activeApp={activeWindow} />
      </div>
    </AetherProvider>
  );
};

export default Desktop;
