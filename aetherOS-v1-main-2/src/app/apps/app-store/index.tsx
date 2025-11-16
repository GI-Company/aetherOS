
'use client';

import React, { useState, useEffect } from 'react';
import { useAppAether } from '@/lib/use-app-aether';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { APPS } from '@/lib/apps';
import { Download, CheckCircle, Loader2 } from 'lucide-react';
import appRegistry from '@/lib/app-registry.json';
import { useToast } from '@/hooks/use-toast';

interface InstallableApp {
    id: string;
    manifest: any;
    wasmBase64: string;
}

export default function AppStoreApp() {
    const { publish, subscribe } = useAppAether();
    const { toast } = useToast();
    const [installedApps, setInstalledApps] = useState<Set<string>>(new Set(APPS.map(app => app.manifest.id)));
    const [installingApps, setInstallingApps] = useState<Set<string>>(new Set());

    useEffect(() => {
        const handleResult = (payload: any) => {
            setInstalledApps(prev => new Set(prev).add(payload.appId));
            setInstallingApps(prev => {
                const next = new Set(prev);
                next.delete(payload.appId);
                return next;
            });
            toast({
                title: 'Installation Success',
                description: payload.message,
            });
        };

        const handleError = (payload: any) => {
            const appId = payload.appId;
            if (appId) {
                setInstallingApps(prev => {
                    const next = new Set(prev);
                    next.delete(appId);
                    return next;
                });
            }
            toast({
                title: 'Installation Failed',
                description: payload.error,
                variant: 'destructive',
            });
        };

        const resultSub = subscribe('system:install:app:result', handleResult);
        const errorSub = subscribe('system:install:app:error', handleError);

        return () => {
            resultSub();
            errorSub();
        };
    }, [subscribe, toast]);


    const handleInstall = (app: InstallableApp) => {
        setInstallingApps(prev => new Set(prev).add(app.id));
        publish('system:install:app', {
            manifest: app.manifest,
            wasmBase64: app.wasmBase64,
        });
    };

    return (
        <div className="p-4 md:p-8 h-full bg-background overflow-y-auto">
            <h2 className="text-3xl font-headline mb-2">App Store</h2>
            <p className="text-muted-foreground mb-8">Discover and install new applications for AetherOS.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {appRegistry.applications.map((app) => {
                    const isInstalled = installedApps.has(app.id);
                    const isInstalling = installingApps.has(app.id);
                    return (
                        <Card key={app.id}>
                            <CardHeader>
                                <CardTitle>{app.manifest.name}</CardTitle>
                                <CardDescription>{app.manifest.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground">Version: {app.manifest.version}</p>
                                <p className="text-xs text-muted-foreground">Developer: {app.manifest.developer}</p>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    disabled={isInstalled || isInstalling}
                                    onClick={() => handleInstall(app)}
                                >
                                    {isInstalling ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : isInstalled ? (
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    {isInstalling ? 'Installing...' : isInstalled ? 'Installed' : 'Install'}
                                </Button>
                            </CardFooter>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
}
