'use client';

import { useParams } from 'next/navigation';
import { getCurrentUser, type LocalUser } from '@/lib/localAuth';
import TripRoomClient from '@/components/trip/TripRoomClient';

export default function TripPage() {
  const params = useParams();
  const tripId = Array.isArray(params.tripId) ? params.tripId[0] : params.tripId;
  const currentUser = getCurrentUser();

  if (!currentUser) {
    // Or a redirect to login
    return <div className="flex h-screen items-center justify-center">You must be logged in to view a trip.</div>;
  }

  // We are creating a simplified user object to pass to the client component.
  // In a real app, you might fetch a full user profile.
  const user = {
      id: currentUser.uid,
      name: currentUser.name,
      avatar: `https://i.pravatar.cc/150?u=${currentUser.uid}`
  };

  return <TripRoomClient tripId={tripId} currentUser={user} />;
}
