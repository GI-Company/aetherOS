'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useFirebase, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: Timestamp | null;
  senderId: string;
  senderName: string;
  senderPhotoURL: string;
}

export default function CollaborationApp() {
  const { firestore, user } = useFirebase();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const messagesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'messages'), orderBy('timestamp', 'asc'));
  }, [firestore]);

  const { data: messages, isLoading } = useCollection<ChatMessage>(messagesQuery);

  const getInitials = (name?: string | null) => {
    if (!name) return "??";
    const names = name.split(' ');
    if (names.length > 1) {
      return names[0][0] + names[names.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
  }

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
    if (!newMessage.trim() || !user || !firestore) {
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "You must be signed in to send messages.",
          variant: "destructive"
        });
      }
      return;
    }
    
    if (user.isAnonymous) {
      toast({
        title: "Feature Unavailable in Trial Mode",
        description: "Please upgrade to a permanent account to use chat.",
        variant: "destructive"
      });
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

  return (
    <div className="flex flex-col h-full bg-background">
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
                            {!isCurrentUser && <p className="text-xs font-semibold mb-1">{msg.senderName}</p>}
                            <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                            <p className={cn("text-xs mt-1 opacity-70", isCurrentUser ? "text-right" : "text-left")}>
                                {msg.timestamp ? format(msg.timestamp.toDate(), 'p') : 'sending...'}
                            </p>
                        </div>
                         {isCurrentUser && (
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={msg.senderPhotoURL} />
                                <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
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

      <div className="flex-shrink-0 p-4 border-t bg-card">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={user?.isAnonymous || isLoading}
          />
          <Button type="submit" disabled={!newMessage.trim() || user?.isAnonymous || isLoading}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
