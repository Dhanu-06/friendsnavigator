'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

type Message = {
  id: string;
  text: string;
  userId: string;
  timestamp: Date;
};

type ChatPanelProps = {
  currentUser: FirebaseUser | null;
  participants: User[];
};

export function ChatPanel({ currentUser, participants }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const participantsMap = React.useMemo(() => {
    return participants.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {} as Record<string, User>);
  }, [participants]);
  
  // Add current user to participants map if not already there
  if (currentUser && !participantsMap[currentUser.uid]) {
    participantsMap[currentUser.uid] = {
        id: currentUser.uid,
        name: currentUser.displayName,
        email: currentUser.email,
        avatarUrl: currentUser.photoURL
    }
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if(viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      userId: currentUser.uid,
      timestamp: new Date(),
    };

    // TODO: Replace with Firestore `addDoc`
    setMessages((prev) => [...prev, message]);
    setNewMessage('');
  };

  const getParticipant = (userId: string) => {
    return participantsMap[userId];
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const author = getParticipant(msg.userId);
            const isCurrentUser = msg.userId === currentUser?.uid;

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex items-start gap-3',
                  isCurrentUser ? 'flex-row-reverse' : ''
                )}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={author?.avatarUrl || ''} />
                  <AvatarFallback>{author?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'max-w-xs md:max-w-md rounded-lg px-3 py-2',
                    isCurrentUser
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="text-sm font-medium mb-0.5">{isCurrentUser ? 'You' : author?.name}</p>
                  <p className="text-sm">{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1 text-right">
                    {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
                  </p>
                </div>
              </div>
            );
          })}
           {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-10">
                    <p>No messages yet.</p>
                    <p>Start the conversation!</p>
                </div>
           )}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            disabled={!currentUser}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || !currentUser}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
