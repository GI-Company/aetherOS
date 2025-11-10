
'use client';

import React from 'react';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APPS } from '@/lib/apps';
import { Skeleton } from '@/components/ui/skeleton';
import { useSpring, animated } from '@react-spring/web';

interface UserProfileCardProps {
  userId: string;
  onBack: () => void;
}

const getInitials = (name?: string | null) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length > 1) {
        return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
};

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
    return <animated.span style={styles}>Typing...</animated.span>
}


export default function UserProfileCard({ userId, onBack }: UserProfileCardProps) {
  const { firestore } = useFirebase();

  const userRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'users', userId);
  }, [firestore, userId]);

  const presenceRef = useMemoFirebase(() => {
    if (!firestore || !userId) return null;
    return doc(firestore, 'userPresence', userId);
  }, [firestore, userId]);

  const { data: userData, isLoading: isUserLoading } = useDoc(userRef);
  const { data: presenceData, isLoading: isPresenceLoading } = useDoc(presenceRef);
  
  const isLoading = isUserLoading || isPresenceLoading;

  const appInfo = APPS.find(app => app.id === (presenceData as any)?.focusedApp);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4">
        <p className="text-muted-foreground mb-4">User not found.</p>
        <Button variant="outline" onClick={onBack} className="hidden">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to List
        </Button>
      </div>
    );
  }

  const { displayName, email, photoURL } = userData as any;
  const status = (presenceData as any)?.status || 'offline';
  const isTyping = (presenceData as any)?.isTyping || false;

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader className="items-center text-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={photoURL} />
            <AvatarFallback className="text-3xl">{getInitials(displayName)}</AvatarFallback>
          </Avatar>
          <CardTitle className="text-2xl">{displayName}</CardTitle>
          {email && (
            <p className="text-muted-foreground flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                {email}
            </p>
          )}
        </CardHeader>
        <CardContent>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">Status</h3>
             <Card className="p-4 bg-background/50">
                {isPresenceLoading ? <Skeleton className="h-6 w-1/2" /> : (
                    <div className="flex items-center gap-3">
                         <div className={`w-3 h-3 rounded-full ${status === 'online' ? (isTyping ? 'bg-blue-500' : 'bg-green-500') : 'bg-gray-500'}`} />
                         {isTyping ? (
                            <span className="text-sm italic text-blue-400">
                                <TypingIndicator />
                            </span>
                         ) : appInfo ? (
                            <div className="flex items-center gap-2 text-sm">
                                <appInfo.Icon className="h-4 w-4" />
                                <span>Active in <strong>{appInfo.name}</strong></span>
                            </div>
                         ) : (
                            <span className="text-sm capitalize">{status}</span>
                         )}
                    </div>
                )}
            </Card>
        </CardContent>
      </Card>
    </div>
  );
}
