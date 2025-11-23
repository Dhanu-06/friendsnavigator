'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection } from 'firebase/firestore';
import { useDoc, useCollection, useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking, errorEmitter, FirestorePermissionError } from '@/firebase';
import type { Trip, User, Location } from '@/lib/types';
import { Header } from '@/components/header';
import { MapView } from '@/components/map-view';
import { ParticipantsList } from '@/components/participants-list';
import { InviteDialog } from '@/components/invite-dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Copy, MessageSquare, Map } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChatPanel } from '@/components/chat-panel';

export default function TripPage() {
  const { tripId } = useParams() as { tripId: string };
  const router = useRouter();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [participants, setParticipants] = useState<User[]>([]);
  const [isInviteOpen, setInviteOpen] = useState(false);
  const [isFetchingParticipants, setFetchingParticipants] = useState(true);

  // --- Data Fetching ---
  const tripRef = useMemoFirebase(() => (firestore && tripId ? doc(firestore, 'trips', tripId) : null), [firestore, tripId]);
  const { data: tripData, isLoading: isTripLoading } = useDoc<Trip>(tripRef);

  const locationsRef = useMemoFirebase(() => (firestore && tripId ? collection(firestore, 'trips', tripId, 'locations') : null), [firestore, tripId]);
  const { data: locationsData, isLoading: areLocationsLoading } = useCollection<Location>(locationsRef);

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

  // Fetch participant details
  useEffect(() => {
    if (!firestore || !tripData) return;

    setFetchingParticipants(true);
    const fetchParticipantDetails = async () => {
      const participantPromises = tripData.participantIds.map(id => {
        const userDocRef = doc(firestore, 'users', id);
        return getDoc(userDocRef)
          .catch(error => {
            // Emit a detailed error for debugging security rules
            const contextualError = new FirestorePermissionError({
                operation: 'get',
                path: `users/${id}`,
            });
            errorEmitter.emit('permission-error', contextualError);
            // Return null so Promise.all doesn't fail completely
            return null; 
          });
      });

      try {
        const participantSnaps = await Promise.all(participantPromises);
        const participantUsers = participantSnaps
          .filter((snap): snap is import('firebase/firestore').DocumentSnapshot => snap !== null && snap.exists())
          .map(snap => snap.data() as User);
        setParticipants(participantUsers);
      } catch (error) {
        // This outer catch is now less likely to be hit for permission errors,
        // but is kept as a fallback for other potential issues with Promise.all
        console.error("Error processing participant details:", error);
        toast({ title: "Error", description: "Could not load all participant information." });
      } finally {
        setFetchingParticipants(false);
      }
    };
    fetchParticipantDetails();
  }, [firestore, tripData, toast]);

  // Update user's location periodically
  useEffect(() => {
    if (!user || !firestore || !tripId) return;

    const updateLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const locationRef = doc(firestore, 'trips', tripId, 'locations', user.uid);
          const newLocation: Omit<Location, 'id'> = {
            lat: latitude,
            lng: longitude,
            lastUpdated: new Date(),
          };
          setDocumentNonBlocking(locationRef, newLocation, { merge: true });
        },
        (error) => console.error("Geolocation error:", error),
        { enableHighAccuracy: true }
      );
    };

    updateLocation(); // Initial update
    const intervalId = setInterval(updateLocation, 15000); // Update every 15 seconds

    return () => clearInterval(intervalId);
  }, [user, firestore, tripId]);


  const copyJoinCode = () => {
    if (typeof tripId === 'string') {
      navigator.clipboard.writeText(tripId);
      toast({ title: "Copied!", description: "Trip join code copied to clipboard." });
    }
  };
  
  const isLoading = isTripLoading || isUserLoading || isFetchingParticipants;

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
                <p className="text-muted-foreground">{tripData?.destination}</p>
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

            <ParticipantsList participants={participants} isLoading={isLoading} />
          </aside>
          
        </main>
        {typeof tripId === 'string' && <InviteDialog tripId={tripId} isOpen={isInviteOpen} onOpenChange={setInviteOpen} />}
      </div>
  );
}
