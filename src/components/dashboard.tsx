'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import type { Trip } from '@/lib/types';
import { CreateTripDialog } from './create-trip-dialog';
import { TripList } from './trip-list';

export function Dashboard() {
  const { user } = useUser();
  const firestore = useFirestore();

  const tripsQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, 'trips'),
      where('participantIds', 'array-contains', user.uid)
    );
  }, [user, firestore]);

  const { data: trips, isLoading: areTripsLoading } = useCollection<Trip>(tripsQuery);
  const [isCreateTripOpen, setCreateTripOpen] = React.useState(false);

  return (
    <>
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Trips</h1>
          <Button onClick={() => setCreateTripOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Trip
          </Button>
        </div>
        
        <TripList trips={trips || []} isLoading={areTripsLoading} />
      </div>
      <CreateTripDialog isOpen={isCreateTripOpen} onOpenChange={setCreateTripOpen} />
    </>
  );
}
