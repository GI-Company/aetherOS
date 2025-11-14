import React from 'react';
import { APPS } from '../lib/apps';
import { cn } from '../lib/utils';

const Dock = ({ onAppClick, openApps, onAppFocus, activeApp }) => {

    const handleAppClick = (app) => {
        const runningApp = openApps.find(w => w.appId === app.id);
        if (runningApp) {
            onAppFocus(runningApp.id);
        } else {
            onAppClick(app);
        }
    };

    return (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
            <div className="flex items-end h-20 p-2 space-x-2 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
                {APPS.map(app => {
                    const isRunning = openApps.some(w => w.appId === app.id);
                    const isActive = isRunning && openApps.find(w => w.appId === app.id).id === activeApp;

                    return (
                        <div key={app.id} className="flex flex-col items-center" >
                            <button
                                onClick={() => handleAppClick(app)}
                                className="w-16 h-16 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                title={app.name}
                            >
                                <app.Icon className="w-10 h-10 text-white drop-shadow-lg" />
                            </button>
                             {isRunning && (
                                <div className={cn(
                                    'w-1.5 h-1.5 rounded-full mt-1',
                                    isActive ? 'bg-blue-400' : 'bg-gray-400'
                                    )} />
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

export default Dock;
