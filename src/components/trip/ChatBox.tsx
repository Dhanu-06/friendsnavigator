'use client';

import { useState, useRef, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Message = {
  id: string;
  userName: string;
  text: string;
  timestamp: string;
  avatarUrl: string;
};

type ChatBoxProps = {
  messages: Message[];
  onSendMessage: (text: string) => void;
};

export function ChatBox({ messages, onSendMessage }: ChatBoxProps) {
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if(viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);


  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    onSendMessage(newMessage);
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => {
            const isYou = msg.userName === 'You';
            return (
              <div
                key={msg.id}
                className={cn('flex items-end gap-2', isYou && 'flex-row-reverse')}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={msg.avatarUrl || undefined} />
                  <AvatarFallback>{msg.userName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div
                  className={cn(
                    'max-w-xs rounded-lg px-3 py-2',
                    isYou
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-muted rounded-bl-none'
                  )}
                >
                  <p className="text-sm font-medium">{isYou ? 'You' : msg.userName}</p>
                  <p className="text-sm">{msg.text}</p>
                   <p className="text-xs opacity-70 mt-1 text-right">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
      <div className="p-4 border-t">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
