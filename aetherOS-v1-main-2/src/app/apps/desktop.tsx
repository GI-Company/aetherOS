
'use client';

import Image from "next/image";
import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import TopBar from "@/components/aether-os/top-bar";
import Dock from "@/components/aether-os/dock";
import Window from "@/components/aether-os/window";
import { App, APPS } from "@/lib/apps";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useAether } from "@/firebase";
import AuthForm from "@/firebase/auth/auth-form";
import { Loader2, PartyPopper } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { doc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useInactivityTimer } from "@/hooks/use-inactivity-timer";
import { getAuth, signOut } from "firebase/auth";
import TutorialDialog from "@/components/aether-os/tutorial-dialog";
import { TUTORIALS } from "@/lib/tutorials";

export type WindowInstance = {
  id: number;
  app: App;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
  isMaximized: boolean;
  previousState?: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  },
  props?: Record<string, any>; // For passing props to app components
  isDirty?: boolean; // For tracking unsaved changes in apps like CodeEditor
};

export default function Desktop() {
  const { user, isUserLoading } = useUser();
  const { applyTheme } = useTheme();
  const firestore = useFirestore();
  const aether = useAether();

  const userPreferencesRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || user.isAnonymous) return null;
    return doc(firestore, 'userPreferences', user.uid);
  }, [firestore, user?.uid, user?.isAnonymous]);

  const { data: userPreferences, isLoading: isPreferencesLoading } = useDoc(userPreferencesRef);
  
  const userWorkspaceRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || user.isAnonymous) return null;
    return doc(firestore, 'userWorkspaces', user.uid);
  }, [firestore, user?.uid, user?.isAnonymous]);

  const { data: userWorkspace, isLoading: isWorkspaceLoading } = useDoc(userWorkspaceRef);

  const [openApps, setOpenApps] = useState<WindowInstance[]>([]);
  const [focusedAppId, setFocusedAppId] = useState<number | null>(null);
  const nextId = useRef(0);
  const [highestZIndex, setHighestZIndex] = useState(10);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const { toast } = useToast();
  const desktopRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const isInitialLoad = useRef(true);

  const [showWelcomeTutorial, setShowWelcomeTutorial] = useState(false);
  
  // Presence logic
  useEffect(() => {
    if (!user || user.isAnonymous || !firestore) return;

    const presenceRef = doc(firestore, 'userPresence', user.uid);

    const updatePresence = () => {
        const focusedApp = openApps.find(app => app.id === focusedAppId);
        setDocumentNonBlocking(presenceRef, {
            status: 'online',
            lastSeen: serverTimestamp(),
            displayName: user.displayName,
            photoURL: user.photoURL,
            focusedApp: focusedApp?.app.id || null,
        }, { merge: true });
    };

    updatePresence(); // Initial update

    const interval = setInterval(updatePresence, 60 * 1000); // Update every minute

    return () => clearInterval(interval);

  }, [user, firestore, focusedAppId, openApps]);

  useEffect(() => {
    if (user && !user.isAnonymous && userPreferences) {
      applyTheme(userPreferences as any, false);
      if (!(userPreferences as any).tutorials?.hideWelcomeTutorial) {
        // Use a timeout to let the desktop load before showing the tutorial
        setTimeout(() => setShowWelcomeTutorial(true), 500);
      }
    }
  }, [user, userPreferences, applyTheme]);
  
  const defaultWallpaperUrl = useMemo(() => `https://picsum.photos/seed/${Date.now()}/1920/1080`, []);
  const wallpaperUrl = (userPreferences as any)?.wallpaperUrl || defaultWallpaperUrl;
  const wallpaperHint = (userPreferences as any)?.wallpaperUrl ? "custom wallpaper" : "abstract background";
  
  const auth = getAuth();
  const handleSignOut = useCallback(() => {
    toast({
      title: "Signing Out...",
      description: "You are being signed out due to inactivity."
    });
    signOut(auth);
  }, [auth, toast]);

  const autoSignOutMinutes = (userPreferences as any)?.security?.autoSignOutMinutes ?? 0;
  useInactivityTimer(handleSignOut, autoSignOutMinutes, !user?.isAnonymous);

  // Restore workspace from Firestore on initial load
  useEffect(() => {
    if (isWorkspaceLoading) return; // Wait until loading is complete
    if (user && !user.isAnonymous && isInitialLoad.current) {
      if (userWorkspace && (userWorkspace as any).windows) {
        const restoredWindows = (userWorkspace as any).windows.map((w: any) => {
          const app = APPS.find(app => app.id === w.appId);
          if (!app) return null;
          // Find the max zIndex from restored windows to continue from there
          setHighestZIndex(prev => Math.max(prev, w.zIndex));
          nextId.current = Math.max(nextId.current, w.id + 1);
          return { ...w, app, isDirty: false }; // Initialize isDirty state
        }).filter(Boolean) as WindowInstance[];
        setOpenApps(restoredWindows);
      }
      isInitialLoad.current = false;
    } else if (user?.isAnonymous) {
      // Clear any previous state if user becomes anonymous
      setOpenApps([]);
      isInitialLoad.current = false;
    }
  }, [isWorkspaceLoading, userWorkspace, user]);

  // Save workspace to Firestore on change
  useEffect(() => {
    const handler = setTimeout(() => {
      // Don't save during initial load or for anonymous users
      if (isInitialLoad.current || !user || user.isAnonymous || isWorkspaceLoading) return;

      if (userWorkspaceRef) {
        const windowsToSave = openApps.map(({ app, ...rest }) => ({
          ...rest,
          appId: app.id,
          // We don't save the props or dirty state here for simplicity
          props: {},
          isDirty: false,
        }));
        setDocumentNonBlocking(userWorkspaceRef, { windows: windowsToSave });
      }
    }, 1000); // Debounce saves

    return () => {
      clearTimeout(handler);
    };
  }, [openApps, user, userWorkspaceRef, isWorkspaceLoading]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  const arrangeWindows = useCallback(() => {
    const codeEditor = openApps.find(a => a.app.id === 'code-editor');
    const browser = openApps.find(a => a.app.id === 'browser');
    
    if (!codeEditor || !browser) {
        toast({
            title: "Arrangement Failed",
            description: "Please open both the Code Editor and Browser to arrange them.",
            variant: "destructive"
        })
        return;
    }

    const desktopWidth = desktopRef.current?.clientWidth || window.innerWidth;
    const desktopHeight = desktopRef.current?.clientHeight || window.innerHeight;
    const topBarHeight = 32;

    const updates = new Map<number, Partial<WindowInstance>>();

    updates.set(browser.id, {
        position: { x: 0, y: topBarHeight },
        size: { width: desktopWidth / 2, height: desktopHeight - topBarHeight },
        isMaximized: false,
        isMinimized: false,
    });

    updates.set(codeEditor.id, {
        position: { x: desktopWidth / 2, y: topBarHeight },
        size: { width: desktopWidth / 2, height: desktopHeight - topBarHeight },
        isMaximized: false,
        isMinimized: false,
    });

    if (updates.size > 0) {
        let newZIndex = highestZIndex;
        setOpenApps(prev => prev.map(app => {
            const appUpdate = updates.get(app.id);
            if (appUpdate) {
                newZIndex++;
                return { ...app, ...appUpdate, zIndex: newZIndex };
            }
            return app;
        }));
        setHighestZIndex(newZIndex);
        setFocusedAppId(codeEditor.id);

        toast({
          title: "Windows Arranged",
          description: "Code Editor and Browser are now side-by-side.",
        });
    }
  }, [openApps, highestZIndex, toast]);

  const openApp = useCallback((app: App, props: Record<string, any> = {}) => {
    const existingAppInstance = openApps.find(a => a.app.id === app.id);
    if (existingAppInstance) {
        if (existingAppInstance.isMinimized) {
            toggleMinimize(existingAppInstance.id);
        } else {
            focusApp(existingAppInstance.id);
        }
        if(Object.keys(props).length > 0) {
          setOpenApps(prev => prev.map(a => a.id === existingAppInstance.id ? { ...a, props: {...a.props, ...props}} : a));
        }
        return;
    }

    const currentId = nextId.current;
    setHighestZIndex((prev) => prev + 1);
    const newWindow: WindowInstance = {
      id: currentId,
      app: app,
      position: { x: 50 + (currentId % 10) * 20, y: 50 + (currentId % 10) * 20 },
      size: app.defaultSize,
      zIndex: highestZIndex + 1,
      isMinimized: false,
      isMaximized: false,
      isDirty: false,
      props,
    };
    setOpenApps((prev) => [...prev, newWindow]);
    setFocusedAppId(currentId);
    nextId.current += 1;
  }, [highestZIndex, openApps]);
  
  const closeApp = (id: number) => {
    setOpenApps((prev) => prev.filter((app) => app.id !== id));
  };

  const focusApp = (id: number) => {
    const appInstance = openApps.find(app => app.id === id);
    if (!appInstance) return;

    if (appInstance.isMinimized) {
        toggleMinimize(id);
        return;
    }

    setFocusedAppId(id);
    if (appInstance.zIndex === highestZIndex) return;
    
    setHighestZIndex((prev) => prev + 1);
    setOpenApps((prev) =>
      prev.map((app) =>
        app.id === id ? { ...app, zIndex: highestZIndex + 1 } : app
      )
    );
  };

  const setAppDirtyState = useCallback((id: number, isDirty: boolean) => {
    setOpenApps(prev => prev.map(app => app.id === id ? { ...app, isDirty } : app));
  }, []);
  
  const updateAppPosition = (id: number, position: { x: number, y: number }) => {
    setOpenApps(prev => prev.map(app => app.id === id ? { ...app, position } : app));
  };

  const updateAppSize = (id: number, size: { width: number, height: number }) => {
    setOpenApps(prev => prev.map(app => app.id === id ? { ...app, size } : app));
  };

  const toggleMinimize = (id: number) => {
     setOpenApps(prev => prev.map(app => {
        if (app.id === id) {
          const isNowMinimized = !app.isMinimized;
          if (isNowMinimized && focusedAppId === id) {
            const nextApp = prev.filter(a => a.id !== id && !a.isMinimized).sort((a,b) => b.zIndex - a.zIndex)[0];
            setFocusedAppId(nextApp ? nextApp.id : null);
          } else if (!isNowMinimized) {
            focusApp(id);
            return { ...app, isMinimized: false, zIndex: highestZIndex + 1 };
          }
          return { ...app, isMinimized: isNowMinimized, isMaximized: false };
        }
        return app;
     }));
  }

  const toggleMaximize = (id: number) => {
    setOpenApps(prev => prev.map(app => {
      if (app.id === id) {
        const isNowMaximized = !app.isMaximized;
        if (isNowMaximized) {
          const topBarHeight = 32;
          return {
            ...app,
            isMaximized: true,
            previousState: { position: app.position, size: app.size },
            position: { x: 0, y: topBarHeight },
            size: {
              width: window.innerWidth,
              height: window.innerHeight - topBarHeight,
            }
          };
        } else {
          return {
            ...app,
            isMaximized: false,
            position: app.previousState?.position || app.position,
            size: app.previousState?.size || app.size,
            previousState: undefined,
          };
        }
      }
      return app;
    }));
  };
  
 const openFileOrApp = (appOrPath: App | string, props?: Record<string, any>) => {
    if (typeof appOrPath === 'string') {
        const filePath = appOrPath;
        const fileExtension = filePath.split('.').pop()?.toLowerCase();
        const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];

        let appToOpen;
        let finalProps: Record<string, any> = { ...props };

        if (fileExtension && imageExtensions.includes(fileExtension)) {
            appToOpen = APPS.find(a => a.id === 'image-viewer');
            finalProps.filePath = filePath;
        } else {
            appToOpen = APPS.find(a => a.id === 'code-editor');
            finalProps.fileToOpen = filePath;
        }

        if (appToOpen) {
            openApp(appToOpen, finalProps);
        } else {
            toast({ title: "Error", description: "Could not find a suitable application to open this file.", variant: "destructive" });
        }
    } else {
        openApp(appOrPath, props);
    }
 }

  const onUpgradeSuccess = () => {
    setUpgradeDialogOpen(false);
    toast({
      title: 'Account Upgraded!',
      description: 'Your settings and themes are now saved to your permanent account.',
      icon: <PartyPopper className="h-5 w-5 text-green-500" />,
    });
  }

  const setWallpaper = (imageUrl: string) => {
    if (userPreferencesRef) {
      setDocumentNonBlocking(userPreferencesRef, { wallpaperUrl: imageUrl }, { merge: true });
      toast({
        title: "Wallpaper Set!",
        description: "Your new desktop background has been applied."
      });
    }
  }

  const handleFinishWelcomeTutorial = (dontShowAgain: boolean) => {
    setShowWelcomeTutorial(false);
    if (dontShowAgain && userPreferencesRef) {
        setDocumentNonBlocking(userPreferencesRef, {
            tutorials: { hideWelcomeTutorial: true }
        }, { merge: true });
    }
  };

  const handleHideAppTutorial = useCallback((appId: string) => {
    if (userPreferencesRef) {
        setDocumentNonBlocking(userPreferencesRef, {
            tutorials: { hiddenAppTutorials: arrayUnion(appId) }
        }, { merge: true });
    }
  }, [userPreferencesRef]);


  if (isUserLoading || (user && !user.isAnonymous && (isPreferencesLoading || isWorkspaceLoading))) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-background font-body flex flex-col" ref={desktopRef}>
      {wallpaperUrl && (
        <Image
          src={wallpaperUrl}
          alt="AetherOS session wallpaper"
          data-ai-hint={wallpaperHint}
          fill
          quality={100}
          className="object-cover z-0"
          priority
        />
      )}
      <div className="relative z-10 flex-grow w-full flex flex-col" ref={desktopRef}>
        <TopBar onUpgrade={() => setUpgradeDialogOpen(true)} />

        {showWelcomeTutorial && TUTORIALS.welcome && (
            <TutorialDialog
                tutorial={TUTORIALS.welcome}
                onFinish={handleFinishWelcomeTutorial}
                onSkip={() => setShowWelcomeTutorial(false)}
            />
        )}

        <div className="flex-grow relative" >
          {openApps.map((window) => {
            const AppComponent = window.app.component;
            const componentProps: any = { ...window.props };

            if (window.app.id === 'code-editor') {
              componentProps.isDirty = window.isDirty;
              componentProps.setIsDirty = (isDirty: boolean) => setAppDirtyState(window.id, isDirty);
            }
            if (window.app.id === 'file-explorer' || window.app.id === 'people') {
              componentProps.onOpenFile = openFileOrApp;
            }
             if (window.app.id === 'settings' || window.app.id === 'collaboration' || window.app.id === 'people') {
              componentProps.onOpenApp = openApp;
            }

            return (
              <Window
                key={window.id}
                instance={window}
                onClose={() => closeApp(window.id)}
                onFocus={() => focusApp(window.id)}
                onMinimize={() => toggleMinimize(window.id)}
                onMaximize={() => toggleMaximize(window.id)}
                updatePosition={updateAppPosition}
                updateSize={updateAppSize}
                isFocused={focusedAppId === window.id}
                bounds={desktopRef}
                dockRef={dockRef}
                userPreferences={userPreferences}
                onHideTutorial={handleHideAppTutorial}
              >
                 <AppComponent {...componentProps} />
              </Window>
            );
          })}
        </div>
        <Dock ref={dockRef} onAppClick={openApp} openApps={openApps} onAppFocus={focusApp} focusedAppId={focusedAppId}/>
      </div>
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Upgrade Your Account</DialogTitle>
                    <DialogDescription>
                        Create a permanent account to save your work and unlock all features.
                    </DialogDescription>
                </DialogHeader>
                <AuthForm allowAnonymous={false} onUpgradeSuccess={onUpgradeSuccess} />
            </DialogContent>
        </Dialog>
    </div>
  );
}
