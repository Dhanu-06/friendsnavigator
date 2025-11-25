'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
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

const DUMMY_PARTICIPANTS: Participant[] = [
    {
      id: 'user1',
      name: 'Sarah',
      avatarUrl: 'https://picsum.photos/seed/user1/40/40',
      currentLocation: { lat: 12.9796, lng: 77.5906 },
      selectedMode: 'ola',
      suggestion: {
        recommendedMode: 'ola',
        options: [
            { mode: 'ola', etaMinutes: 25, costEstimate: 250, explanation: 'Fastest cab option.' },
            { mode: 'metro', etaMinutes: 35, costEstimate: 50, explanation: 'Cheaper, but involves a walk.' }
        ],
        lastCalculatedAt: new Date()
      }
    },
    {
      id: 'user2',
      name: 'Mike',
      avatarUrl: 'https://picsum.photos/seed/user2/40/40',
      currentLocation: { lat: 12.9616, lng: 77.6046 },
    },
];

const DUMMY_TRIP: Omit<Trip, 'id'> = {
    name: 'Team Outing to Koramangala',
    destination: {
        name: 'Koramangala Social',
        lat: 12.9352,
        lng: 77.6245
    },
    description: "Let's finally meet up!",
    ownerId: 'user1',
    participantIds: ['user1', 'user2', 'user3'],
    tripType: 'within-city',
};

export default function TripPage() {
  const { tripId } = useParams() as { tripId: string };
  const router = useRouter();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const { toast } = useToast();

  const [isInviteOpen, setInviteOpen] = useState(false);
  
  // --- Local State for Dummy Data ---
  const [tripData, setTripData] = useState<Trip | null>(null);
  const [participantsData, setParticipantsData] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Effects ---

  // Redirect if user is not authenticated
  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  // Simulate fetching data
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      const currentUserFromAuth = user;
      
      const selfParticipant: Participant = {
        id: currentUserFromAuth?.uid || 'user3',
        name: currentUserFromAuth?.displayName || 'You',
        avatarUrl: currentUserFromAuth?.photoURL || 'https://picsum.photos/seed/user3/40/40',
        currentLocation: { lat: 12.9716, lng: 77.5946 }, // User's location
      };

      setTripData({ ...DUMMY_TRIP, id: tripId });
      setParticipantsData([...DUMMY_PARTICIPANTS, selfParticipant]);
      setIsLoading(false);
    }, 800); // Simulate network latency

    return () => clearTimeout(timer);
  }, [tripId, user]);


  const locationsMap = React.useMemo(() => {
    return participantsData.reduce((acc, p) => {
      if (p.currentLocation) {
        acc[p.id] = {
            id: p.id,
            lat: p.currentLocation.lat,
            lng: p.currentLocation.lng,
            lastUpdated: new Date()
        }
      }
      return acc;
    }, {} as Record<string, Location>);
  }, [participantsData]);


  const copyJoinCode = () => {
    navigator.clipboard.writeText(tripId);
    toast({ title: "Copied!", description: "Trip join code copied to clipboard." });
  };
  
  const currentAppUser = user ? { ...user, uid: user.uid, displayName: user.displayName || 'You', photoURL: user.photoURL || ''} as User : null;

  const handleParticipantUpdate = useCallback((updatedData: Partial<Participant>) => {
    if (!user) return;
    setParticipantsData(prev => 
        prev.map(p => p.id === user.uid ? { ...p, ...updatedData } : p)
    );
  }, [user]);


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
                     <MapView participants={participantsData} locations={locationsMap} />
                </TabsContent>
                <TabsContent value="chat" className="flex-1 flex flex-col overflow-auto">
                    <ChatPanel currentUser={user} participants={participantsData} />
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
              participants={participantsData} 
              isLoading={isLoading} 
              currentUser={currentAppUser}
              tripId={tripId}
              destination={tripData?.destination}
              tripType={tripData?.tripType}
              onParticipantUpdate={handleParticipantUpdate}
            />
          </aside>
          
        </main>
        <InviteDialog tripId={tripId} isOpen={isInviteOpen} onOpenChange={setInviteOpen} />
      </div>
  );
}
