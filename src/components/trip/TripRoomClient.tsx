'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import RideButton from './RideButton';
import useReverseGeocode from '@/hooks/useReverseGeocode';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ParticipantsList, type Participant } from './ParticipantsList';
import { ChatBox, type Message } from './ChatBox';
import { ExpenseCalculator, type Expense } from './ExpenseCalculator';
import { TripCodeBadge } from './TripCodeBadge';
import { useToast } from '../ui/use-toast';
import { Wifi, WifiOff } from 'lucide-react';

const TomTomMapController = dynamic(() => import('@/components/trip/TomTomMapController'), {
  ssr: false,
});

type TripRoomClientProps = {
  tripId: string;
  currentUser: { id: string; name: string; avatarUrl: string };
  participants: Participant[];
  messages: Message[];
  expenses: Expense[];
  onSendMessage: (text: string) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  connectionStatus: 'connecting' | 'online' | 'offline' | 'error';
  locationPermission: 'granted' | 'denied' | 'prompt';
};

export default function TripRoomClient({
  tripId,
  currentUser,
  participants,
  messages,
  expenses,
  onSendMessage,
  onAddExpense,
  connectionStatus,
  locationPermission,
}: TripRoomClientProps) {
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number; distanceMeters: number }>>({});
  const [followId, setFollowId] = useState<string | null>(null);
  const { toast } = useToast();

  const participantsById = useMemo(() => {
    return participants.reduce((acc, p) => {
      if (p.id && p.coords) {
        acc[p.id] = { ...p, lat: p.coords.lat, lng: p.coords.lng };
      } else if (p.id && p.lat && p.lng) {
        acc[p.id] = { ...p, coords: { lat: p.lat, lng: p.lng }, lat: p.lat, lng: p.lng };
      }
      return acc;
    }, {} as Record<string, Participant & { lat: number; lng: number }>);
  }, [participants]);

  const handleParticipantETA = useCallback((id: string, data: { etaSeconds: number; distanceMeters: number }) => {
    setParticipantETAs((prev) => ({ ...prev, [id]: data }));
  }, []);

  const currentUserParticipant = useMemo(() => {
    return participants.find(p => p.id === currentUser.id);
  }, [participants, currentUser.id]);

  const destCoords = { lat: 13.3702, lng: 77.6835 };

  const { name: pickupName, shortName: pickupShort } = useReverseGeocode(currentUserParticipant?.coords?.lat, currentUserParticipant?.coords?.lng);
  const { name: destName, shortName: destShort } = useReverseGeocode(destCoords.lat, destCoords.lng);

  const pickup = currentUserParticipant?.coords ? { lat: currentUserParticipant.coords.lat, lng: currentUserParticipant.coords.lng, name: pickupName || pickupShort || undefined } : undefined;
  const drop = { lat: destCoords.lat, lng: destCoords.lng, name: destName || destShort || undefined };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(tripId);
    toast({ title: 'Copied!', description: 'Trip code copied to clipboard.' });
  };
  
  const formattedMessages = useMemo(() => {
      return messages.map(msg => ({
          ...msg,
          id: msg.id,
          userName: msg.senderId === currentUser.id ? 'You' : msg.userName,
          text: msg.text,
          timestamp: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
          avatarUrl: msg.avatarUrl,
      })).sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, currentUser.id]);

  return (
    <div className="w-full h-full flex flex-col md:flex-row" style={{ minHeight: 360 }}>
      <div className="flex-1 min-h-[360px] md:min-h-full relative">
        <TomTomMapController
          participants={participantsById}
          computeRoutes={true}
          onParticipantETA={handleParticipantETA}
          followId={followId}
          initialCenter={destCoords}
          initialZoom={12}
        />
        <div className="absolute top-4 left-4 z-10 flex gap-2 items-center">
            <TripCodeBadge code={tripId} onCopy={handleCopyCode} />
            <div className='p-2 bg-background rounded-full border shadow-md'>
            {connectionStatus === 'online' ? <Wifi className="h-5 w-5 text-green-600" /> : <WifiOff className="h-5 w-5 text-red-600"/>}
            </div>
        </div>
      </div>

      <aside className="w-full md:w-96 border-l bg-background flex flex-col h-[60vh] md:h-full">
        <Tabs defaultValue="participants" className="flex-1 flex flex-col">
          <TabsList className="w-full justify-around rounded-none">
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="participants" className="flex-1 overflow-y-auto">
             <Card className="border-none shadow-none rounded-none">
                <ParticipantsList participants={participants.map(p => ({
                    ...p,
                    eta: participantETAs[p.id] ? `${Math.round(participantETAs[p.id].etaSeconds / 60)} min` : '...',
                    status: 'On the way',
                }))} />
             </Card>
          </TabsContent>

          <TabsContent value="chat" className="flex-1 flex flex-col h-full m-0">
             <ChatBox messages={formattedMessages} onSendMessage={(text) => onSendMessage(text)} />
          </TabsContent>
          
          <TabsContent value="expenses" className="flex-1 overflow-y-auto">
            <Card className="border-none shadow-none rounded-none">
                <CardContent className="p-4">
                    <ExpenseCalculator 
                        participants={participants} 
                        expenses={expenses}
                        onAddExpense={onAddExpense}
                    />
                </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="p-4 border-t">
          <h4 className="font-semibold mb-3">Book a Ride</h4>
          <div className="grid grid-cols-2 gap-2">
            <RideButton provider="uber" pickup={pickup} drop={drop} className="w-full"/>
            <RideButton provider="ola" pickup={pickup} drop={drop} className="w-full"/>
            <RideButton provider="rapido" pickup={pickup} drop={drop} className="w-full"/>
            <RideButton provider="transit" pickup={pickup} drop={drop} className="w-full"/>
          </div>
          {locationPermission === 'denied' && <p className="text-xs text-destructive mt-2">Enable location permissions to book a ride from your current location.</p>}
        </div>
      </aside>
    </div>
  );
}
