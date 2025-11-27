import React from 'react';
import { openRideProvider } from './rideLinks';
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
  const label = children || (provider === 'transit' ? 'Transit / Metro' : `Book ${provider.charAt(0).toUpperCase() + provider.slice(1)}`);

  const handleClick = async () => {
    try {
      if (!pickup && provider !== 'transit') {
        alert('Pickup not set');
        return;
      }
      if ((provider === 'transit' || provider === 'uber' || provider === 'ola' || provider === 'rapido') && (!pickup || !drop)) {
        if (provider === 'uber' && pickup) {
        } else {
          alert('Please set a destination first.');
          return;
        }
      }

      let attemptedAppUrl = '';
      let attemptedWebUrl = '';
      try {
        const rl = await import('./rideLinks');
        if (provider === 'uber' && rl.buildUberLinks) {
          const b = rl.buildUberLinks(pickup as any, drop as any);
          attemptedAppUrl = b.appUrl; attemptedWebUrl = b.webUrl;
        } else if (provider === 'ola' && rl.buildOlaLinks) {
          const b = rl.buildOlaLinks(pickup as any, drop as any);
          attemptedAppUrl = b.appUrl; attemptedWebUrl = b.webUrl;
        } else if (provider === 'rapido' && rl.buildRapidoLinks) {
          const b = rl.buildRapidoLinks(pickup as any, drop as any);
          attemptedAppUrl = b.appUrl; attemptedWebUrl = b.webUrl;
        } else if (provider === 'transit' && rl.buildTransitLink) {
          attemptedWebUrl = rl.buildTransitLink(pickup as any, drop as any);
        }
      } catch (e) {}

      try {
        logRideClick({ provider, pickup, drop, attemptedAppUrl, attemptedWebUrl });
      } catch (e) {}

      openRideProvider(provider, pickup, drop);
    } catch (e) {
      console.error('RideButton click error', e);
    }
  };

  return (
    <button onClick={handleClick} className={className} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e6e6e6', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
      {label}
    </button>
  );
}
