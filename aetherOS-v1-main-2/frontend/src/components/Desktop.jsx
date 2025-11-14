
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
  
  const openApp = useCallback((app, props = {}) => {
    // Check if the app is already open
    const existingWindow = windows.find(w => w.appId === app.id);
    if (existingWindow) {
      focusWindow(existingWindow.id);
      // If props are passed, update the existing window's props
      if (Object.keys(props).length > 0) {
        setWindows(prev => prev.map(w => w.id === existingWindow.id ? { ...w, props: { ...w.props, ...props } } : w));
      }
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
      isMinimized: false,
      isMaximized: false,
      props: props, // Store the props
    };
    setWindows([...windows, newWindow]);
    setActiveWindow(newWindow.id);
  }, [windows]);

  const closeWindow = (id) => {
    setWindows(windows.filter(w => w.id !== id));
    if (activeWindow === id) {
       const nextApp = windows.filter(a => a.id !== id && !a.isMinimized).sort((a,b) => b.zIndex - a.zIndex)[0];
       setActiveWindow(nextApp ? nextApp.id : null);
    }
  };

  const focusWindow = (id) => {
     const appInstance = windows.find(app => app.id === id);
    if (!appInstance) return;

    if (appInstance.isMinimized) {
        toggleMinimize(id); // Un-minimize if focused
        return;
    }

    if (activeWindow !== id) {
      setActiveWindow(id);
      setWindows(windows.map(w => w.id === id ? { ...w, zIndex: nextZIndex.current++ } : w));
    }
  };

  const toggleMinimize = (id) => {
     setWindows(prev => prev.map(app => {
        if (app.id === id) {
          const isNowMinimized = !app.isMinimized;
          if (isNowMinimized && activeWindow === id) {
            // Find next available window to focus
            const nextApp = prev.filter(a => a.id !== id && !a.isMinimized).sort((a,b) => b.zIndex - a.zIndex)[0];
            setActiveWindow(nextApp ? nextApp.id : null);
          } else if (!isNowMinimized) {
            // Un-minimizing should focus the window
            setActiveWindow(id);
            return { ...app, isMinimized: false, zIndex: nextZIndex.current++ };
          }
          return { ...app, isMinimized: isNowMinimized, isMaximized: false };
        }
        return app;
     }));
  }

  const toggleMaximize = (id) => {
    setWindows(prev => prev.map(app => {
      if (app.id === id) {
        const isNowMaximized = !app.isMaximized;
        if (isNowMaximized) {
          const topBarHeight = 32;
          return {
            ...app,
            isMaximized: true,
            isMinimized: false,
            previousState: { x: app.x, y: app.y, width: app.width, height: app.height },
            x: 0,
            y: topBarHeight,
            width: window.innerWidth,
            height: window.innerHeight - topBarHeight,
          };
        } else {
          // Restore
          return {
            ...app,
            isMaximized: false,
            x: app.previousState?.x ?? app.x,
            y: app.previousState?.y ?? app.y,
            width: app.previousState?.width ?? app.width,
            height: app.previousState?.height ?? app.height,
            previousState: undefined,
          };
        }
      }
      return app;
    }));
    focusWindow(id);
  };


  return (
    <AetherProvider>
      <div ref={desktopRef} className="h-screen w-screen bg-gray-900 overflow-hidden relative">
         <img src="/aether_wallpaper.jpg" className="absolute top-0 left-0 w-full h-full object-cover z-0" alt="desktop wallpaper" />
        <TopBar />
        
        {windows.map((win) => {
          const AppToRender = APPS.find(app => app.id === win.appId).component;
          // Pass the onAppOpen function to apps that need it
          const appProps = { ...win.props, onAppOpen: openApp };
          return (
            <Window
              key={win.id}
              id={win.id}
              title={win.title}
              Icon={win.Icon}
              x={win.x}
              y={win.y}
              width={win.width}
              height={win.height}
              isMinimized={win.isMinimized}
              isMaximized={win.isMaximized}
              zIndex={win.zIndex}
              onClose={() => closeWindow(win.id)}
              onFocus={() => focusWindow(win.id)}
              onMinimize={() => toggleMinimize(win.id)}
              onMaximize={() => toggleMaximize(win.id)}
              isActive={activeWindow === win.id}
              bounds={desktopRef}
            >
              <AppToRender {...appProps} />
            </Window>
          );
        })}
        
        <Dock onAppClick={openApp} openApps={windows} onAppFocus={focusWindow} activeApp={activeWindow} />
      </div>
    </AetherProvider>
  );
};

export default Desktop;
