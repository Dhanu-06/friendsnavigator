// src/app/trips/[tripId]/page.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { getCurrentUser, type LocalUser } from '@/lib/localAuth';
import useLiveLocation from '@/hooks/useLiveLocation';
import useTripRealtime from '@/hooks/useTripRealtime';

const TripRoomClient = dynamic(() => import('@/components/trip/TripRoomClient'), {
  ssr: false,
  loading: () => <div className="flex h-screen w-full items-center justify-center">Loading Trip...</div>,
});

export default function TripPage() {
  const params = useParams();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const localUser = getCurrentUser();

  // Define a user object, falling back to a guest identity if not logged in.
  const currentUser: { id: string; name: string; avatarUrl: string } = localUser
    ? {
        id: localUser.uid,
        name: localUser.name,
        avatarUrl: `https://i.pravatar.cc/150?u=${localUser.uid}`,
      }
    : {
        id: 'guest-' + Math.random().toString(36).slice(2, 9),
        name: 'Guest',
        avatarUrl: `https://i.pravatar.cc/150?u=guest`,
      };

  // Subscribe to real-time trip data (participants, messages, expenses)
  const {
    participants,
    messages,
    expenses,
    status: tripStatus,
    error: tripError,
    joinOrUpdateParticipant,
    sendMessage,
    addExpense,
  } = useTripRealtime(tripId);

  // Enable live location tracking for the current user
  const { lastPosition, permission: locationPermission } = useLiveLocation(tripId, currentUser, {
    enableWatch: true,
  });

  // Effect to publish the user's location whenever it changes.
  // This also serves to register or update the user in the participant list.
  React.useEffect(() => {
    if (lastPosition && currentUser) {
      const participantUpdate = {
        ...currentUser,
        lat: lastPosition.lat,
        lng: lastPosition.lng,
        coords: lastPosition,
        updatedAt: Date.now(),
      };
      joinOrUpdateParticipant(participantUpdate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPosition, currentUser?.id]);
  
  if (!tripId) {
      return <div className="flex h-screen w-full items-center justify-center">Invalid Trip ID.</div>;
  }
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <TripRoomClient
        tripId={tripId}
        currentUser={currentUser}
        participants={participants}
        messages={messages}
        expenses={expenses}
        onSendMessage={sendMessage}
        onAddExpense={addExpense}
        connectionStatus={tripStatus}
        locationPermission={locationPermission}
      />
    </div>
  );
}
