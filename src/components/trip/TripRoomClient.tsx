
'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useUser } from '@/firebase/auth/use-user';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageSquare, IndianRupee, Map, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

import useReverseGeocode from '@/hooks/useReverseGeocode';
import useLiveLocation from '@/hooks/useLiveLocation';
import useTripRealtime from '@/hooks/useTripRealtime';
import { ParticipantsList } from './ParticipantsList';
import { ChatBox } from './ChatBox';
import { ExpenseCalculator } from './ExpenseCalculator';
import ComputeToggle from './ComputeToggle';
import RideButton from './RideButton';
import { TripCodeBadge } from './TripCodeBadge';

const TomTomMapController = dynamic(() => import('./TomTomMapController'), { ssr: false });

export default function TripRoomClient({ tripId }: { tripId: string }) {
  const { user: authUser, loading: authLoading } = useUser();
  const { toast } = useToast();
  
  const currentUser = useMemo(() => {
    if (!authUser) return null;
    return {
      id: authUser.uid,
      name: authUser.displayName || authUser.email || 'Anonymous',
      avatarUrl: authUser.photoURL || `https://i.pravatar.cc/150?u=${authUser.uid}`,
    };
  }, [authUser]);

  const {
    participants,
    messages,
    expenses,
    status,
    joinOrUpdateParticipant,
    sendMessage,
    addExpense,
  } = useTripRealtime(tripId, currentUser);

  const { lastPosition } = useLiveLocation(tripId, currentUser, { enableWatch: true });
  
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number; distanceMeters: number }>>({});
  const [followId, setFollowId] = useState<string | null>(null);

  const [computeRoutesEnabled, setComputeRoutesEnabled] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return true;
      const raw = window.localStorage.getItem('trip_compute_routes_enabled_v1');
      return raw === null ? true : raw === '1';
    } catch {
      return true;
    }
  });

  const participantsById = useMemo(() => {
    const m: Record<string, any> = {};
    participants.forEach((p) => {
      m[p.id] = p;
    });
    return m;
  }, [participants]);

  // Update participant with live location
  React.useEffect(() => {
    if (lastPosition && currentUser) {
      joinOrUpdateParticipant({
        id: currentUser.id,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl,
        lat: lastPosition.lat,
        lng: lastPosition.lng,
        coords: lastPosition,
        updatedAt: Date.now(),
      });
    }
  }, [lastPosition, currentUser?.id]);


  // Placeholder for destination, can be fetched from trip data
  const destination = { lat: 12.9750, lng: 77.5990 };
  const origin = participants.length > 0 ? { lat: participants[0].lat!, lng: participants[0].lng! } : { lat: 12.9716, lng: 77.5946};

  const { name: pickupName } = useReverseGeocode(origin.lat, origin.lng);
  const { name: destName } = useReverseGeocode(destination.lat, destination.lng);
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(tripId);
    toast({
        title: "Copied!",
        description: "Trip code copied to clipboard."
    });
  }

  const handleParticipantETA = React.useCallback((id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => {
    setParticipantETAs((prev) => {
      const copy = { ...prev };
      if (data.etaSeconds == null || data.distanceMeters == null) {
        delete copy[id];
      } else {
        copy[id] = { etaSeconds: data.etaSeconds, distanceMeters: data.distanceMeters };
      }
      return copy;
    });
  }, []);

  const augmentedParticipants = useMemo(() => {
    return participants.map(p => ({
        ...p,
        eta: participantETAs[p.id] ? `${Math.round(participantETAs[p.id].etaSeconds / 60)} min` : '...',
        status: 'On the way', // Placeholder status
        mode: p.mode || 'Car' // Placeholder mode
    }));
  }, [participants, participantETAs]);


  if (authLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Loading user...</div>;
  }
  
  if (!currentUser) {
    // This should ideally redirect to login
    return <div className="flex h-screen w-full items-center justify-center">Please log in to view this trip.</div>;
  }
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 h-screen bg-muted/20">
      <div className="lg:col-span-2 xl:col-span-3 h-full relative">
        <TomTomMapController
            participants={participantsById}
            computeRoutes={computeRoutesEnabled}
            onParticipantETA={handleParticipantETA}
            followId={followId}
            initialCenter={origin}
            initialZoom={13}
            origin={origin}
            destination={destination}
        />
        <div className="absolute top-4 left-4 z-10">
            <Card className="p-2">
                <TripCodeBadge code={tripId} onCopy={handleCopyCode} />
            </Card>
        </div>
      </div>
      
      <div className="h-full flex flex-col">
        <Card className="m-2 mb-0 flex-1 rounded-b-none flex flex-col">
          <Tabs defaultValue="participants" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-4">
              <TabsTrigger value="participants"><Users className="mr-2"/> Status</TabsTrigger>
              <TabsTrigger value="chat"><MessageSquare className="mr-2"/> Chat</TabsTrigger>
              <TabsTrigger value="expenses"><IndianRupee className="mr-2"/> Expenses</TabsTrigger>
            </TabsList>
            
            <TabsContent value="participants" className="flex-1 overflow-y-auto px-4">
                <div className="space-y-4">
                    <ComputeToggle value={computeRoutesEnabled} onChange={setComputeRoutesEnabled} />
                    <ParticipantsList participants={augmentedParticipants} />
                </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col h-full">
              <ChatBox messages={messages.map(m => ({...m, timestamp: new Date(m.createdAt).toLocaleTimeString()}))} onSendMessage={sendMessage} />
            </TabsContent>
            
            <TabsContent value="expenses" className="flex-1 overflow-y-auto px-4">
              <ExpenseCalculator participants={participants} expenses={expenses} onAddExpense={addExpense} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
