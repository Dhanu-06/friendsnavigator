'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Message, User } from '@/lib/types';
import { useFirestore, useUser } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { FirestorePermissionError, errorEmitter } from '@/firebase';

type ChatPanelProps = {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
};

type UserMap = Map<string, { name: string; avatarUrl: string, avatarHint: string }>;

export function ChatPanel({ messages, onSendMessage, isLoading }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [userMap, setUserMap] = useState<UserMap>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user: currentUser } = useUser();
  const firestore = useFirestore();

  useEffect(() => {
    if (!firestore || messages.length === 0) return;

    const fetchUsers = async () => {
      const userIds = new Set(messages.map(m => m.senderId));
      const newUserMap: UserMap = new Map(userMap);
      let mapUpdated = false;

      const userFetchPromises = Array.from(userIds).map(async (userId) => {
        if (!newUserMap.has(userId)) {
          try {
            const userDocRef = doc(firestore, 'users', userId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const userData = userSnap.data() as User;
              newUserMap.set(userId, {
                name: userData.name || 'Anonymous',
                avatarUrl: userData.avatarUrl || 'https://picsum.photos/seed/placeholder/40/40',
                avatarHint: userData.avatarHint || 'person'
              });
              mapUpdated = true;
            }
          } catch (error: any) {
             console.error(`Failed to fetch user ${userId} for chat:`, error);
             // Let the global error handler catch permission-denied
          }
        }
      });

      await Promise.all(userFetchPromises);

      if (mapUpdated) {
        setUserMap(new Map(newUserMap)); // Create a new map to trigger re-render
      }
    };

    fetchUsers();

  }, [messages, firestore, userMap]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const renderSkeleton = () => (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className={`flex items-start gap-3 ${i % 2 !== 0 ? 'justify-end' : ''}`}>
          {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
          <div className={`max-w-[75%] space-y-2`}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-48" />
          </div>
          {i % 2 !== 0 && <Skeleton className="h-8 w-8 rounded-full" />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 p-4 pt-0">
      <h3 className="font-semibold text-lg mb-4">Group Chat</h3>
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        {isLoading ? renderSkeleton() : (
          <div className="space-y-4">
            {messages.map((message) => {
              const sender = userMap.get(message.senderId);
              const isCurrentUser = message.senderId === currentUser?.uid;
              return (
                <div key={message.id} className={`flex items-start gap-3 ${isCurrentUser ? 'justify-end' : ''}`}>
                  {!isCurrentUser && sender && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={sender.avatarUrl} alt={sender.name} data-ai-hint={sender.avatarHint} />
                      <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[75%] rounded-lg p-3 text-sm ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {!isCurrentUser && <p className="font-semibold mb-1">{sender?.name || 'Unknown User'}</p>}
                    <p>{message.text}</p>
                    <p className={`text-xs mt-2 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{String(message.timestamp)}</p>
                  </div>
                  {isCurrentUser && sender && (
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={sender.avatarUrl} alt={sender.name} data-ai-hint={sender.avatarHint}/>
                      <AvatarFallback>{sender.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          autoComplete="off"
          disabled={!currentUser}
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim() || !currentUser}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
