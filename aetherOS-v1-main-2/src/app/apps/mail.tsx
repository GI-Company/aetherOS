
'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Send,
  FileText,
  Trash2,
  Archive,
  Star,
  Clock,
  MoreVertical,
  Reply,
  ReplyAll,
  Forward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const placeholderEmails = [
  {
    id: 1,
    sender: 'AetherOS Team',
    avatar: '/aether-logo.png', // You'll need a logo file
    initials: 'AT',
    subject: 'Welcome to AetherOS!',
    body: `
<p>Hello,</p>
<p>Welcome to <strong>AetherOS</strong>, the next generation of operating systems. We're excited to have you on board.</p>
<p>Here are a few things you can try:</p>
<ul>
  <li>Open the Command Palette (Cmd/Ctrl + K) and type "I need an image of a cat".</li>
  <li>Try our Design Studio to generate UI components from a text prompt.</li>
  <li>Explore the File Explorer and try out semantic search.</li>
</ul>
<p>We're constantly improving the system and adding new features. Let us know if you have any feedback!</p>
<p>Best regards,</p>
<p>The AetherOS Team</p>
    `,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    read: false,
    starred: true,
  },
  {
    id: 2,
    sender: 'Dr. Evelyn Reed',
    avatar: 'https://i.pravatar.cc/150?u=evelyn',
    initials: 'ER',
    subject: 'Project Quorium: Architecture Review',
    body: `
<p>Team,</p>
<p>The latest updates to the Autonomous System Intelligence (ASI) layer look promising. The move to a persistent agent memory using Firestore was a critical step for system resilience.</p>
<p>Please review the attached design document for the upcoming System Memory Graph (SMG) implementation. We need to ensure that the telemetry pipeline can support the relationship graphing we'll need for adaptive learning.</p>
<p>Let's sync up tomorrow at 10:00 AM to discuss.</p>
<p>Regards,</p>
<p>Dr. Evelyn Reed</p>
    `,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    read: true,
    starred: false,
  },
  {
    id: 3,
    sender: 'Automated Alert',
    avatar: '/alert-icon.png', // You'll need an icon
    initials: 'AA',
    subject: 'Kernel Alert: High Latency Detected in VFS Module',
    body: `
<p><strong>ALERT ID: #84920</strong></p>
<p>High latency has been detected in the Virtual File System (VFS) service.</p>
<ul>
  <li><strong>Service:</strong> vfs_service.go</li>
  <li><strong>Average Latency:</strong> 250ms (Threshold: 150ms)</li>
  <li><strong>Affected Operations:</strong> vfs:list</li>
</ul>
<p>The system has autonomously triggered a diagnostic task graph to investigate. See Agent Console for details (TaskGraph ID: tg_diag_vfs_9912).</p>
<p>This is an automated notification.</p>
    `,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
    read: true,
    starred: false,
  }
];

type Email = typeof placeholderEmails[number];

const MailApp = () => {
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(placeholderEmails[0]);

  return (
    <div className="flex h-full bg-background text-foreground">
      <div className="w-[220px] border-r flex flex-col p-2 space-y-1">
        {[
          { icon: Inbox, label: 'Inbox', count: placeholderEmails.filter(e => !e.read).length },
          { icon: Star, label: 'Starred' },
          { icon: Clock, label: 'Snoozed' },
          { icon: Send, label: 'Sent' },
          { icon: FileText, label: 'Drafts' },
          { icon: Archive, label: 'Archive' },
          { icon: Trash2, label: 'Trash' },
        ].map(({ icon: Icon, label, count }) => (
          <Button
            key={label}
            variant={label === 'Inbox' ? 'secondary' : 'ghost'}
            className="w-full justify-start gap-2"
          >
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="flex-grow text-left">{label}</span>
            {count && count > 0 && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                {count}
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="w-[350px] border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Inbox</h2>
        </div>
        <ScrollArea>
          {placeholderEmails.map((email) => (
            <button
              key={email.id}
              className={cn(
                'w-full text-left p-4 border-b hover:bg-muted',
                selectedEmail?.id === email.id && 'bg-muted/50',
                !email.read && 'font-bold'
              )}
              onClick={() => setSelectedEmail(email)}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm">{email.sender}</p>
                <time className="text-xs text-muted-foreground">
                  {email.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </time>
              </div>
              <p className="text-sm truncate mt-1">{email.subject}</p>
              <p className="text-xs text-muted-foreground truncate mt-1">
                {email.body.replace(/<[^>]+>/g, '').substring(0, 100)}...
              </p>
            </button>
          ))}
        </ScrollArea>
      </div>

      <div className="flex-grow flex flex-col">
        {selectedEmail ? (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Avatar>
                  <AvatarImage src={selectedEmail.avatar} />
                  <AvatarFallback>{selectedEmail.initials}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedEmail.sender}</h3>
                  <p className="text-xs text-muted-foreground">to me</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{selectedEmail.timestamp.toLocaleString()}</p>
                <Button variant="ghost" size="icon">
                  <Star className={cn("h-4 w-4", selectedEmail.starred && "fill-current text-yellow-500")} />
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                         <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                         </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem><Reply className="mr-2 h-4 w-4" />Reply</DropdownMenuItem>
                        <DropdownMenuItem><ReplyAll className="mr-2 h-4 w-4" />Reply All</DropdownMenuItem>
                        <DropdownMenuItem><Forward className="mr-2 h-4 w-4" />Forward</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="p-4 border-b">
                 <h2 className="text-xl font-bold">{selectedEmail.subject}</h2>
            </div>
            <ScrollArea className="flex-grow">
              <div
                className="p-6 prose dark:prose-invert prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
              />
            </ScrollArea>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Select an email to read
          </div>
        )}
      </div>
    </div>
  );
};

export default MailApp;
