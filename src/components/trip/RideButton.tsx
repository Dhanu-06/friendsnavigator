// src/components/trip/RideButton.tsx
import React from 'react';
import { openRideProvider } from './rideLinks';
import { Button } from '@/components/ui/button';
import { Car, TramFront } from 'lucide-react';
import { logRideClick } from './rideTelemetry';

type Coords = { lat: number; lng: number; name?: string };

export default function RideButton({
  provider,
  pickup,
  drop,
  className,
  children,
}: {
  provider: 'uber' | 'ola' | 'rapido' | 'transit';
  pickup?: Coords;
  drop?: Coords;
  className?: string;
  children?: React.ReactNode;
}) {
  const label = children || (provider === 'transit' ? 'Transit' : `Book ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);

  const handleClick = async () => {
    // simple guard
    if (!pickup && provider !== 'transit') {
      alert('Pickup not set');
      return;
    }
    if ((provider === 'transit' || provider === 'uber' || provider === 'ola' || provider === 'rapido') && (!pickup || !drop)) {
      // For transit and normal rides, we prefer both pickup and drop
      // But we still let Uber handle pickup-only when drop is missing.
      if (provider === 'uber' && pickup) {
        // allow to proceed
      } else {
        alert('Please set a destination first.');
        return;
      }
    }

    // Build the attempted URLs so we can log them
    let attemptedAppUrl = '';
    let attemptedWebUrl = '';
    try {
      const rideLinks = await import('./rideLinks');
      if (provider === 'uber') {
        const { appUrl, webUrl } = rideLinks.buildUberLinks(pickup, drop);
        attemptedAppUrl = appUrl;
        attemptedWebUrl = webUrl;
      } else if (provider === 'ola') {
        const { appUrl, webUrl } = rideLinks.buildOlaLinks(pickup, drop);
        attemptedAppUrl = appUrl;
        attemptedWebUrl = webUrl;
      } else if (provider === 'rapido') {
        const { appUrl, webUrl } = rideLinks.buildRapidoLinks(pickup, drop);
        attemptedAppUrl = appUrl;
        attemptedWebUrl = webUrl;
      } else if (provider === 'transit' && pickup && drop) {
        attemptedWebUrl = rideLinks.buildTransitLink(pickup, drop);
      }
    } catch (e) {
      // ignore import error
    }

    // Log telemetry (fire-and-forget)
    logRideClick({
      provider,
      pickup,
      drop,
      attemptedAppUrl,
      attemptedWebUrl,
    });

    // proceed to open provider (existing behavior)
    openRideProvider(provider, pickup, drop);
  };

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      size="sm"
      className={className}
    >
      {provider === 'transit' ? <TramFront className="mr-2 h-4 w-4" /> : <Car className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}
