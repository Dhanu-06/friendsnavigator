// src/components/trip/RideButton.tsx
import React from 'react';
import { openRideProvider } from './rideLinks';
import { Button } from '@/components/ui/button';
import { Car, TramFront } from 'lucide-react';

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

  const handleClick = () => {
    // simple guard
    if (!pickup && provider !== 'transit') {
      alert('Pickup not set');
      return;
    }
    if ((provider === 'transit' || provider === 'uber' || provider === 'ola' || provider === 'rapido') && (!pickup || !drop)) {
      // For transit and normal rides, we prefer both pickup and drop
      // But we still let Uber handle pickup-only when drop is missing.
      if (provider === 'uber' && pickup) {
        openRideProvider(provider, pickup, drop);
        return;
      }
      alert('Please set a destination first.');
      return;
    }

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
