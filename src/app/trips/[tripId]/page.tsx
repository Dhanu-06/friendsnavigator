'use client';

import { useState, useEffect } from 'react';
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
  Share2,
} from 'lucide-react';
import MapClient from '@/components/trip/MapClient';
import { ParticipantsList } from '@/components/trip/ParticipantsList';
import { ChatBox } from '@/components/trip/ChatBox';
import { ExpenseCalculator } from '@/components/trip/ExpenseCalculator';
import { TripCodeBadge } from '@/components/trip/TripCodeBadge';
import { useToast } from '@/components/ui/use-toast';
import { getTripById } from '@/lib/tripStore';
import type { Trip } from '@/lib/tripStore';
import { getCurrentUser } from '@/lib/localAuth';
import useTripRealtime from '@/hooks/useTripRealtime';
import type { Participant } from '@/hooks/useTripRealtime';
import { startSimulatedMovement } from '@/utils/demoLocationSimulator';

export default function TripPage() {
  const params = useParams();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const { toast } = useToast();
  const [trip, setTrip] = useState<Trip | null>(null);

  // Realtime data hooks
  const { participants, messages, expenses, joinOrUpdateParticipant, sendMessage, addExpense } = useTripRealtime(tripId);

  // Effect to load trip data and join as a participant
  useEffect(() => {
    if (!tripId) return;
    
    const localTrip = getTripById(tripId);
    if (localTrip) {
      setTrip(localTrip);

      const localUser = getCurrentUser();
      const userId = localUser?.uid ?? 'anon_' + Math.random().toString(36).slice(2, 6);
      const userName = localUser?.name ?? 'Anonymous';
      const userAvatar = `https://i.pravatar.cc/150?u=${userId}`;

      const participantPayload: Participant = {
        id: userId,
        name: userName,
        avatarUrl: userAvatar,
        mode: 'unknown',
        lat: localTrip.destination.lat,
        lng: localTrip.destination.lng,
        status: 'joined',
      };

      // Announce participation to Firestore (or local fallback)
      joinOrUpdateParticipant(tripId, participantPayload);
      console.log('Joined trip as:', userName);

      // Start simulating movement
      const stopSimulation = startSimulatedMovement(
        localTrip.destination.lat,
        localTrip.destination.lng,
        (lat, lng) => {
          const updatePayload: Participant = { ...participantPayload, lat, lng, status: 'On the way' };
          joinOrUpdateParticipant(tripId, updatePayload);
        }
      );
      
      // Cleanup simulation on component unmount
      return () => stopSimulation();

    } else {
      // Handle trip not found
      toast({
        variant: 'destructive',
        title: 'Trip not found',
        description: 'The trip you are looking for does not exist in local storage.',
      });
    }
  }, [tripId, joinOrUpdateParticipant, toast]);


  const copyCode = () => {
    if (!trip) return;
    navigator.clipboard.writeText(trip.id);
    toast({ title: 'Trip code copied!' });
  };
  
  const handleSendMessage = async (text: string) => {
    if (!tripId) return;
    const localUser = getCurrentUser();
    const payload = {
        senderId: localUser?.uid ?? 'anon',
        text: text,
        userName: localUser?.name ?? 'You',
        avatarUrl: `https://i.pravatar.cc/150?u=${localUser?.uid ?? 'anon'}`
    };
    await sendMessage(tripId, payload);
  };

  const handleAddExpense = async (newExpense: { paidBy: string; amount: number; label: string }) => {
    if (!tripId) return;
    await addExpense(tripId, newExpense);
  }

  if (!trip) {
    return <div className="flex h-screen items-center justify-center">Loading trip...</div>;
  }

  const friendLocations = participants.map(p => ({
    id: p.id,
    name: p.name,
    lat: p.lat ?? 0,
    lng: p.lng ?? 0,
    mode: p.mode,
    avatarUrl: p.avatarUrl
  }));

  const chatMessages = messages.map(msg => ({
      id: msg.id,
      userName: msg.userName,
      text: msg.text,
      timestamp: msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleTimeString() : new Date(msg.createdAt).toLocaleTimeString(),
      avatarUrl: msg.avatarUrl
  }));

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-black">
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
               <Card className="flex-grow-[2] flex flex-col">
                  <MapClient friends={friendLocations} center={{lat: trip.destination.lat, lng: trip.destination.lng}} />
               </Card>
               <Card className="flex-grow-[1]">
                 <ParticipantsList participants={participants} />
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
                        participants={participants} 
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
