'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MessageCircle,
  Phone,
  Video,
  CreditCard,
  MapPin,
} from 'lucide-react';
import TomTomMapController from '@/components/trip/TomTomMapController';
import { ParticipantsList } from '@/components/trip/ParticipantsList';
import { ChatBox } from '@/components/trip/ChatBox';
import { ExpenseCalculator } from '@/components/trip/ExpenseCalculator';
import { TripCodeBadge } from '@/components/trip/TripCodeBadge';
import { useToast } from '@/components/ui/use-toast';
import { getTripById } from '@/lib/tripStore';
import type { Trip } from '@/lib/tripStore';
import { getCurrentUser, type LocalUser } from '@/lib/localAuth';
import useTripRealtime from '@/hooks/useTripRealtime';
import type { Participant } from '@/hooks/useTripRealtime';
import useLiveLocation from '@/hooks/useLiveLocation';
import { startSimulatedMovement } from '@/utils/demoLocationSimulator';
import { getETAForParticipant } from '@/lib/getParticipantETA';
import TempEmuCheck from '@/components/TempEmuCheck';


export default function TripPage() {
  const params = useParams();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const { toast } = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [friendsETA, setFriendsETA] = useState<any[]>([]);

  // Realtime data hooks
  const { participants, messages, expenses, joinOrUpdateParticipant, sendMessage, addExpense } = useTripRealtime(tripId);

  // Live location hook for the current user
  useLiveLocation(tripId, currentUser ? { id: currentUser.uid, name: currentUser.name, avatarUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}` } : null);

  // Effect to load initial trip data and user
  useEffect(() => {
    if (tripId) {
      const tripData = getTripById(tripId);
      if (tripData) {
        setTrip(tripData);
      } else {
        toast({
          variant: 'destructive',
          title: 'Trip not found',
          description: 'The trip you are looking for does not exist.',
        });
      }
    }
    const user = getCurrentUser();
    setCurrentUser(user);
  }, [tripId, toast]);

  // Effect to join trip and start location simulation
  useEffect(() => {
    if (!tripId || !currentUser || !trip?.destination) return;

    // Initial join/update with best-known location
    const initialParticipantPayload: Participant = {
        id: currentUser.uid,
        name: currentUser.name,
        avatarUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
        mode: 'unknown',
        lat: trip.destination.lat, // Start near destination for simulation
        lng: trip.destination.lng,
        status: 'On the way',
        etaMinutes: 0,
    };
    joinOrUpdateParticipant(tripId, initialParticipantPayload);

    const onLocationUpdate = (lat: number, lng: number) => {
        const participantPayload: Participant = {
            id: currentUser.uid,
            name: currentUser.name,
            avatarUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`,
            lat,
            lng,
            status: 'On the way',
            mode: 'car',
            etaMinutes: 0,
        };
        joinOrUpdateParticipant(tripId, participantPayload);
    };

    const stopSimulation = startSimulatedMovement(
      trip.destination.lat,
      trip.destination.lng,
      onLocationUpdate
    );

    return () => stopSimulation();
  }, [tripId, currentUser, trip?.destination, joinOrUpdateParticipant]);
  
  const refreshAllFriendsETA = useCallback(async () => {
    const apiKey = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;
    if (!apiKey || !trip?.destination) return;

    const destinationCoords = { lat: trip.destination.lat, lon: trip.destination.lng };
    const arr = [];
  
    for (const p of participants) {
      if (!p.lat || !p.lng) continue; // skip offline friends
      const eta = await getETAForParticipant(
        { lat: p.lat, lon: p.lng },
        destinationCoords,
        apiKey
      );
      if (eta) {
        arr.push({
          id: p.id,
          name: p.name,
          etaMinutes: Math.round(eta.etaSeconds / 60),
          distanceKm: (eta.distanceMeters / 1000).toFixed(1),
        });
      }
    }
  
    arr.sort((a, b) => a.etaMinutes - b.etaMinutes); // fastest first  
    setFriendsETA(arr);
  }, [participants, trip?.destination]);

  useEffect(() => {
    if (participants.length > 0) {
      refreshAllFriendsETA();
    }
  }, [participants, refreshAllFriendsETA]);


  const copyCode = () => {
    if (!trip) return;
    navigator.clipboard.writeText(trip.id);
    toast({ title: 'Trip code copied!' });
  };
  
  const handleSendMessage = async (text: string) => {
    if (!tripId || !currentUser) return;
    const payload = {
        senderId: currentUser.uid,
        text: text,
        userName: currentUser.name,
        avatarUrl: `https://i.pravatar.cc/150?u=${currentUser.uid}`
    };
    await sendMessage(tripId, payload);
  };

  const handleAddExpense = async (newExpense: { paidBy: string; amount: number; label: string }) => {
    if (!tripId) return;
    await addExpense(tripId, newExpense);
  }

  const mapParticipants = useMemo(() => {
      if (!participants) return [];
      return participants.map(p => ({
        id: p.id,
        name: p.name,
        coords: (p.lat && p.lng) ? { lat: p.lat, lon: p.lng } : undefined,
        avatarUrl: p.avatarUrl
      }));
  }, [participants]);


  if (!trip) {
    return <div className="flex h-screen items-center justify-center">Loading trip...</div>;
  }

  const chatMessages = messages.map(msg => ({
      id: msg.id,
      userName: msg.userName === currentUser?.name ? 'You' : msg.userName,
      text: msg.text,
      timestamp: msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : (msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''),
      avatarUrl: msg.avatarUrl
  }));

  const uiParticipants = useMemo(() => {
    return participants.map(p => {
      const etaData = friendsETA.find(f => f.id === p.id);
      return {
        ...p,
        eta: etaData ? `${etaData.etaMinutes} min` : '...',
      };
    });
  }, [participants, friendsETA]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black">
      <TempEmuCheck />
      <header className="flex-shrink-0 border-b bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold font-heading">{trip.name}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                 <p className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {trip.destination.name}</p>
                 <TripCodeBadge code={trip.id} onCopy={copyCode} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm"><Phone className="h-4 w-4 mr-2" /> Voice Call</Button>
              <Button variant="outline" size="sm"><Video className="h-4 w-4 mr-2" /> Video Call</Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="container mx-auto h-full px-4 py-4">
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 h-full">
            
            <div className="md:col-span-2 lg:col-span-3 h-full flex flex-col gap-6">
               <Card className="flex-grow-[2] flex flex-col overflow-hidden rounded-lg">
                  <TomTomMapController 
                    participants={mapParticipants} 
                    destination={{
                      coords: { lat: trip.destination.lat, lon: trip.destination.lng },
                      label: trip.destination.name
                    }}
                  />
               </Card>
               <Card className="flex-grow-[1]">
                 <ParticipantsList participants={uiParticipants} />
               </Card>
            </div>

            <div className="md:col-span-1 lg:col-span-1 h-full">
              <Card className="h-full flex flex-col">
                 <Tabs defaultValue="chat" className="flex-1 flex flex-col">
                  <TabsList className="p-2 w-full grid grid-cols-3">
                    <TabsTrigger value="chat"><MessageCircle className="h-4 w-4 mr-2" />Chat</TabsTrigger>
                    <TabsTrigger value="call"><Phone className="h-4 w-4 mr-2" />Call</TabsTrigger>
                    <TabsTrigger value="expenses"><CreditCard className="h-4 w-4 mr-2" />Expenses</TabsTrigger>
                  </TabsList>
                  <TabsContent value="chat" className="flex-1 overflow-y-auto">
                    <ChatBox messages={chatMessages} onSendMessage={handleSendMessage} />
                  </TabsContent>
                  <TabsContent value="call" className="p-6 text-center">
                    <h3 className="font-semibold mb-2">Calling Feature</h3>
                    <p className="text-sm text-muted-foreground mb-4">Group voice and video calls are coming soon!</p>
                    <div className="flex flex-col gap-2">
                        <Button disabled><Phone className="h-4 w-4 mr-2" /> Start Voice Call</Button>
                        <Button disabled><Video className="h-4 w-4 mr-2" /> Start Video Call</Button>
                    </div>
                  </TabsContent>
                  <TabsContent value="expenses" className="flex-1 overflow-y-auto p-4">
                    <ExpenseCalculator 
                        participants={uiParticipants} 
                        expenses={expenses}
                        onAddExpense={handleAddExpense}
                    />
                  </TabsContent>
                </Tabs>
              </Card>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
