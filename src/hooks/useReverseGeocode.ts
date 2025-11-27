// src/hooks/useReverseGeocode.ts
'use client';

import { useState, useEffect } from 'react';
import { reverseGeocodeClient } from '@/lib/reverseGeocode';

// Simple in-memory cache to avoid repeated requests for the same location
const addressCache = new Map<string, string>();

/**
 * A hook to reverse geocode coordinates into a human-readable address.
 * It includes an in-memory cache to prevent redundant API calls.
 * @param lat - The latitude of the location.
 * @param lng - The longitude of the location.
 * @returns The address string or null if not yet resolved or an error occurred.
 */
export function useReverseGeocode(lat?: number | null, lng?: number | null) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      setAddress(null);
      return;
    }

    // Use a rounded key to cache nearby locations as the same address
    const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    if (addressCache.has(cacheKey)) {
      setAddress(addressCache.get(cacheKey)!);
      return;
    }

    let isCancelled = false;

    async function fetchAddress() {
      const addr = await reverseGeocodeClient(lat!, lng!);
      if (!isCancelled) {
        if (addr) {
          addressCache.set(cacheKey, addr);
        }
        setAddress(addr);
      }
    }

    fetchAddress();

    return () => {
      isCancelled = true;
    };
  }, [lat, lng]);

  return address;
}
