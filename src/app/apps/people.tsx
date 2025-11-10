
'use client';

import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import PeoplePanel from '@/components/aether-os/people-panel';
import UserProfileCard from '@/components/aether-os/user-profile-card';

interface PeopleAppProps {
  selectedUserId?: string;
}

export default function PeopleApp({ selectedUserId: initialUserId }: PeopleAppProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | undefined>(initialUserId);

  useEffect(() => {
    setSelectedUserId(initialUserId);
  }, [initialUserId]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
  };

  const handleBack = () => {
    setSelectedUserId(undefined);
  };

  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex-shrink-0 p-3 border-b flex items-center gap-2">
        <Users className="h-5 w-5 text-accent" />
        <h3 className="text-lg font-headline">
          {selectedUserId ? 'User Profile' : `People`}
        </h3>
      </div>
      {selectedUserId ? (
        <UserProfileCard userId={selectedUserId} onBack={handleBack} />
      ) : (
        <PeoplePanel showTitle={false} onSelectUser={handleSelectUser} />
      )}
    </div>
  );
}
