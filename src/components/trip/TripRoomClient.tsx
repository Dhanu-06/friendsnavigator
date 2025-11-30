
'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';

import useReverseGeocode from '@/hooks/useReverseGeocode';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { IndianRupee, MessageSquare, Users } from 'lucide-react';
import { TripCodeBadge } from './TripCodeBadge';
import { useToast } from '../ui/use-toast';
import ComputeToggle from './ComputeToggle';
import { ParticipantsList } from './ParticipantsList';
import type { Participant as ParticipantsListPerson } from './ParticipantsList';
import { ChatBox } from './ChatBox';
import { ExpenseCalculator } from './ExpenseCalculator';
import useTripRealtime from '@/hooks/useTripRealtime';
import useLiveLocation from '@/hooks/useLiveLocation';
import { useUser } from '@/firebase/auth/use-user';
import RideButton from './RideButton';
import RoutePolyline from '@/components/RoutePolyline';
import { fetchJson } from '@/lib/fetchJson';

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

type Participant = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  mode?: string;
};

type RouteCoords = Array<{ latitude: number; longitude: number }>;


export default function TripRoomClient({ tripId }: { tripId: string }) {
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useUser();
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoords>([]);
  const [routeSummary, setRouteSummary] = useState<{ travelTimeSeconds: number | null, distanceMeters: number | null;}>({ travelTimeSeconds: null, distanceMeters: null});

  const {
    participants,
    messages,
    expenses,
    tripDoc,
    status,
    sendMessage,
    addExpense,
  } = useTripRealtime(tripId, authUser);

  const currentUser = useMemo(() => {
    if (!authUser || !tripDoc) return null;
    return {
      id: authUser.uid,
      name: authUser.displayName || authUser.email || 'Anonymous',
      avatarUrl: authUser.photoURL || `https://i.pravatar.cc/150?u=${authUser.uid}`,
      mode: tripDoc?.mode || 'car',
    };
  }, [authUser, tripDoc]);

  useLiveLocation(tripId, currentUser, { enableWatch: true, watchIntervalMs: 5000 });

  const participantsById = useMemo(() => {
    const m: Record<string, Participant> = {};
    (participants || []).forEach((p) => {
      if (!p || !p.id || !p.coords?.lat || !p.coords?.lng) return;
      m[p.id] = {id: p.id, name: p.name, lat: p.coords.lat, lng: p.coords.lng, mode: p.mode};
    });
    return m;
  }, [participants]);


  // ETAs per participant from TomTom matrix polling
  const [participantETAs, setParticipantETAs] = useState<Record<string, { etaSeconds: number; distanceMeters: number }>>({});

  // Follow a participant when user clicks Follow
  const [followId, setFollowId] = useState<string | null>(null);

  // origin/destination deduced from Firestore doc (if present) or fallbacks
  const originState = useMemo(() => tripDoc?.pickup ?? null, [tripDoc]);
  const destinationState = useMemo(() => tripDoc?.destination ?? null, [tripDoc]);


  const [computeRoutesEnabled, setComputeRoutesEnabled] = useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return true;
      const raw = window.localStorage.getItem('trip_compute_routes_enabled_v1');
      return raw === null ? true : raw === '1';
    } catch {
      return true;
    }
  });


  // Reverse geocode friendly names (hook will cache and call /api/reverse-geocode)
  const pickupLat = originState?.lat ?? participants[0]?.coords?.lat ?? 12.9716;
  const pickupLng = originState?.lng ?? participants[0]?.coords?.lng ?? 77.5946;
  const destLat = destinationState?.lat ?? 12.9750;
  const destLng = destinationState?.lng ?? 77.5990;

  const { name: pickupName, shortName: pickupShort } = useReverseGeocode(pickupLat, pickupLng);
  const { name: destName, shortName: destShort } = useReverseGeocode(destLat, destLng);
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(tripId);
    toast({
        title: "Copied!",
        description: "Trip code copied to clipboard."
    });
  }

  const augmentedParticipants: ParticipantsListPerson[] = useMemo(() => {
    return participants.map(p => ({
        id: p.id,
        name: p.name || 'Anonymous',
        avatarUrl: p.avatarUrl || `https://i.pravatar.cc/150?u=${p.id}`,
        mode: p.mode || 'Car',
        eta: participantETAs[p.id] ? `${Math.round(participantETAs[p.id].etaSeconds / 60)} min` : '...',
        status: 'On the way' as const,
        coords: p.coords ? { lat: p.coords.lat, lon: p.coords.lng } : undefined,
    }));
  }, [participants, participantETAs]);
  
  
  const [mapStatus, setMapStatus] = useState("");

  async function testRoute() {
    try {
        setMapStatus("Requesting route...");
      const origin = "77.5946,12.9716";
      const destination = "77.60,12.98";
      const data = await fetchJson(`/api/route?origin=${origin}&destination=${destination}`);
      console.log("Route response:", data);
      setMapStatus("Route response received (see console)");
    } catch (err: any) {
      console.error("Route fetch error:", err);
      setMapStatus(`Route error: ${err.message}`);
    }
  }


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
        <TripMap center={destinationState ? [destinationState.lng, destinationState.lat] : undefined} />
        
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
                     <button onClick={testRoute} style={{ marginLeft: 16 }}>Test Route</button>
                    <div>{mapStatus}</div>
                    <ParticipantsList participants={augmentedParticipants} />
                     <div className="space-y-2 pt-4">
                      <h4 className="font-semibold">Book a ride</h4>
                       <div className="flex flex-wrap gap-2">
                          <RideButton
                            provider="uber"
                            pickup={{ latitude: pickupLat, longitude: pickupLng }}
                            drop={{ latitude: destLat, longitude: destLng }}
                            label="Book Uber"
                          />
                          <RideButton
                            provider="ola"
                            pickup={{ latitude: pickupLat, longitude: pickupLng }}
                            drop={{ latitude: destLat, longitude: destLng }}
                            label="Book Ola"
                          />
                          <RideButton
                            provider="rapido"
                            pickup={{ latitude: pickupLat, longitude: pickupLng }}
                            drop={{ latitude: destLat, longitude: destLng }}
                            label="Book Rapido"
                          />
                          <RideButton
                            provider="transit"
                            pickup={{ latitude: pickupLat, longitude: pickupLng }}
                            drop={{ latitude: destLat, longitude: destLng }}
                            label="Open Maps"
                          />
                       </div>
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 flex flex-col h-full">
              <ChatBox messages={messages.map(m => ({...m, timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : ''}))} onSendMessage={sendMessage} />
            </TabsContent>
            
            <TabsContent value="expenses" className="flex-1 overflow-y-auto px-4">
              <ExpenseCalculator
                participants={participants.map(p => ({ id: p.id, name: p.name || 'Anonymous' }))}
                expenses={expenses}
                onAddExpenseAction={addExpense}
              />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
