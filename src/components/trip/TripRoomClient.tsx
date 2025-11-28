'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { User as AuthUser } from 'firebase/auth';

import useReverseGeocode from '@/hooks/useReverseGeocode';
import { Card } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { IndianRupee, MessageSquare, Users } from 'lucide-react';
import { TripCodeBadge } from './TripCodeBadge';
import { useToast } from '../ui/use-toast';
import ComputeToggle from './ComputeToggle';
import { ParticipantsList } from './ParticipantsList';
import { ChatBox } from './ChatBox';
import { ExpenseCalculator } from './ExpenseCalculator';
import useTripRealtime from '@/hooks/useTripRealtime';
import useLiveLocation from '@/hooks/useLiveLocation';
import { useUser } from '@/firebase/auth/use-user';
import RideButton from './RideButton';
import type { LatLng } from '@/utils/rideLinks';
import RoutePolyline from '@/components/RoutePolyline';

// dynamic import for SSR-safety: TomTomMapController uses window and TomTom SDK
const TomTomMapController = dynamic(() => import('./TomTomMapController'), { ssr: false });

type Participant = {
  id: string;
  name?: string;
  lat: number;
  lng: number;
};

type RouteCoords = Array<{ latitude: number; longitude: number }>;


export default function TripRoomClient({ tripId }: { tripId: string }) {
  const { toast } = useToast();
  const { user: authUser, loading: authLoading } = useUser();
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<RouteCoords>([]);
  const [routeSummary, setRouteSummary] = useState<{ travelTimeSeconds: number | null, distanceMeters: number | null;}>({ travelTimeSeconds: null, distanceMeters: null});


  const currentUser = useMemo(() => {
    if (!authUser) return null;
    return {
      id: authUser.uid,
      name: authUser.displayName || authUser.email || 'Anonymous',
      avatarUrl: authUser.photoURL || `https://i.pravatar.cc/150?u=${authUser.uid}`,
    };
  }, [authUser]);

  const { participants, messages, expenses, tripDoc, status, joinOrUpdateParticipant, sendMessage, addExpense } = useTripRealtime(tripId, currentUser);

  useLiveLocation(tripId, currentUser, { enableWatch: true });

  const participantsById = useMemo(() => {
    const m: Record<string, Participant> = {};
    (participants || []).forEach((p) => {
      if (!p || !p.id || p.lat == null || p.lng == null) return;
      m[p.id] = {id: p.id, name: p.name, lat: p.lat, lng: p.lng};
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
  const pickupLat = originState?.lat ?? participants[0]?.lat ?? 12.9716;
  const pickupLng = originState?.lng ?? participants[0]?.lng ?? 77.5946;
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

  // called by TomTomMapController when ETA polling returns
  const handleParticipantETA = useCallback((id: string, data: { etaSeconds: number | null; distanceMeters: number | null }) => {
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
            initialCenter={originState ?? { lat: pickupLat, lng: pickupLng }}
            initialZoom={13}
            origin={originState ?? { lat: pickupLat, lng: pickupLng }}
            destination={destinationState ?? { lat: destLat, lng: destLng }}
            onMapReady={setMapInstance}
            onRouteReady={(coords, summary) => {
                setRouteCoords(coords);
                setRouteSummary(summary);
            }}
        />
        {mapInstance && routeCoords.length > 0 && computeRoutesEnabled && (
            <RoutePolyline
                map={mapInstance}
                routeCoords={routeCoords}
                etaMinutes={routeSummary.travelTimeSeconds ? Math.round(routeSummary.travelTimeSeconds/60) : undefined}
                id={`trip-${tripId}`}
            />
        )}
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
              <ExpenseCalculator participants={participants} expenses={expenses} onAddExpense={addExpense} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
