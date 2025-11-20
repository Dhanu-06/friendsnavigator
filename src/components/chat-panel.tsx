'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { Message, User } from '@/lib/types';
import { MOCK_USERS } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';

type ChatPanelProps = {
  messages: Message[];
  onSendMessage: (text: string) => void;
};

const userMap = new Map(MOCK_USERS.map(user => [user.id, user]));

export function ChatPanel({ messages, onSendMessage }: ChatPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 flex-1 p-4 pt-0">
      <h3 className="font-semibold text-lg mb-4">Group Chat</h3>
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((message) => {
            const user = userMap.get(message.userId);
            const isCurrentUser = user?.name === 'You';
            return (
              <div key={message.id} className={`flex items-start gap-3 ${isCurrentUser ? 'justify-end' : ''}`}>
                {!isCurrentUser && user && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.avatarHint}/>
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[75%] rounded-lg p-3 text-sm ${isCurrentUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {!isCurrentUser && <p className="font-semibold mb-1">{user?.name}</p>}
                  <p>{message.text}</p>
                  <p className={`text-xs mt-2 ${isCurrentUser ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{message.timestamp}</p>
                </div>
                 {isCurrentUser && user && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint={user.avatarHint} />
                    <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <form onSubmit={handleSubmit} className="mt-4 flex items-center gap-2">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1"
          autoComplete="off"
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
          <Send className="h-4 w-4" />
          <span className="sr-only">Send</span>
        </Button>
      </form>
    </div>
  );
}
