
'use client';

import React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, limit, where } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { APPS } from '@/lib/apps';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { animated, useSpring } from '@react-spring/web';

interface UserPresence {
    id: string;
    status: 'online' | 'offline';
    lastSeen: Timestamp;
    displayName: string;
    photoURL: string;
    focusedApp?: string;
    isTyping?: boolean;
}

const getInitials = (name?: string | null) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length > 1) {
        return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
};

interface PeoplePanelProps {
    showTitle?: boolean;
    onSelectUser?: (userId: string) => void;
}

const TypingIndicator = () => {
    const styles = useSpring({
        from: { opacity: 0.5, transform: 'translateY(2px)' },
        to: async (next) => {
            while (1) {
                await next({ opacity: 1, transform: 'translateY(0px)' })
                await next({ opacity: 0.5, transform: 'translateY(2px)' })
            }
        },
        config: { duration: 500 },
    })
    return <animated.span style={styles}>typing...</animated.span>
}


export default function PeoplePanel({ showTitle = true, onSelectUser }: PeoplePanelProps) {
    const { firestore, user } = useFirebase();
    const thirtyMinutesAgo = React.useMemo(() => new Date(Date.now() - 30 * 60 * 1000), []);

    const presenceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'userPresence'),
            where('lastSeen', '>', thirtyMinutesAgo),
            orderBy('lastSeen', 'desc'),
            limit(25)
        );
    }, [firestore, thirtyMinutesAgo]);

    const { data: onlineUsers, isLoading } = useCollection<UserPresence>(presenceQuery);
    
    const getAppInfo = (appId?: string) => {
        if (!appId) return null;
        return APPS.find(app => app.id === appId);
    }

    const handleUserClick = (userId: string) => {
        if (onSelectUser) {
            onSelectUser(userId);
        }
    }

    return (
        <div className="h-full bg-background flex flex-col">
            {showTitle && (
                <div className="flex-shrink-0 p-3 border-b flex items-center gap-2">
                    <Users className="h-5 w-5 text-accent" />
                    <h3 className="text-lg font-headline">Online Users ({onlineUsers?.length ?? 0})</h3>
                </div>
            )}
             <ScrollArea className="h-full">
                 <div className="p-4 space-y-4">
                    {isLoading ? (
                        <div className="flex justify-center pt-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : onlineUsers && onlineUsers.length > 0 ? (
                        onlineUsers.map(pUser => {
                            const appInfo = getAppInfo(pUser.focusedApp);
                            const userCard = (
                                <Card className="p-3 bg-card/50">
                                    <div className="flex items-start gap-3">
                                        <Avatar className="h-10 w-10 relative flex-shrink-0">
                                            <AvatarImage src={pUser.photoURL} />
                                            <AvatarFallback>{getInitials(pUser.displayName)}</AvatarFallback>
                                            <div className={cn(
                                                "absolute bottom-0 right-0 w-3 h-3 border-2 border-card rounded-full",
                                                pUser.isTyping ? "bg-blue-500 animate-pulse" : "bg-green-500"
                                            )} />
                                        </Avatar>
                                        <div className="text-sm overflow-hidden">
                                            <p className="font-semibold truncate">{pUser.displayName}</p>
                                            {pUser.isTyping ? (
                                                <div className="text-xs text-blue-400">
                                                    <TypingIndicator />
                                                </div>
                                            ) : appInfo ? (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                                    <appInfo.Icon className="h-3 w-3" />
                                                    <span className="truncate">in {appInfo.name}</span>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">
                                                    Active {formatDistanceToNow(pUser.lastSeen.toDate(), { addSuffix: true })}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            );

                            return onSelectUser ? (
                                <button key={pUser.id} onClick={() => handleUserClick(pUser.id)} className="w-full text-left focus:outline-none focus:ring-2 focus:ring-ring rounded-lg">
                                    {userCard}
                                </button>
                            ) : (
                                <div key={pUser.id}>{userCard}</div>
                            );
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center pt-8">No other users are currently active.</p>
                    )}
                 </div>
            </ScrollArea>
        </div>
    )
}
