'use client';

import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Trip } from '@/lib/types';
import { ArrowRight, MapPin } from 'lucide-react';

type TripListProps = {
  trips: Trip[];
  isLoading: boolean;
};

export function TripList({ trips, isLoading }: TripListProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardFooter>
              <Skeleton className="h-10 w-28" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="text-center py-16 border-2 border-dashed rounded-lg">
        <h2 className="text-xl font-semibold">No Trips Yet!</h2>
        <p className="text-muted-foreground mt-2">
          Click "Create Trip" to start your first adventure.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {trips.map(trip => (
        <Card key={trip.id} className="flex flex-col">
          <CardHeader className="flex-1">
            <CardTitle>{trip.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 pt-1">
              <MapPin className="h-4 w-4" />
              {trip.destination}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/trips/${trip.id}`}>
                Open Trip <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
