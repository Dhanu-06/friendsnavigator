'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Participant, Message, MeetingPoint, Trip, User } from '@/lib/types';
import { MOCK_DESTINATION, MOCK_USERS } from '@/lib/data';
import { Header } from '@/components/header';
import { MapView } from '@/components/map-view';
import { ParticipantsPanel } from '@/components/participants-panel';
import { ChatPanel } from '@/components/chat-panel';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, getDoc, serverTimestamp, addDoc, orderBy, Timestamp } from 'firebase/firestore';

// Hardcoded tripId for demo purposes
const DEMO_TRIP_ID = 'trip123';

// Function to simulate user movement (can be removed later)
const moveUser = (user: Participant): Participant => {
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

// Helper to format timestamps
const formatTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  if (typeof timestamp === 'string') return timestamp;
  let date: Date;
  if (timestamp instanceof Timestamp) {
    date = timestamp.toDate();
  } else {
    date = new Date(timestamp);
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


export function Dashboard() {
  // Local state for UI simulation
  const [simulatedParticipants, setSimulatedParticipants] = useState<Participant[]>(MOCK_USERS);
  const [tripType, setTripType] = useState<'within-city' | 'out-of-city'>('within-city');
  const [meetingPoint, setMeetingPoint] = useState<MeetingPoint | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();

  // --- Firestore Data ---
  // Memoize Firestore references to prevent re-renders
  const tripRef = useMemoFirebase(() => firestore ? doc(firestore, 'trips', DEMO_TRIP_ID) : null, [firestore]);
  
  const messagesQuery = useMemoFirebase(() => 
    firestore ? query(collection(firestore, 'trips', DEMO_TRIP_ID, 'messages'), orderBy('timestamp', 'asc')) : null, 
    [firestore]
  );
  const { data: messagesData, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);
  
  const participantsQuery = useMemoFirebase(() => 
    firestore ? collection(firestore, 'users') : null,
    [firestore]
  );
  // In a real app, you would query based on trip.participantIds
  const { data: usersData, isLoading: usersLoading } = useCollection<User>(participantsQuery);


  // Effect for simulating participant movement
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedParticipants(prevUsers => prevUsers.map(p => (p.name !== 'You' && p.status !== 'arrived' ? moveUser(p) : p)));
    }, 5000); 

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (text: string) => {
    if (!user || !firestore) return;
    
    const messagesColRef = collection(firestore, `trips/${DEMO_TRIP_ID}/messages`);
    const newMessage: Omit<Message, 'id'> = {
      tripId: DEMO_TRIP_ID,
      senderId: user.uid,
      text,
      timestamp: serverTimestamp(),
    };
    
    addDoc(messagesColRef, newMessage).catch(error => console.error("Failed to send message:", error));
  };

  const handleSuggestion = useCallback((suggestion: MeetingPoint) => {
    const avgLat = simulatedParticipants.reduce((sum, u) => sum + u.location.lat, 0) / simulatedParticipants.length;
    const avgLng = simulatedParticipants.reduce((sum, u) => sum + u.location.lng, 0) / simulatedParticipants.length;
    
    setMeetingPoint({
        ...suggestion,
        location: { lat: avgLat, lng: avgLng }
    });
  }, [simulatedParticipants]);

  const formattedMessages = (messagesData || []).map(m => ({...m, timestamp: formatTimestamp(m.timestamp)}));

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Header />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] overflow-hidden">
        <aside className="border-r border-border flex flex-col h-full">
          <ScrollArea className="flex-1">
            <ParticipantsPanel
              users={simulatedParticipants} // Using simulated data for now
              tripType={tripType}
              onTripTypeChange={setTripType}
              onSuggestion={handleSuggestion}
            />
            <Separator className="my-0" />
            <ChatPanel messages={formattedMessages} onSendMessage={handleSendMessage} isLoading={messagesLoading} />
          </ScrollArea>
        </aside>

        <section className="bg-muted/30 h-full relative">
          <MapView users={simulatedParticipants} meetingPoint={meetingPoint} />
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
