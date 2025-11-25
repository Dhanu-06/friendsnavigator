'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, collection, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useDoc, useCollection, useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import type { Trip, User, Location, Participant } from '@/lib/types';
import { Header } from '@/components/header';
import { MapView } from '@/components/map-view';
import { InviteDialog } from '@/components/invite-dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Copy, MessageSquare, Map } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChatPanel } from '@/components/chat-panel';
import { ParticipantsPanel } from '@/components/participants-panel';

export default function TripPage() {
  const { tripId } = useParams() as { tripId: string };
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isInviteOpen, setInviteOpen] = useState(false);
  
  // --- Data Fetching ---
  const tripRef = useMemoFirebase(() => (firestore && tripId ? doc(firestore, 'trips', tripId) : null), [firestore, tripId]);
  const { data: tripData, isLoading: isTripLoading } = useDoc<Trip>(tripRef);

  const locationsRef = useMemoFirebase(() => (firestore && tripId ? collection(firestore, 'trips', tripId, 'locations') : null), [firestore, tripId]);
  const { data: locationsData } = useCollection<Location>(locationsRef);

  const participantsRef = useMemoFirebase(() => (firestore && tripId ? collection(firestore, 'trips', tripId, 'participants') : null), [firestore, tripId]);
  const { data: participantsData, isLoading: areParticipantsLoading } = useCollection<Participant>(participantsRef);

  const locationsMap = React.useMemo(() => {
    if (!locationsData) return {};
    return locationsData.reduce((acc, loc) => {
      acc[loc.id] = loc;
      return acc;
    }, {} as Record<string, Location>);
  }, [locationsData]);


  // --- Effects ---

  // Redirect if user is not authenticated or not a participant
  useEffect(() => {
    if (isUserLoading || isTripLoading) return;
    if (!user) {
      router.push('/login');
    } else if (tripData && !tripData.participantIds.includes(user.uid)) {
      toast({ title: "Access Denied", description: "You are not a member of this trip.", variant: "destructive" });
      router.push('/dashboard');
    }
  }, [user, isUserLoading, tripData, isTripLoading, router, toast]);

  // Update user's location periodically & create participant doc if it doesn't exist
  useEffect(() => {
    if (!user || !firestore || !tripId || !participantsData) return;

    const myParticipantDoc = participantsData.find(p => p.id === user.uid);

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          
          // Update location subcollection
          const locationRef = doc(firestore, 'trips', tripId, 'locations', user.uid);
          const newLocationData: Omit<Location, 'id'> = {
            lat: latitude,
            lng: longitude,
            lastUpdated: serverTimestamp(),
          };
          setDocumentNonBlocking(locationRef, newLocationData, { merge: true });

          // Update location on participant document
          const participantRef = doc(firestore, 'trips', tripId, 'participants', user.uid);
          const participantUpdate = {
             currentLocation: { lat: latitude, lng: longitude }
          };

          if (myParticipantDoc) {
             updateDocumentNonBlocking(participantRef, participantUpdate);
          } else {
             // Create participant doc if it's missing (e.g., user was invited but hasn't interacted)
             const newParticipant: Participant = {
                ...participantUpdate,
                id: user.uid,
                name: user.displayName || 'Anonymous',
                avatarUrl: user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`,
             }
             setDocumentNonBlocking(participantRef, newParticipant, { merge: true });
          }
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
    };

    updateLocation(); // Initial update
    const intervalId = setInterval(updateLocation, 15000); // Update every 15 seconds

    return () => clearInterval(intervalId);
  }, [user, firestore, tripId, participantsData]);


  const copyJoinCode = () => {
    if (typeof tripId === 'string') {
      navigator.clipboard.writeText(tripId);
      toast({ title: "Copied!", description: "Trip join code copied to clipboard." });
    }
  };
  
  const isLoading = isTripLoading || isUserLoading || areParticipantsLoading;
  const participants = participantsData || [];

  return (
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <Header />
        <main className="flex-1 grid grid-cols-1 md:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] overflow-hidden">
          
          {/* Left Panel (Map & Chat) */}
           <section className="bg-muted/30 h-full flex flex-col">
             <Tabs defaultValue="map" className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b">
                    <TabsList>
                        <TabsTrigger value="map"><Map className="mr-2"/> Map</TabsTrigger>
                        <TabsTrigger value="chat"><MessageSquare className="mr-2"/> Chat</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="map" className="flex-1 overflow-auto p-4">
                     <MapView participants={participants} locations={locationsMap} />
                </TabsContent>
                <TabsContent value="chat" className="flex-1 flex flex-col overflow-auto">
                    <ChatPanel currentUser={user} participants={participants} />
                </TabsContent>
            </Tabs>
          </section>

          {/* Right Panel */}
          <aside className="border-l border-border flex flex-col h-full p-4 gap-4 overflow-y-auto">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
              </>
            ) : (
              <div>
                <h1 className="text-2xl font-bold">{tripData?.name}</h1>
                <p className="text-muted-foreground">{tripData?.destination.name}</p>
              </div>
            )}
            
            <div className="flex gap-2">
                <Button onClick={() => setInviteOpen(true)} className="flex-1">
                    <UserPlus /> Invite Friend
                </Button>
                <Button onClick={copyJoinCode} variant="secondary" className="flex-1">
                    <Copy /> Join Code
                </Button>
            </div>

            <ParticipantsPanel 
              participants={participants} 
              isLoading={isLoading} 
              currentUser={user}
              tripId={tripId}
              destination={tripData?.destination}
              tripType={tripData?.tripType}
            />
          </aside>
          
        </main>
        {typeof tripId === 'string' && <InviteDialog tripId={tripId} isOpen={isInviteOpen} onOpenChange={setInviteOpen} />}
      </div>
  );
}
