'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/firebase';
import type { Trip } from '@/lib/types';
import { CreateTripDialog } from './create-trip-dialog';
import { TripList } from './trip-list';

const DUMMY_TRIPS: Trip[] = [
    {
      id: 'FIzR2fiP2UtwPQ2GNXVb',
      name: 'Team Outing to Koramangala',
      destination: { name: 'Koramangala Social', lat: 12.9352, lng: 77.6245 },
      description: "Let's finally meet up!",
      ownerId: 'user1',
      participantIds: ['user1', 'user2', 'user3'],
      tripType: 'within-city',
    },
    {
      id: 'trip2',
      name: 'Weekend Getaway',
      destination: { name: 'Nandi Hills', lat: 13.3702, lng: 77.6835 },
      description: 'A much needed break.',
      ownerId: 'user1',
      participantIds: ['user1', 'user2'],
      tripType: 'out-of-city',
    }
];


export function Dashboard() {
  const { user } = useUser();
  const [isCreateTripOpen, setCreateTripOpen] = React.useState(false);

  // Use dummy data and simulate loading state
  const [trips, setTrips] = React.useState<Trip[]>([]);
  const [areTripsLoading, setAreTripsLoading] = React.useState(true);

  React.useEffect(() => {
    setAreTripsLoading(true);
    const timer = setTimeout(() => {
      setTrips(DUMMY_TRIPS);
      setAreTripsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);


  return (
    <>
      <div className="container mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Your Trips</h1>
          <Button onClick={() => setCreateTripOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Trip
          </Button>
        </div>
        
        <TripList trips={trips} isLoading={areTripsLoading} />
      </div>
      <CreateTripDialog isOpen={isCreateTripOpen} onOpenChange={setCreateTripOpen} />
    </>
  );
}
