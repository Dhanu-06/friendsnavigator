// src/components/trip/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUser } from "@/firebase/auth/use-user";
import useTripRealtime from "@/hooks/useTripRealtime";
import useLiveLocation from "@/hooks/useLiveLocation";
import useEtaPoller from "@/hooks/useEtaPoller";
import TomTomMapController from "./TomTomMapController";
import { ParticipantsList } from "./ParticipantsList";
import { ChatBox } from "./ChatBox";
import { ExpenseCalculator } from "./ExpenseCalculator";
import ComputeToggle from "./ComputeToggle";
import { Skeleton } from "../ui/skeleton";
import { TripCodeBadge } from "./TripCodeBadge";
import { useToast } from "../ui/use-toast";
import type { Message, Expense } from "@/hooks/useTripRealtime";

const RoutePolyline = dynamic(() => import("../RoutePolyline"), {
  ssr: false,
});

export default function TripRoomClient({ tripId }: { tripId: string }) {
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const [computeRoutes, setComputeRoutes] = useState(false);
  const [mapInstance, setMapInstance] = useState<any | null>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [routeSummary, setRouteSummary] = useState<{
    travelTimeSeconds: number | null;
    distanceMeters: number | null;
  }>({ travelTimeSeconds: null, distanceMeters: null });

  const {
    tripDoc,
    participants,
    messages,
    expenses,
    status: tripStatus,
    error: tripError,
    sendMessage,
    addExpense,
  } = useTripRealtime(tripId, user);

  const { lastPosition } = useLiveLocation(
    tripId,
    user ? { id: user.uid, name: user.displayName || "Me" } : null,
    { enableWatch: true }
  );

  const liveParticipants = useMemo(() => {
    return participants
      .filter((p) => p.coords?.lat && p.coords?.lng)
      .map((p) => ({
        id: p.id,
        lat: p.coords!.lat,
        lng: p.coords!.lng,
        name: p.name,
      }));
  }, [participants]);

  const poller = useEtaPoller({
    participants: liveParticipants,
    destination: tripDoc?.destination,
    live: computeRoutes,
    intervalMs: 5000,
  });

  const getEtaText = (s: number | null | undefined) => {
    if (s == null) return "--";
    const mins = Math.round(s / 60);
    return `${mins} min`;
  };

  const participantDataForUI = useMemo(() => {
    return participants.map((p) => {
      const smoothed = poller.getSmoothed(p.id);
      return {
        ...p,
        eta: getEtaText(smoothed?.etaSeconds),
        status: "On the way",
        mode: "Car", // Placeholder
      };
    });
  }, [participants, poller]);

  const chatMessagesForUI = useMemo(() => {
    return messages.map((m: Message) => ({
      id: m.id,
      userName: m.senderId === user?.uid ? "You" : m.userName,
      text: m.text,
      timestamp: m.createdAt,
      avatarUrl: m.avatarUrl,
    }));
  }, [messages, user]);

  const expenseDataForUI = useMemo(() => {
    return expenses.map((e: Expense) => ({
      id: e.id,
      paidBy: participants.find(p => p.id === e.paidBy)?.name || 'Someone',
      amount: e.amount,
      label: e.label,
    }));
  }, [expenses, participants]);

  if (userLoading || tripStatus === "connecting") {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="space-y-4 w-full max-w-4xl p-8">
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-8 w-1/4" />
            <div className="grid grid-cols-3 gap-8 pt-8">
                <div className="col-span-2 space-y-4">
                    <Skeleton className="h-[500px] w-full" />
                </div>
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (tripStatus === "error" || !tripDoc) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive">Trip Not Found</CardTitle>
            <CardDescription>
              We couldn't load the details for this trip. It might have been
              deleted, or you may not have permission to view it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Error: {tripError?.message || "An unknown error occurred."}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(tripId);
    toast({ title: "Trip code copied!" });
  };
  
  const currentUserForExpenses = participants.map(p => ({id: p.id, name: p.name}));

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black/50">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-heading">
              {tripDoc.name || "Trip Room"}
            </h1>
            <p className="text-sm text-muted-foreground">
              to {tripDoc.destination?.name}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <TripCodeBadge code={tripId} onCopy={handleCopy} />
            <ComputeToggle value={computeRoutes} onChange={setComputeRoutes} />
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="grid-background grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="overflow-hidden">
              <div className="h-[65vh] min-h-[500px]">
                <TomTomMapController
                  participants={liveParticipants.reduce(
                    (acc, p) => ({ ...acc, [p.id]: p }),
                    {}
                  )}
                  origin={tripDoc.pickup}
                  destination={tripDoc.destination}
                  computeRoutes={computeRoutes}
                  onMapReady={setMapInstance}
                  onRouteReady={(coords, summary) => {
                    setRouteCoords(coords);
                    setRouteSummary(summary);
                  }}
                >
                  {mapInstance && (
                    <RoutePolyline
                      map={mapInstance}
                      routeCoords={routeCoords}
                      etaMinutes={
                        routeSummary.travelTimeSeconds
                          ? routeSummary.travelTimeSeconds / 60
                          : undefined
                      }
                    />
                  )}
                </TomTomMapController>
              </div>
            </Card>
          </div>

          <aside>
            <Card>
              <Tabs defaultValue="participants" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="participants">Participants</TabsTrigger>
                  <TabsTrigger value="chat">Chat</TabsTrigger>
                  <TabsTrigger value="expenses">Expenses</TabsTrigger>
                </TabsList>
                <TabsContent value="participants">
                  <CardContent className="pt-4">
                    <ParticipantsList participants={participantDataForUI} />
                  </CardContent>
                </TabsContent>
                <TabsContent value="chat" className="h-[65vh] min-h-[500px]">
                   <ChatBox messages={chatMessagesForUI} onSendMessage={sendMessage} />
                </TabsContent>
                <TabsContent value="expenses">
                  <CardContent className="pt-4">
                    <ExpenseCalculator 
                        participants={currentUserForExpenses}
                        expenses={expenseDataForUI}
                        onAddExpenseAction={(newExpense) => addExpense({ paidBy: user!.uid, amount: newExpense.amount, label: newExpense.label})}
                    />
                  </CardContent>
                </TabsContent>
              </Tabs>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

