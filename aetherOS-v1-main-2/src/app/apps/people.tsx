
'use client';

import React, { useState, useEffect } from 'react';
import { Users, ArrowLeft } from 'lucide-react';
import UserProfileCard from '@/components/aether-os/user-profile-card';
import { Button } from '@/components/ui/button';
import { App } from '@/lib/apps';
import PeoplePanel from '@/components/aether-os/people-panel';

interface PeopleAppProps {
  selectedUserId?: string;
  onOpenApp?: (app: App, props?: Record<string, any>) => void;
  onOpenFile?: (filePath: string, content?: string) => void;
}

export default function PeopleApp({ selectedUserId: initialUserId, onOpenApp, onOpenFile }: PeopleAppProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(initialUserId);

  useEffect(() => {
    if(initialUserId) {
        setSelectedUserId(initialUserId);
    }
  }, [initialUserId])

  const handleBack = () => {
    setSelectedUserId(undefined);
  };

  if (!selectedUserId) {
    return (
      <div className="h-full bg-background flex flex-col">
        <div className="flex-shrink-0 p-3 border-b flex items-center gap-2">
            <Users className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-headline">People</h3>
        </div>
        <PeoplePanel onSelectUser={setSelectedUserId} />
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex-shrink-0 p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="mr-2 h-4 w-4"/>
                Back
            </Button>
            <h3 className="text-lg font-headline">User Profile</h3>
        </div>
      </div>
      <UserProfileCard userId={selectedUserId} onBack={handleBack} onOpenFile={onOpenFile} />
    </div>
  );
}
