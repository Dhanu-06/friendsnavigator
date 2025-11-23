'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, collection } from 'firebase/firestore';
import { useDoc, useCollection, useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import type { Trip, User, Location } from '@/lib/types';
import { Header } from '@/components/header';
import { MapView } from '@/components/map-view';
import { ParticipantsList } from '@/components/participants-list';
import { InviteDialog } from '@/components/invite-dialog';
import { Button } from '@/components/ui/button';
import { UserPlus, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GOOGLE_MAPS_API_KEY } from '@/lib/config';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Skeleton } from '@/components/ui/skeleton';

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
      const participantPromises = tripData.participantIds.map(id => getDoc(doc(firestore, 'users', id)));
      try {
        const participantSnaps = await Promise.all(participantPromises);
        const participantUsers = participantSnaps
          .filter(snap => snap.exists())
          .map(snap => snap.data() as User);
        setParticipants(participantUsers);
      } catch (error) {
        console.error("Error fetching participant details:", error);
        toast({ title: "Error", description: "Could not load participant information." });
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
          const newLocation: Location = {
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
    navigator.clipboard.writeText(tripId);
    toast({ title: "Copied!", description: "Trip join code copied to clipboard." });
  };
  
  if (!GOOGLE_MAPS_API_KEY) {
    return (
       <div className="flex h-screen w-screen items-center justify-center bg-background p-4">
        <div className="rounded-lg border bg-card p-6 text-center text-card-foreground shadow-sm max-w-2xl">
          <h2 className="text-2xl font-bold">Google Maps API Key is Missing</h2>
          <p className="mt-2 text-muted-foreground">
            To see the map for your trip, you need to provide a Google Maps API key.
          </p>
          <div className="mt-6 rounded-md bg-muted p-4 text-left font-code text-sm">
            <p className="font-semibold">1. Create a file named <code className="text-primary">.env.local</code> in your project root.</p>
            <p className="mt-4 font-semibold">2. Add your key like this:</p>
            <code className="mt-2 block bg-background/50 p-2 rounded">
              NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_API_KEY
            </code>
          </div>
           <p className="mt-4 text-xs text-muted-foreground">
            You can get a key from the Google Cloud Console. Make sure the "Maps JavaScript API" is enabled.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Please restart your development server after adding the key.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = isTripLoading || isUserLoading || isFetchingParticipants;

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
        <Header />
        <main className="flex-1 grid grid-cols-1 md:grid-cols-[380px_1fr] xl:grid-cols-[420px_1fr] overflow-hidden">
          {/* Left Panel */}
          <aside className="border-r border-border flex flex-col h-full p-4 gap-4">
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
          
          {/* Right Panel (Map) */}
          <section className="bg-muted/30 h-full p-4">
             <MapView participants={participants} locations={locationsMap} />
          </section>
        </main>
      </div>
      <InviteDialog tripId={tripId} isOpen={isInviteOpen} onOpenChange={setInviteOpen} />
    </APIProvider>
  );
}
