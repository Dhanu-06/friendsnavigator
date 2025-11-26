
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ArrowRight, PlusCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser, type LocalUser } from '@/lib/localAuth';
import type { Trip } from '@/lib/tripStore';
import JoinTripPreview from '@/components/trip/JoinTripPreview';
import { getTrip, joinTrip as joinTripAdapter, getRecentTrips } from '@/lib/storeAdapter';

function useLocalUser() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  return { user, loading };
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useLocalUser();
  const [recentTrips, setRecentTrips] = useState<Trip[]>([]);

  useEffect(() => {
    async function loadRecentTrips() {
        const trips = await getRecentTrips();
        setRecentTrips(trips);
    }
    loadRecentTrips();
  }, []);

  const handleJoinSuccess = (tripId: string) => {
    router.push(`/trips/${tripId}`);
  };

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  return (
    <div className="bg-gray-50/50 dark:bg-black/50 min-h-screen">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <h1 className="text-xl font-bold font-heading">Dashboard</h1>
        </div>
      </header>
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold font-heading">
            Welcome back, {user?.name ?? 'Friend'} 👋
          </h2>
          <p className="text-muted-foreground">
            Ready for your next adventure?
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlusCircle className="text-primary" /> Create a New Trip
              </CardTitle>
              <CardDescription>
                Start planning a new journey with your friends.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button asChild>
                <Link href="/trips/create">
                  Create Trip <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
          
          {user && (
            <JoinTripPreview 
              currentUser={user}
              fetchTripByCode={async (code) => {
                const res = await getTrip(code);
                return res.data;
              }}
              joinTrip={async (tripId, user) => {
                await joinTripAdapter(tripId, user);
              }}
              onJoinSuccess={handleJoinSuccess}
            />
          )}

        </div>

        <div>
          <h3 className="text-2xl font-bold font-heading mb-4">
            Recent Trips
          </h3>
          <div className="space-y-4">
            {recentTrips.length > 0 ? (
              recentTrips.map((trip) => (
                <Card key={trip.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">{trip.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {trip.destination.name}
                      </p>
                    </div>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/trips/${trip.id}`}>View</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className='text-center p-8 border-dashed'>
                <p className="text-muted-foreground">You haven't created or joined any trips yet.</p>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
