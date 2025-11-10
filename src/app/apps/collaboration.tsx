
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, Timestamp, doc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, UserPlus, MessagesSquare, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { APPS, App } from '@/lib/apps';
import PeoplePanel from '@/components/aether-os/people-panel';
import { useSpring, animated } from '@react-spring/web';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Timestamp | null;
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
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

export default function CollaborationApp({ onOpenApp }: CollaborationAppProps) {
  const { firestore, user } = useFirebase();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore || !user?.emailVerified) return null;
    return query(collection(firestore, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore, user?.emailVerified]);

  const { data: serverMessages, isLoading, error } = useCollection<ChatMessage>(messagesQuery);
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  
  const presenceRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || user.isAnonymous) return null;
    return doc(firestore, 'userPresence', user.uid);
  }, [firestore, user?.uid, user?.isAnonymous]);

  const messages = React.useMemo(() => {
    if (!user?.emailVerified) return [];
    const combined = [...(serverMessages || []), ...optimisticMessages];
    const uniqueMessages = Array.from(new Map(combined.map(m => [m.id, m])).values());
    return uniqueMessages.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return a.timestamp.toMillis() - b.timestamp.toMillis();
    });
  }, [serverMessages, optimisticMessages, user?.emailVerified]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !firestore || user.isAnonymous || !user.emailVerified) {
      return;
    }

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      text: newMessage,
      timestamp: null, // Indicate optimistic state
      senderId: user.uid,
      senderName: user.displayName || 'Unnamed User',
      senderPhotoURL: user.photoURL || '',
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMessage]);

    const messagePayload = {
      text: newMessage,
      timestamp: serverTimestamp(),
      senderId: user.uid,
      senderName: user.displayName || 'Unnamed User',
      senderPhotoURL: user.photoURL || '',
    };
    
    const messagesCollectionRef = collection(firestore, 'messages');
    addDocumentNonBlocking(messagesCollectionRef, messagePayload).then(docRef => {
        // Once the message is saved, we can remove the optimistic one.
        // The real one will come in via the `useCollection` hook.
        if (docRef) {
            setOptimisticMessages(prev => prev.filter(m => m.id !== optimisticId));
        }
    });

    setNewMessage('');
    if (presenceRef) {
        // Use a small timeout to prevent race condition with handleTyping
        setTimeout(() => {
            setDocumentNonBlocking(presenceRef, { isTyping: false }, { merge: true });
        }, 100);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  }, [newMessage, user, firestore, presenceRef]);
  
  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!presenceRef) return;

    // Set isTyping to true immediately
    setDocumentNonBlocking(presenceRef, { isTyping: true }, { merge: true });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
    }

    // Set a new timeout to mark as not typing after 2 seconds
    typingTimeoutRef.current = setTimeout(() => {
        setDocumentNonBlocking(presenceRef, { isTyping: false }, { merge: true });
    }, 2000);
  }

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
         // Set typing to false when the component unmounts
        if (presenceRef) {
            setDocumentNonBlocking(presenceRef, { isTyping: false }, { merge: true });
        }
    }
  }, [presenceRef]);

  const openSettingsToAccountTab = () => {
    const settingsApp = APPS.find(app => app.id === 'settings');
    if (settingsApp && onOpenApp) {
      // Pass props to indicate which tab to open
      onOpenApp(settingsApp, { defaultTab: 'account' });
    }
  }

  const openPeopleAppWithUser = (userId: string) => {
      const peopleApp = APPS.find(app => app.id === 'people');
      if (peopleApp && onOpenApp) {
          onOpenApp(peopleApp, { selectedUserId: userId });
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

    if (user && !user.emailVerified) {
         return (
            <div className="text-center p-4 border-t bg-card text-muted-foreground text-sm">
            <p className="mb-2">Please verify your email address to participate in the chat.</p>
            <Button variant="secondary" onClick={openSettingsToAccountTab}>
                <ShieldCheck className="mr-2 h-4 w-4"/>
                Go to Account Settings
            </Button>
            </div>
        )
    }

    return (
       <div className="flex-shrink-0 p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={handleTyping}
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
  
  const handleSelectUser = (userId: string) => {
    openPeopleAppWithUser(userId);
  }
  
  const renderMessageArea = () => {
    if (isLoading && messages.length === 0 && user?.emailVerified) {
      return (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }
    
    if (error) {
        return (
            <div className="flex flex-col justify-center items-center h-full text-muted-foreground p-4 text-center">
                <ShieldCheck className="h-10 w-10 mb-4 text-destructive"/>
                <p className="font-semibold text-foreground">Chat Locked</p>
                <p className="text-sm">Please verify your email address to view and send messages.</p>
            </div>
        );
    }

    if (messages.length > 0) {
      return (
        <div className="space-y-6">
          {messages.map((msg) => {
            const isCurrentUser = msg.senderId === user?.uid;
            return (
              <div key={msg.id} className={cn("flex items-start gap-3", isCurrentUser && "justify-end")}>
                {!isCurrentUser && (
                  <button onClick={() => openPeopleAppWithUser(msg.senderId)} className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={msg.senderPhotoURL} />
                      <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                    </Avatar>
                  </button>
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
                  <button onClick={() => openPeopleAppWithUser(msg.senderId)} className="flex-shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarImage src={user?.photoURL || ''} />
                      <AvatarFallback>{getInitials(user?.displayName)}</AvatarFallback>
                    </Avatar>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex justify-center items-center h-full text-muted-foreground">
        <p>No messages yet. Be the first to say something!</p>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background flex-row">
      <div className="flex flex-col flex-grow">
        <div className="flex-shrink-0 p-3 border-b flex items-center gap-2">
          <MessagesSquare className="h-5 w-5 text-accent" />
          <h3 className="text-lg font-headline">Global Chat</h3>
        </div>
        
        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
          {renderMessageArea()}
        </ScrollArea>

        {renderInputArea()}
      </div>
      <div className="w-[240px] border-l flex-shrink-0">
          <PeoplePanel onSelectUser={handleSelectUser} />
      </div>
    </div>
  );
}

    