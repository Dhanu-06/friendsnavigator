'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { User, Message, MeetingPoint } from '@/lib/types';
import { MOCK_USERS, MOCK_MESSAGES, MOCK_DESTINATION } from '@/lib/data';
import { Header } from '@/components/header';
import { MapView } from '@/components/map-view';
import { ParticipantsPanel } from '@/components/participants-panel';
import { ChatPanel } from '@/components/chat-panel';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

// Function to simulate user movement
const moveUser = (user: User): User => {
  const newLat = user.location.lat + (Math.random() - 0.5) * 0.005;
  const newLng = user.location.lng + (Math.random() - 0.5) * 0.005;
  const newEta = Math.max(1, user.eta - 1);
  return {
    ...user,
    location: { lat: newLat, lng: newLng },
    eta: newEta,
    status: newEta < 3 ? 'arrived' : user.status,
  };
};

export function Dashboard() {
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES);
  const [tripType, setTripType] = useState<'within-city' | 'out-of-city'>('within-city');
  const [meetingPoint, setMeetingPoint] = useState<MeetingPoint | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setUsers(prevUsers => prevUsers.map(user => (user.name !== 'You' && user.status !== 'arrived' ? moveUser(user) : user)));
    }, 5000); // Update locations every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: `msg${messages.length + 1}`,
      userId: 'user4', // 'You'
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([...messages, newMessage]);
  };

  const handleSuggestion = useCallback((suggestion: MeetingPoint) => {
    // Simple way to find a plausible location for the suggested point
    // For a real app, you'd use Google Places API to find the coordinates of the suggested place name.
    const avgLat = users.reduce((sum, u) => sum + u.location.lat, 0) / users.length;
    const avgLng = users.reduce((sum, u) => sum + u.location.lng, 0) / users.length;
    
    setMeetingPoint({
        ...suggestion,
        location: { lat: avgLat, lng: avgLng }
    });
  }, [users]);


  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Header />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] overflow-hidden">
        <aside className="border-r border-border flex flex-col h-full">
          <ScrollArea className="flex-1">
            <ParticipantsPanel
              users={users}
              tripType={tripType}
              onTripTypeChange={setTripType}
              onSuggestion={handleSuggestion}
            />
            <Separator className="my-0" />
            <ChatPanel messages={messages} onSendMessage={handleSendMessage} />
          </ScrollArea>
        </aside>

        <section className="bg-muted/30 h-full relative">
          <MapView users={users} meetingPoint={meetingPoint} />
           <div className="absolute top-4 left-4 bg-background/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-border">
                <h3 className="font-semibold text-base">Destination</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <span className="text-primary font-medium">{MOCK_DESTINATION.name}</span>
                </p>
            </div>
        </section>
      </main>
    </div>
  );
}
