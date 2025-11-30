
// src/components/trip/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useUser } from "@/firebase/auth/use-user";
import useTripRealtime from "@/hooks/useTripRealtime";
import useLiveLocation from "@/hooks/useLiveLocation";
import useEtaPoller from "@/hooks/useEtaPoller";
import { fetchJson } from "@/lib/fetchJson";
import DestinationSearch from "../DestinationSearch.client";
import { ParticipantsList } from "./ParticipantsList";
import { ChatBox } from "./ChatBox";
import { ExpenseCalculator } from "./ExpenseCalculator";
import { TripCodeBadge } from "./TripCodeBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, MessageSquare, IndianRupee } from "lucide-react";
import TomTomMapController from "./TomTomMapController";
import RoutePolyline from "../RoutePolyline";
import ComputeToggle from "./ComputeToggle";
import RideButton from "./RideButton";
import { LatLng } from "@/utils/rideLinks";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

type Participant = { id: string; name: string; avatarUrl?: string; lng?: number; lat?: number; coords?: {lat: number, lng: number}, mode?: string, eta?: string, status?: 'On the way' | 'Reached' | 'Delayed' };


export default function TripRoomClient({ tripId }: { tripId: string }) {
  const { user } = useUser();
  const { tripDoc, participants, messages, expenses, status: tripStatus, sendMessage, addExpense } = useTripRealtime(tripId, user);
  
  // UI state
  const [computeRoutes, setComputeRoutes] = useState(true);
  const [destination, setDestination] = useState<{ lat: number; lng: number, name?: string } | null>(tripDoc?.destination || null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinnedPreview, setPinnedPreview] = useState<string | null>(null);
  const [originMode, setOriginMode] = useState<"pickup" | "device" | "participant">("pickup");
  const [participantOriginId, setParticipantOriginId] = useState<string | null>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);

  // Enable live location for the current user
  const { lastPosition } = useLiveLocation(tripId, user ? { id: user.uid, name: user.displayName || 'Anonymous', avatarUrl: user.photoURL } : null, { enableWatch: true });
  
  const liveParticipants = useMemo(() => {
    return participants.map(p => ({
        id: p.id,
        name: p.name,
        avatarUrl: p.avatarUrl,
        lat: p.coords?.lat,
        lng: p.coords?.lng,
        mode: p.mode || "Car",
        eta: "--",
        status: "On the way",
    })).filter(p => p.lat && p.lng);
  }, [participants]);

  function computeOrigin() {
    if (originMode === "pickup") {
      return tripDoc?.pickup || null;
    } else if (originMode === "device") {
      return lastPosition || null;
    } else if (originMode === "participant") {
      if (!participantOriginId) return null;
      const p = liveParticipants.find(x => x.id === participantOriginId);
      if (!p) return null;
      return { lat: p.lat!, lng: p.lng! };
    }
    return null;
  }

  const mainOrigin = computeOrigin();

  const poller = useEtaPoller({
    participants: liveParticipants.map(p => ({ id: p.id, lat: p.lat!, lng: p.lng! })),
    destination,
    live: computeRoutes,
  });

  const [etas, setEtas] = useState<Record<string, { etaSeconds: number }>>({});
  useEffect(() => {
    const unsub = poller.etaService.subscribe(() => {
      const newEtas: Record<string, { etaSeconds: number }> = {};
      for (const p of liveParticipants) {
        const smoothed = poller.etaService.getSmoothed(p.id);
        if (smoothed) {
          newEtas[p.id] = { etaSeconds: smoothed.etaSeconds };
        }
      }
      setEtas(newEtas);
    });
    return unsub;
  }, [poller.etaService, liveParticipants]);

  const participantsWithEta = useMemo(() => {
    return liveParticipants.map(p => ({
      ...p,
      eta: etas[p.id] ? `${Math.round(etas[p.id].etaSeconds / 60)} min` : '--'
    }));
  }, [liveParticipants, etas]);


  useEffect(() => {
    if(tripDoc?.destination) {
        setDestination(tripDoc.destination);
    }
  }, [tripDoc?.destination]);


  // When destination or main origin changes, draw main route from chosen origin to destination
  useEffect(() => {
    async function drawMain() {
      if (!destination || !mainOrigin) return;
      if (!computeRoutes) {
          setRouteCoords([]);
          return;
      }
      try {
        const originStr = `${mainOrigin.lng},${mainOrigin.lat}`;
        const destStr = `${destination.lng},${destination.lat}`;
        const r = await fetchJson(`/api/route?origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}`);
        
        const route = r?.geojson?.coordinates?.map((c: [number, number]) => ({
            longitude: c[0],
            latitude: c[1]
        }));
        setRouteCoords(route || []);
      } catch (e) {
        console.warn("drawMain error", e);
      }
    }
    drawMain();
  }, [destination, mainOrigin, computeRoutes]);

  const [map, setMap] = useState<any>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(tripId);
  }

  return (
    <div className="flex h-screen w-screen bg-background">
      {/* Sidebar */}
      <aside className="w-[380px] border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold font-heading">{tripDoc?.name || 'Loading Trip...'}</h2>
          <p className="text-sm text-muted-foreground">{destination?.name || tripDoc?.destination?.name || 'No destination set'}</p>
           <div className="mt-4">
            <TripCodeBadge code={tripId} onCopy={handleCopy} />
          </div>
        </div>

        <Tabs defaultValue="participants" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 m-2">
                <TabsTrigger value="participants"><Map className="w-4 h-4 mr-1"/>Participants</TabsTrigger>
                <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-1"/>Chat</TabsTrigger>
                <TabsTrigger value="expenses"><IndianRupee className="w-4 h-4 mr-1"/>Expenses</TabsTrigger>
            </TabsList>
            <TabsContent value="participants" className="flex-1 p-4">
                <ParticipantsList participants={participantsWithEta} />
            </TabsContent>
            <TabsContent value="chat" className="flex-1">
                <ChatBox 
                    messages={(messages as any[]).map(m => ({...m, timestamp: m.createdAt ? new Date(m.createdAt).toLocaleTimeString() : '...'}))} 
                    onSendMessage={sendMessage}
                />
            </TabsContent>
            <TabsContent value="expenses" className="flex-1 p-4">
                <ExpenseCalculator 
                    participants={participants} 
                    expenses={expenses}
                    onAddExpenseAction={addExpense}
                />
            </TabsContent>
        </Tabs>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between gap-4">
            <div className="flex-1">
                <DestinationSearch onSelect={(s) => setDestination({ lat: s.lat, lng: s.lng, name: s.label })} />
            </div>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-muted-foreground">Origin:</span>
                    <select value={originMode} onChange={(e) => setOriginMode(e.target.value as any)} className="p-1 rounded-md border bg-transparent text-sm">
                        <option value="pickup">Pickup</option>
                        <option value="device">My Device</option>
                        <option value="participant">Participant</option>
                    </select>
                    {originMode === "participant" && (
                        <select value={participantOriginId ?? ""} onChange={(e) => setParticipantOriginId(e.target.value || null)} className="p-1 rounded-md border bg-transparent text-sm">
                        <option value="">— select —</option>
                        {liveParticipants.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    )}
                </div>
                 <ComputeToggle
                    value={computeRoutes}
                    onChange={setComputeRoutes}
                  />
            </div>
        </div>
        <div className="flex-1 relative">
            <TomTomMapController 
                participants={liveParticipants.reduce((acc, p) => ({...acc, [p.id]: p }), {})}
                computeRoutes={computeRoutes}
                onMapReady={setMap}
                destination={destination}
                onRouteReady={(coords) => setRouteCoords(coords)}
                origin={mainOrigin}
            />
            {map && computeRoutes && routeCoords.length > 0 && <RoutePolyline map={map} routeCoords={routeCoords} />}
            <div className="absolute bottom-4 right-4 bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg flex gap-2">
                <RideButton provider="ola" pickup={lastPosition as LatLng} drop={destination as LatLng} label="Book Ola"/>
                <RideButton provider="uber" pickup={lastPosition as LatLng} drop={destination as LatLng} label="Book Uber"/>
                <RideButton provider="rapido" pickup={lastPosition as LatLng} drop={destination as LatLng} label="Book Rapido"/>
            </div>
        </div>
      </main>
    </div>
  );
}
