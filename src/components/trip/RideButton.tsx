'use client';
import React, { useState } from "react";
import openAppOrFallback from "../../utils/openAppOrFallback";
import { buildUberUrl, buildOlaUrl, buildRapidoUrl, buildTransitUrl, type LatLng, type RideLinkResult } from "../../utils/rideLinks";

type Provider = "uber" | "ola" | "rapido" | "transit";

type RideButtonProps = {
  provider: Provider;
  pickup: LatLng;
  dropoff?: LatLng;
  pickupName?: string;
  dropoffName?: string;
  className?: string;
  children?: React.ReactNode;
  ariaLabel?: string;
  /** optional callback (for analytics) */
  onOpen?: (result: RideLinkResult) => void;
};

export const RideButton: React.FC<RideButtonProps> = ({
  provider,
  pickup,
  dropoff,
  pickupName,
  dropoffName,
  className,
  children,
  ariaLabel,
  onOpen,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLinks = (): RideLinkResult => {
    switch (provider) {
      case "uber":
        return buildUberUrl(pickup, dropoff, pickupName, dropoffName);
      case "ola":
        return buildOlaUrl(pickup, dropoff, pickupName, dropoffName);
      case "rapido":
        return buildRapidoUrl(pickup, dropoff, pickupName, dropoffName);
      case "transit":
        // For transit we prefer destination only (dropoff)
        return buildTransitUrl(dropoff ?? pickup, dropoffName);
      default:
        return buildUberUrl(pickup, dropoff, pickupName, dropoffName);
    }
  };

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const links = getLinks();
    logRideClick({
        provider,
        pickup: {lat: pickup.latitude, lng: pickup.longitude, name: pickupName},
        drop: {lat: dropoff?.latitude, lng: dropoff?.longitude, name: dropoffName},
        attemptedAppUrl: links.appUrl,
        attemptedWebUrl: links.webUrl
    })

    try {
      onOpen?.(links);
      await openAppOrFallback({
        appUrl: links.appUrl,
        androidIntentUrl: links.androidIntentUrl,
        fallbackUrl: links.webUrl,
        timeoutMs: 800, // as requested
      });
    } catch (err: any) {
      setError("Could not open the ride app. Opening web fallback.");
      // Open fallback explicitly
      window.open(links.webUrl, "_blank");
    } finally {
      setLoading(false);
    }
  };

  // Friendly label if children isn't provided
  const defaultLabel = (() => {
    switch (provider) {
      case "uber":
        return "Open in Uber";
      case "ola":
        return "Open in Ola";
      case "rapido":
        return "Open in Rapido";
      case "transit":
        return "Open in Maps";
      default:
        return "Open Ride App";
    }
  })();

  return (
    <div className={className}>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        aria-label={ariaLabel ?? defaultLabel}
        className={`px-3 py-2 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          loading ? "opacity-70 cursor-wait" : "hover:brightness-95"
        }`}
      >
        {loading ? "Opening…" : children ?? defaultLabel}
      </button>

      {error && (
        <div role="status" aria-live="polite" className="text-sm mt-1 text-red-600">
          {error}
        </div>
      )}
    </div>
  );
};

async function logRideClick(payload: {
  provider: string;
  pickup?: { lat?: number; lng?: number; name?: string };
  drop?: { lat?: number; lng?: number; name?: string };
  attemptedAppUrl?: string;
  attemptedWebUrl?: string;
}) {
  try {
    fetch('/api/ride-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp: Date.now(),
      }),
    }).catch(() => {});
  } catch (e) {}
}


export default RideButton;
