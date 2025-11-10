
'use client';

import React from 'react';
import { Users } from 'lucide-react';
import PeoplePanel from '@/components/aether-os/people-panel';


export default function PeopleApp() {
    return (
        <div className="h-full bg-background flex flex-col">
            <div className="flex-shrink-0 p-3 border-b flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                <h3 className="text-lg font-headline">Online Users</h3>
            </div>
            <PeoplePanel showTitle={false} />
        </div>
    )
}
