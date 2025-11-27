// src/components/trip/TripRoomClient.tsx
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import useTripRealtime from "@/hooks/useTripRealtime";
import useLiveLocation from "@/hooks/useLiveLocation";
import { getTrip } from "@/lib/storeAdapter";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, LocateFixed, CircleHelp, Car, TramFront, MessagesSquare, Receipt } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { useReverseGeocode } from '@/hooks/useReverseGeocode';
import RideButton from './RideButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatBox } from './ChatBox';
import { ExpenseCalculator } from './ExpenseCalculator';


// Dynamic import prevents SSR rendering of map controller
const TomTomMapController = dynamic(
  () => import('@/components/trip/TomTomMapController'),
  { ssr: false }
);

/**
 * TripRoomClient
 *
 * Responsibilities:
 * - Provide participants data to TomTomMapController (object keyed by id)
 * - Receive ETA updates from the map via onParticipantETA and store them in local state
 * - Display a simple sidebar with participant list + ETA
 *
 * Notes: adapt the data-source code (fetch from Firestore, props, or TripRoom context) where marked.
 */

type Participant = {
  id: string;
  name?: string;
  avatarUrl?: string;
  lat?: number;
  lng?: number;
  coords?: { lat: number; lng: number };
};

type Props = {
  tripId: string;
  currentUser: { id: string; name: string; avatar?: string | null } | null;
  initialTrip?: { origin?: any; destination?: any } | null;
};

