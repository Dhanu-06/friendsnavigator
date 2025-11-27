// src/app/trips/[tripId]/page.tsx
'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import useLiveLocation from '@/hooks/useLiveLocation';
import useTripRealtime from '@/hooks/useTripRealtime';
import { useUser } from '@/firebase/auth/use-user';

const TripRoomClient = dynamic(() => import('@/components/trip/TripRoomClient'), {
  ssr: false,
  loading: () => <div className="flex h-screen w-full items-center justify-center">Loading Trip...</div>,
});

export default function TripPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const { user, loading: userLoading } = useUser();

  const currentUser = user 
    ? {
        id: user.uid,
        name: user.displayName || user.email || 'Anonymous',
        avatarUrl: user.photoURL || `https://i.pravatar.cc/150?u=${user.uid}`,
      }
    : null;

  const {
    participants,
    messages,
    expenses,
    status: tripStatus,
    error: tripError,
    joinOrUpdateParticipant,
    sendMessage,
    addExpense,
  } = useTripRealtime(tripId, currentUser);

  const { lastPosition, permission: locationPermission } = useLiveLocation(tripId, currentUser, {
    enableWatch: true,
  });

  React.useEffect(() => {
    if (lastPosition && currentUser) {
      const participantUpdate = {
        ...currentUser,
        lat: lastPosition.lat,
        lng: lastPosition.lng,
        coords: { lat: lastPosition.lat, lng: lastPosition.lng },
        updatedAt: Date.now(),
      };
      joinOrUpdateParticipant(participantUpdate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastPosition, currentUser?.id]);

  if (userLoading) {
    return <div className="flex h-screen w-full items-center justify-center">Authenticating...</div>;
  }
  
  if (!currentUser) {
    // Not authenticated, redirect to login
    router.push('/auth/login');
    return null; // Render nothing while redirecting
  }
  
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
