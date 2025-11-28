'use client';

import React from 'react';
import JoinTripPreview from '@/components/trip/JoinTripPreview';
import { fetchTripByCode } from '@/lib/tripStore';
import { joinTrip } from '@/lib/storeAdapter';
import { useUser } from '@/firebase/auth/use-user';
import { useRouter } from 'next/navigation';

export default function JoinTripPage() {
  const { user } = useUser();
  const router = useRouter();

  const currentUser = user
    ? { uid: user.uid, name: user.displayName || user.email || 'Anonymous', email: user.email || '' }
    : { uid: 'local_guest', name: 'Guest', email: '' };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl">
        <JoinTripPreview
          fetchTripByCode={fetchTripByCode}
          joinTrip={async (tripId, u) => { await joinTrip(tripId, { id: u.id, name: u.name, avatarUrl: u.avatarUrl || '' }); }}
          onJoinSuccess={(tripId) => router.push(`/trips/${tripId}`)}
          currentUser={currentUser}
        />
      </div>
    </div>
  );
}