export default function TripRoomClient({ tripId, currentUser, initialTrip = null }: Props) {
  // ----------------------------
  // Data Fetching
  // ----------------------------
  const { participants: realtimeParticipants, messages, expenses, status, sendMessage, addExpense } = useTripRealtime(tripId);
  const { lastPosition } = useLiveLocation(tripId, currentUser ?? { id: "anon", name: "Guest" }, { watchIntervalMs: 5000, enableWatch: true });
  const [tripMeta, setTripMeta] = useState<any>(initialTrip);


  // ----------------------------
  // Local UI state
  // ----------------------------
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number | null; distanceMeters: number | null }>>({});
  const [followId, setFollowId] = useState<string | null>(null);

  // Fetch initial trip metadata if not provided
  useEffect(() => {
    if (!initialTrip && tripId) {
      (async () => {
        try {
          const r = await getTrip(tripId);
          if (r?.data) setTripMeta(r.data);
        } catch (e) {
          console.error("TripRoomClient: failed to fetch initial trip meta", e);
        }
      })();
    }
  }, [tripId, initialTrip]);

  // ----------------------------
  // Data Transformation
  // ----------------------------
  const participantsForMap = useMemo(() => {
    const participantObj: Record<string, Participant> = {};
    (realtimeParticipants || []).forEach((p: any) => {
      if (p && p.id && p.coords) {
        participantObj[p.id] = {
          id: p.id,
          name: p.name || "Unknown",
          avatarUrl: p.avatarUrl,
          lat: p.coords.lat,
          lng: p.coords.lng,
        };
      }
    });
    return participantObj;
  }, [realtimeParticipants]);
  
  const friendsETAList = useMemo(() => {
    return Object.values(participantsForMap)
      .map((p) => {
        const e = participantETAs[p.id];
        return {
          ...p,
          etaSeconds: e?.etaSeconds ?? null,
          distanceMeters: e?.distanceMeters ?? null,
        };
      })
      .sort((a, b) => {
        const ta = a.etaSeconds ?? Infinity;
        const tb = b.etaSeconds ?? Infinity;
        return ta - tb;
      });
  }, [participantsForMap, participantETAs]);

  const chatMessages = useMemo(() => {
    return (messages || []).map(msg => ({
      id: msg.id,
      userName: msg.senderId === currentUser?.id ? 'You' : msg.userName,
      text: msg.text,
      timestamp: msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'}) : '',
      avatarUrl: msg.avatarUrl
    })).sort((a,b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [messages, currentUser?.id]);


  // ----------------------------
  // Callbacks & Effects
  // ----------------------------
  const handleParticipantETA = useCallback((id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => {
    setParticipantETAs(prev => ({ ...prev, [id]: data }));
  }, []);

  const handleSendMessage = (text: string) => {
    if(!currentUser) return;
    sendMessage({
        senderId: currentUser.id,
        userName: currentUser.name,
        avatarUrl: currentUser.avatar || `https://i.pravatar.cc/150?u=${currentUser.id}`,
        text
    });
  }

  const handleAddExpense = (newExpense: Omit<typeof expenses[0], 'id'>) => {
    addExpense(newExpense);
  }

  useEffect(() => {
    if (currentUser) {
      setFollowId(currentUser.id);
      const timer = setTimeout(() => setFollowId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const formatETA = (s?: number | null) => {
    if (s === undefined || s === null) return '--';
    const mins = Math.round(s / 60);
    if (mins < 60) return `${mins} min`;
    const hours = Math.floor(mins / 60);
    const rem = mins % 60;
    return `${hours}h ${rem}m`;
  };

  const handleFollow = (id: string) => {
    setFollowId(id);
    setTimeout(() => setFollowId(null), 3000);
  }
  
  const pickupLat = lastPosition?.lat;
  const pickupLng = lastPosition?.lng;
  const dropLat = tripMeta?.destination?.lat;
  const dropLng = tripMeta?.destination?.lng;

  const { address: pickupName } = useReverseGeocode(pickupLat, pickupLng);
  const { address: dropName } = useReverseGeocode(dropLat, dropLng);

  const pickup = pickupLat && pickupLng ? { lat: pickupLat, lng: pickupLng, name: pickupName || 'Current Location' } : undefined;
  const drop = dropLat && dropLng ? { lat: dropLat, lng: dropLng, name: dropName || tripMeta?.destination?.name || 'Destination' } : undefined;


  // ----------------------------
  // Render
  // ----------------------------
  return (
    <div className='w-full h-full flex bg-background' style={{ minHeight: 360 }}>
      {/* Left: Map (flex-grow) */}
      <div className='flex-1 min-h-full'>
        <TomTomMapController
          participants={participantsForMap}
          computeRoutes={true}
          onParticipantETA={handleParticipantETA}
          followId={followId}
          initialCenter={tripMeta?.destination ? { lat: tripMeta.destination.lat, lng: tripMeta.destination.lng } : undefined}
        />
      </div>

      {/* Right: Sidebar */}
      <aside className="w-96 border-l bg-background flex flex-col">
        <Tabs defaultValue="participants" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-3 rounded-none">
            <TabsTrigger value="participants"><Users className="h-4 w-4 mr-2" />Participants</TabsTrigger>
            <TabsTrigger value="chat"><MessagesSquare className="h-4 w-4 mr-2"/>Chat</TabsTrigger>
            <TabsTrigger value="expenses"><Receipt className="h-4 w-4 mr-2"/>Expenses</TabsTrigger>
          </TabsList>
          
          <TabsContent value="participants" className="flex-1 flex flex-col p-4">
              <ScrollArea className="flex-1">
                  <div className="space-y-3 pr-4">
                  {status === 'connecting' ? (
                      Array.from({length: 3}).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                  ) : friendsETAList.length === 0 ? (
                      <div className="text-center text-muted-foreground p-8">Waiting for participant locations...</div>
                  ) : (
                      friendsETAList.map((p) => {
                      const eta = participantETAs[p.id];
                      return (
                          <Card key={p.id} className="p-3 flex items-center gap-3">
                              <Avatar>
                                  <AvatarImage src={p.avatarUrl} alt={p.name} />
                                  <AvatarFallback>{p.name?.slice(0,2).toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                  <div className="font-semibold">{p.name || 'Unnamed'}</div>
                                  <div className="text-xs text-muted-foreground">
                                  {eta && typeof eta.distanceMeters === 'number' ? `${(eta.distanceMeters / 1000).toFixed(1)} km • ${formatETA(eta.etaSeconds)}` : 'Calculating ETA...'}
                                  </div>
                              </div>
                              <Button size="icon" variant="ghost" onClick={() => handleFollow(p.id)}>
                                  <LocateFixed className="h-4 w-4" />
                              </Button>
                          </Card>
                      );
                      })
                  )}
                  </div>
              </ScrollArea>
               <div className="mt-auto pt-4 border-t">
                <h5 className="mb-2 font-semibold text-sm">Book a Ride</h5>
                {pickup && drop ? (
                  <div className="grid grid-cols-2 gap-2">
                    <RideButton provider="uber" pickup={pickup} drop={drop} />
                    <RideButton provider="ola" pickup={pickup} drop={drop} />
                    <RideButton provider="rapido" pickup={pickup} drop={drop} />
                    <RideButton provider="transit" pickup={pickup} drop={drop} />
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground flex items-center gap-2">
                    <CircleHelp className="h-4 w-4" />
                    <span>Enable location to book a ride.</span>
                  </div>
                )}
              </div>
          </TabsContent>

          <TabsContent value="chat" className="m-0 flex-1">
            <ChatBox messages={chatMessages} onSendMessage={handleSendMessage} />
          </TabsContent>
          
          <TabsContent value="expenses" className="m-0 flex-1 p-4">
             <ScrollArea className='h-full'>
                <ExpenseCalculator 
                  participants={realtimeParticipants} 
                  expenses={expenses} 
                  onAddExpense={handleAddExpense} 
                />
             </ScrollArea>
          </TabsContent>

        </Tabs>
      </aside>
    </div>
  );
}

    