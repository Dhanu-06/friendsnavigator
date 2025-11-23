'use client';

import { Car } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

type RideSharingProps = {
  destination: { lat: number; lng: number };
};

export function RideSharing({ destination }: RideSharingProps) {
  const uberLink = `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${destination.lat}&dropoff[longitude]=${destination.lng}`;
  const olaLink = `olacabs://book/new?drop_lat=${destination.lat}&drop_lng=${destination.lng}&pickup_lat=&pickup_lng=&category=sedan`;
  const rapidoLink = `rapido://`; // Rapido has less URL scheme documentation

  return (
    <Card>
      <CardHeader className="p-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5" />
          Book a Ride
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 flex flex-col sm:flex-row gap-2">
        <Button asChild variant="outline" className="flex-1">
          <a href={uberLink} target="_blank" rel="noopener noreferrer">
            <img src="https://storage.googleapis.com/website-production-328215.appspot.com/uber_logo.svg" alt="Uber" className="h-4 mr-2" />
            Uber
          </a>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <a href={olaLink} target="_blank" rel="noopener noreferrer">
             <img src="https://storage.googleapis.com/website-production-328215.appspot.com/ola_logo.svg" alt="Ola" className="h-4 mr-2" />
            Ola
          </a>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <a href={rapidoLink} target="_blank" rel="noopener noreferrer">
             <img src="https://storage.googleapis.com/website-production-328215.appspot.com/rapido_logo.svg" alt="Rapido" className="h-5 mr-2" />
            Rapido
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
