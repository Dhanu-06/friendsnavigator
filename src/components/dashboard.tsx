'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Participant, MeetingPoint, Trip, Message, User } from '@/lib/types';
import { MOCK_DESTINATION, MOCK_USERS } from '@/lib/data';
import { Header } from '@/components/header';
import { MapView } from '@/components/map-view';
import { ParticipantsPanel } from '@/components/participants-panel';
import { ChatPanel } from '@/components/chat-panel';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCollection, useDoc, useFirestore, useUser, useMemoFirebase, addDocumentNonBlocking, setDocumentNonBlocking, FirestorePermissionError, errorEmitter } from '@/firebase';
import { collection, query, where, doc, getDoc, serverTimestamp, orderBy, Timestamp, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';

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
  } else if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  }
   else {
    date = new Date(timestamp);
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};


export function Dashboard() {
  const [tripType, setTripType] = useState<'within-city' | 'out-of-city'>('within-city');
  const [meetingPoint, setMeetingPoint] = useState<MeetingPoint | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);

  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const tripRef = useMemoFirebase(() => firestore ? doc(firestore, 'trips', DEMO_TRIP_ID) : null, [firestore]);
  const { data: tripData, isLoading: isTripLoading } = useDoc<Trip>(tripRef);

  useEffect(() => {
    if (!user || !firestore) return;
  
    const setupDemoTrip = async () => {
      if (!tripRef) return;
      try {
        const tripSnap = await getDoc(tripRef);
    
        if (!tripSnap.exists()) {
          console.log("Trip does not exist, creating...");
          const newTrip: Trip = {
            id: DEMO_TRIP_ID,
            type: 'within-city',
            destination: MOCK_DESTINATION.name,
            participantIds: [user.uid, ...MOCK_USERS.map(u => u.id).filter(id => id !== 'user4')],
            status: 'planned',
          };
          // Not awaiting this is fine
          setDocumentNonBlocking(tripRef, newTrip, { merge: true });
        } else {
          const currentTripData = tripSnap.data() as Trip;
          if (!currentTripData.participantIds.includes(user.uid)) {
            console.log("User not in trip, adding...");
            // Not awaiting this is fine
            updateDocumentNonBlocking(tripRef, {
              participantIds: arrayUnion(user.uid)
            });
          }
        }
      } catch (error: any) {
         if (error.code === 'permission-denied') {
              const contextualError = new FirestorePermissionError({
                  operation: 'get',
                  path: tripRef.path
              });
              errorEmitter.emit('permission-error', contextualError);
          } else {
              console.error("An unexpected error occurred while setting up the demo trip:", error);
          }
      }
    };
  
    setupDemoTrip();
  
  }, [user, firestore, tripRef]);

  useEffect(() => {
    if (isUserLoading || isTripLoading || !tripData || !firestore) {
      return;
    }
  
    const fetchParticipants = async () => {
      setIsDataLoading(true);
      const participantIds = tripData.participantIds;
      if (participantIds.length === 0) {
        setParticipants([]);
        setIsDataLoading(false);
        return;
      }
  
      try {
        const userPromises = participantIds.map(id => getDoc(doc(firestore, 'users', id)));
        const userSnaps = await Promise.all(userPromises);
        const participantUsers = userSnaps.map(snap => snap.data() as User).filter(Boolean); // Filter out undefined if a doc doesn't exist
        
        // Merge with mock data for simulation
        const allParticipants = MOCK_USERS.map(mockUser => {
          const firestoreUser = participantUsers.find(u => u?.id === mockUser.id);
          const isCurrentUser = user?.uid === mockUser.id;

          if (isCurrentUser && user) {
               return { ...mockUser, id: user.uid, name: user.displayName || 'You', avatarUrl: user.photoURL || mockUser.avatarUrl, avatarHint: mockUser.avatarHint || 'person selfie' };
          }
          return firestoreUser ? { ...mockUser, id: firestoreUser.id, name: firestoreUser.name || mockUser.name, avatarUrl: firestoreUser.avatarUrl || mockUser.avatarUrl, avatarHint: firestoreUser.avatarHint || mockUser.avatarHint } : mockUser;
        }).filter(p => participantIds.includes(p.id));
        
        setParticipants(allParticipants);
  
      } catch (error: any) {
        if (error.code === 'permission-denied') {
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path: 'users', // Even though we fetch one by one, the intent is a list
            });
            errorEmitter.emit('permission-error', contextualError);
        } else {
            console.error("An unexpected error occurred while fetching participants:", error);
        }
      } finally {
        setIsDataLoading(false);
      }
    };
  
    fetchParticipants();
  
  }, [tripData, isTripLoading, isUserLoading, firestore, user]);


  const messagesQuery = useMemoFirebase(() => 
    firestore && tripData ? query(collection(firestore, 'trips', DEMO_TRIP_ID, 'messages'), orderBy('timestamp', 'asc')) : null, 
    [firestore, tripData]
  );
  const { data: messagesData, isLoading: messagesLoading } = useCollection<Message>(messagesQuery);
  
  // Sim movement effect
  useEffect(() => {
    const interval = setInterval(() => {
      setParticipants(prevUsers => prevUsers.map(p => (p.name !== 'You' && p.status !== 'arrived' ? moveUser(p) : p)));
    }, 5000); 

    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = (text: string) => {
    if (!user || !firestore || !tripData) return;
    
    const messagesColRef = collection(firestore, `trips/${DEMO_TRIP_ID}/messages`);
    const newMessage: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
      tripId: DEMO_TRIP_ID,
      senderId: user.uid,
      text,
      timestamp: serverTimestamp(),
    };
    
    addDocumentNonBlocking(messagesColRef, newMessage);
  };

  const handleSuggestion = useCallback((suggestion: MeetingPoint) => {
    if (participants.length === 0) return;
    const avgLat = participants.reduce((sum, u) => sum + u.location.lat, 0) / participants.length;
    const avgLng = participants.reduce((sum, u) => sum + u.location.lng, 0) / participants.length;
    
    setMeetingPoint({
        ...suggestion,
        location: { lat: avgLat, lng: avgLng }
    });
  }, [participants]);

  const formattedMessages = (messagesData || []).map(m => ({...m, timestamp: formatTimestamp(m.timestamp)}));
  
  const isLoading = isTripLoading || isDataLoading;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
      <Header />
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] overflow-hidden">
        <aside className="border-r border-border flex flex-col h-full">
          <ScrollArea className="flex-1">
            <ParticipantsPanel
              users={participants}
              tripType={tripType}
              onTripTypeChange={setTripType}
              onSuggestion={handleSuggestion}
              isLoading={isLoading}
            />
            <Separator className="my-0" />
            <ChatPanel messages={formattedMessages} onSendMessage={handleSendMessage} isLoading={messagesLoading} />
          </ScrollArea>
        </aside>

        <section className="bg-muted/30 h-full relative">
          <MapView users={participants} meetingPoint={meetingPoint} />
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
