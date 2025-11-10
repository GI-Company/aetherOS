
'use client';

import React, { useState, useEffect } from 'react';
import { Users, ArrowLeft } from 'lucide-react';
import UserProfileCard from '@/components/aether-os/user-profile-card';
import { Button } from '@/components/ui/button';
import { App } from '@/lib/apps';

interface PeopleAppProps {
  selectedUserId?: string;
  onOpenApp?: (app: App, props?: Record<string, any>) => void;
}

export default function PeopleApp({ selectedUserId, onOpenApp }: PeopleAppProps) {
  if (!selectedUserId) {
    return (
      <div className="h-full bg-background flex flex-col items-center justify-center p-4">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-headline">No User Selected</h3>
        <p className="text-sm text-muted-foreground text-center">
          Open this app by selecting a user from the Collaboration app's people panel.
        </p>
      </div>
    );
  }

  const handleBack = () => {
    // A better implementation might close the current window and focus the collaboration app
    console.log("Back action triggered");
  };

  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex-shrink-0 p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-headline">User Profile</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={handleBack} className="hidden">
            <ArrowLeft className="mr-2 h-4 w-4"/>
            Back
        </Button>
      </div>
      <UserProfileCard userId={selectedUserId} onBack={handleBack} />
    </div>
  );
}
