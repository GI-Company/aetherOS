
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, Timestamp, limit, where } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Users, UserPlus } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { APPS, App } from '@/lib/apps';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Timestamp | null;
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
}

interface UserPresence {
    id: string;
    status: 'online' | 'offline';
    lastSeen: Timestamp;
    displayName: string;
    photoURL: string;
    focusedApp?: string;
}

interface CollaborationAppProps {
  onOpenApp?: (app: App, props?: Record<string, any>) => void;
}

const getInitials = (name?: string | null) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length > 1) {
        return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
};

const PresenceList = () => {
    const { firestore } = useFirebase();
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    const presenceQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'userPresence'),
            where('lastSeen', '>', thirtyMinutesAgo),
            orderBy('lastSeen', 'desc'),
            limit(25)
        );
    }, [firestore, thirtyMinutesAgo.getTime()]); // Depend on time to refetch periodically if needed

    const { data: onlineUsers, isLoading } = useCollection<UserPresence>(presenceQuery);
    
    const getAppInfo = (appId?: string) => {
        if (!appId) return null;
        return APPS.find(app => app.id === appId);
    }

    return (
        <div className="w-full md:w-64 flex-shrink-0 border-l bg-card/50 p-4">
            <h4 className="text-md font-headline mb-4">Online Now ({onlineUsers?.length ?? 0})</h4>
             <ScrollArea className="h-full">
                 <div className="space-y-4">
                    {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    ) : onlineUsers && onlineUsers.length > 0 ? (
                        onlineUsers.map(pUser => {
                            const appInfo = getAppInfo(pUser.focusedApp);
                            return (
                                <div key={pUser.id} className="flex items-start gap-3">
                                    <Avatar className="h-8 w-8 relative flex-shrink-0">
                                        <AvatarImage src={pUser.photoURL} />
                                        <AvatarFallback>{getInitials(pUser.displayName)}</AvatarFallback>
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />
                                    </Avatar>
                                    <div className="text-sm overflow-hidden">
                                        <p className="font-medium truncate">{pUser.displayName}</p>
                                        {appInfo ? (
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
                            )
                        })
                    ) : (
                        <p className="text-sm text-muted-foreground text-center">No other users are currently active.</p>
                    )}
                 </div>
            </ScrollArea>
        </div>
    )
}

export default function CollaborationApp({ onOpenApp }: CollaborationAppProps) {
  const { firestore, user } = useFirebase();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore]);

  const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !firestore || user.isAnonymous) {
      return;
    }

    const messagePayload = {
      text: newMessage,
      timestamp: serverTimestamp(),
      senderId: user.uid,
      senderName: user.displayName || 'Unnamed User',
      senderPhotoURL: user.photoURL || '',
    };
    
    const messagesCollectionRef = collection(firestore, 'messages');
    addDocumentNonBlocking(messagesCollectionRef, messagePayload);

    setNewMessage('');
  };

  const openSettingsToAccountTab = () => {
    const settingsApp = APPS.find(app => app.id === 'settings');
    if (settingsApp && onOpenApp) {
      // Pass props to indicate which tab to open
      onOpenApp(settingsApp, { defaultTab: 'account' });
    }
  }

  const renderInputArea = () => {
    if (user?.isAnonymous) {
      return (
        <div className="text-center p-4 border-t bg-card text-muted-foreground text-sm">
          <p className="mb-2">You are in trial mode. Please upgrade to a full account to send messages.</p>
          <Button variant="secondary" onClick={openSettingsToAccountTab}>
            <UserPlus className="mr-2 h-4 w-4"/>
            Upgrade Account
          </Button>
        </div>
      )
    }

    return (
       <div className="flex-shrink-0 p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={isLoading}
          />
          <Button type="submit" disabled={!newMessage.trim() || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-background flex-row">
      <div className="flex flex-col flex-grow">
        <div className="flex-shrink-0 p-3 border-b flex items-center gap-2">
          <Users className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-headline">Global Chat</h3>
        </div>
        
        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : messages && messages.length > 0 ? (
            <div className="space-y-6">
              {messages.map((msg) => {
                  const isCurrentUser = msg.senderId === user?.uid;
                  return (
                      <div key={msg.id} className={cn("flex items-start gap-3", isCurrentUser && "justify-end")}>
                          {!isCurrentUser && (
                              <Avatar className="h-8 w-8">
                                  <AvatarImage src={msg.senderPhotoURL} />
                                  <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                              </Avatar>
                          )}
                          <div className={cn(
                              "p-3 rounded-lg max-w-xs md:max-w-md",
                              isCurrentUser ? "bg-primary text-primary-foreground" : "bg-muted"
                          )}>
                              {!isCurrentUser && <p className="text-xs font-semibold mb-1 text-foreground">{msg.senderName}</p>}
                              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                              <p className={cn("text-xs mt-1 opacity-70", isCurrentUser ? "text-right" : "text-left")}>
                                  {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : 'sending...'}
                              </p>
                          </div>
                          {isCurrentUser && (
                              <Avatar className="h-8 w-8">
                                  <AvatarImage src={user?.photoURL || ''} />
                                  <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                              </Avatar>
                          )}
                      </div>
                  )
              })}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <p>No messages yet. Be the first to say something!</p>
            </div>
          )}
        </ScrollArea>

        {renderInputArea()}
      </div>
      
      <PresenceList />
    </div>
  );
}
