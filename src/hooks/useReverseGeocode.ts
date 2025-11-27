'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RGResult = {
  address: string;
  raw?: any;
};

type CacheEntry = {
  value: RGResult;
  ts: number; // epoch ms when cached
};

const CACHE_KEY = 'rg_cache_v1';
const TTL_MS = 1000 * 60 * 5; // 5 minutes cache validity
const ROUND_DECIMALS = 4; // rounding precision (approx ~10m)

function roundCoord(v: number, decimals = ROUND_DECIMALS) {
  const factor = Math.pow(10, decimals);
  return Math.round(v * factor) / factor;
}

function readCacheFromStorage(): Record<string, CacheEntry> {
  try {
    if (typeof window === 'undefined') return {};
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeCacheToStorage(cache: Record<string, CacheEntry>) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    // Ignore storage errors
  }
}

export function useReverseGeocode(lat?: number | null, lng?: number | null) {
  const [result, setResult] = useState<RGResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memoryCacheRef = useRef<Record<string, CacheEntry>>(readCacheFromStorage());
  const inflightRef = useRef<Record<string, Promise<any>>>({});

  const key = useMemo(() => {
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) return null;
    return `${roundCoord(lat)},${roundCoord(lng)}`;
  }, [lat, lng]);

  useEffect(() => {
    if (!key) {
      setResult(null);
      return;
    }

    const now = Date.now();
    const cached = memoryCacheRef.current[key];
    if (cached && now - cached.ts < TTL_MS) {
      setResult(cached.value);
      return;
    }

    if (inflightRef.current[key]) {
      // Don't trigger a new fetch if one is already in progress for this key
      return;
    }
    
    const fetchAddress = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
        if (!res.ok) {
          throw new Error('Failed to fetch address');
        }
        const data = await res.json();
        const entry: CacheEntry = { value: data, ts: Date.now() };

        setResult(data);
        memoryCacheRef.current[key] = entry;
        writeCacheToStorage(memoryCacheRef.current);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
        delete inflightRef.current[key];
      }
    };
    
    inflightRef.current[key] = fetchAddress();

  }, [key, lat, lng]);

  return { address: result?.address ?? null, loading, error };
}
