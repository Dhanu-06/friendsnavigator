'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type RGResult = {
  name: string;
  shortName?: string;
  raw?: any;
};

type CacheEntry = {
  value: RGResult;
  ts: number;
};

const CACHE_KEY = 'rg_cache_v1';
const TTL_MS = 1000 * 60 * 5;
const ROUND_DECIMALS = 5;

export function roundCoord(v: number, decimals = ROUND_DECIMALS) {
  const factor = Math.pow(10, decimals);
  return Math.round(v * factor) / factor;
}

function readCacheFromStorage(): Record<string, CacheEntry> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}

function writeCacheToStorage(cache: Record<string, CacheEntry>) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {}
}

export default function useReverseGeocode(lat?: number | null, lng?: number | null) {
  const [result, setResult] = useState<RGResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memoryCacheRef = useRef<Record<string, CacheEntry>>(readCacheFromStorage());
  const inflightRef = useRef<Record<string, Promise<CacheEntry> | null>>({});

  const key = useMemo(() => {
    if (lat == null || lng == null) return null;
    const rlat = roundCoord(lat);
    const rlng = roundCoord(lng);
    return `${rlat},${rlng}`;
  }, [lat, lng]);

  useEffect(() => {
    if (!key) {
      setResult(null);
      setLoading(false);
      setError(null);
      return;
    }

    const mem = memoryCacheRef.current[key];
    const now = Date.now();
    if (mem && now - mem.ts < TTL_MS) {
      setResult(mem.value);
      setLoading(false);
      setError(null);
      return;
    }

    const storageCache = readCacheFromStorage();
    if (storageCache[key] && now - storageCache[key].ts < TTL_MS) {
      memoryCacheRef.current[key] = storageCache[key];
      setResult(storageCache[key].value);
      setLoading(false);
      setError(null);
      return;
    }

    if (inflightRef.current[key]) {
      setLoading(true);
      (inflightRef.current[key] as Promise<CacheEntry>)
        .then((entry) => {
          setResult(entry.value);
          setLoading(false);
        })
        .catch((e) => {
          setError((e && e.message) || 'Reverse geocode failed');
          setLoading(false);
        });
      return;
    }

    setLoading(true);
    setError(null);

    const p = (async (): Promise<CacheEntry> => {
      try {
        const res = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat!)}&lng=${encodeURIComponent(lng!)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => null);
          throw new Error(txt || `HTTP ${res.status}`);
        }

        const json = await res.json().catch(() => null);

        let name = 'Unknown location';
        if (!json) {
          name = `${roundCoord(lat!)}, ${roundCoord(lng!)}`;
        } else if (typeof json === 'string') {
          name = json;
        } else if (json.name) {
          name = json.name;
        } else if (json.display_name) {
          name = json.display_name;
        } else if (json.address && typeof json.address === 'object') {
          const a = json.address;
          name = (a.road || a.suburb || a.neighbourhood || a.city || a.town || a.village || a.state || '').trim();
          if (!name) name = json.display_name || `${roundCoord(lat!)}, ${roundCoord(lng!)}`;
        } else {
          name = json.display_name || `${roundCoord(lat!)}, ${roundCoord(lng!)}`;
        }

        const shortName = name.split(',')[0];
        const entry: CacheEntry = { value: { name, shortName, raw: json }, ts: Date.now() };
        memoryCacheRef.current[key] = entry;
        const st = readCacheFromStorage();
        st[key] = entry;
        writeCacheToStorage(st);

        return entry;
      } catch (e: any) {
        throw e;
      }
    })();

    inflightRef.current[key] = p;
    p.then((entry) => {
      setResult(entry.value);
      setLoading(false);
    })
      .catch((e) => {
        setError((e && e.message) || 'Reverse geocode failed');
        setLoading(false);
      })
      .finally(() => {
        inflightRef.current[key] = null;
      });

  }, [key, lat, lng]);

  return { name: result?.name ?? null, shortName: result?.shortName ?? null, loading, error };
}
