// app/api/matrix-eta/route.ts
import { NextResponse } from "next/server";

/**
 * Matrix ETA endpoint with in-memory caching.
 * - Cache key: normalized origins + destination (coords rounded)
 * - TTL: 6000 ms (configurable)
 *
 * ENV: NEXT_TOMTOM_KEY must be set (server-side).
 */

type Origin = { id: string; lat: number; lng: number };
type Destination = { lat: number; lng: number };

const CACHE_TTL_MS = 6000; // 6 seconds - adjust as needed

type CacheEntry = {
  ts: number;
  payload: any;
};

const cache = new Map<string, CacheEntry>();

function roundCoord(v: number) {
  return Math.round(v * 1e5) / 1e5; // 5 decimal places ~ ~1m precision
}

function makeCacheKey(origins: Origin[], destination: Destination) {
  const okey = origins
    .map((o) => `${o.id}:${roundCoord(o.lat)},${roundCoord(o.lng)}`)
    .sort() // Sort to ensure same origins in different order produce same key
    .join("|");
  const dkey = `${roundCoord(destination.lat)},${roundCoord(destination.lng)}`;
  return `${okey}->${dkey}`;
}

async function tryMatrixAPI(origins: Origin[], destination: Destination, key: string) {
  const originsParam = origins.map((o) => `${o.lat},${o.lng}`).join("|");
  const destParam = `${destination.lat},${destination.lng}`;

  const url = `https://api.tomtom.com/routing/1/matrix?key=${encodeURIComponent(
    key
  )}&origins=${encodeURIComponent(originsParam)}&destinations=${encodeURIComponent(
    destParam
  )}&metrics=travelTimeInSeconds,distanceInMeters&resolve=none`;

  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Matrix API failure: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data;
}

async function fallbackRouting(origins: Origin[], destination: Destination, key: string) {
  const results: { id: string; etaSeconds: number | null; distanceMeters: number | null }[] = [];
  for (const o of origins) {
    const start = `${o.lat},${o.lng}`;
    const end = `${destination.lat},${destination.lng}`;
    const url = `https://api.tomtom.com/routing/1/calculateRoute/${start}:${end}/json?key=${encodeURIComponent(
      key
    )}&routeType=fastest&traffic=true&computeTravelTimeFor=all`;
    try {
      const r = await fetch(url);
      if (!r.ok) {
        results.push({ id: o.id, etaSeconds: null, distanceMeters: null });
        continue;
      }
      const j = await r.json();
      const route = j.routes?.[0];
      const eta = route?.summary?.travelTimeInSeconds ?? null;
      const dist = route?.summary?.lengthInMeters ?? null;
      results.push({ id: o.id, etaSeconds: eta, distanceMeters: dist });
    } catch (e) {
      results.push({ id: o.id, etaSeconds: null, distanceMeters: null });
    }
  }
  return { results, raw: { fallback: true } };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const origins: Origin[] = body.origins || [];
    const destination: Destination = body.destination;

    if (!Array.isArray(origins) || origins.length === 0) {
      return NextResponse.json({ results: [] });
    }
    if (!destination || typeof destination.lat !== "number") {
      return NextResponse.json({ error: "destination required" }, { status: 400 });
    }

    const key = process.env.NEXT_TOMTOM_KEY || process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!key) return NextResponse.json({ error: "TomTom key not configured (NEXT_TOMTOM_KEY)" }, { status: 500 });

    const cacheKey = makeCacheKey(origins, destination);
    const now = Date.now();

    // Serve from cache if fresh
    const c = cache.get(cacheKey);
    if (c && now - c.ts < CACHE_TTL_MS) {
      return NextResponse.json(c.payload);
    }

    // Miss -> fetch from TomTom (Matrix) and cache result
    try {
      const matrixResp = await tryMatrixAPI(origins, destination, key);

      const results: { id: string; etaSeconds: number | null; distanceMeters: number | null }[] = [];

      if (matrixResp && matrixResp.matrix && (matrixResp.matrix.travelTimeInSeconds || matrixResp.matrix.travelTimes)) {
        const travelTimes = matrixResp.matrix.travelTimeInSeconds || matrixResp.matrix.travelTimes || [];
        const distances = matrixResp.matrix.distanceInMeters || matrixResp.matrix.distances || [];
        for (let i = 0; i < origins.length; i++) {
          const tRow = travelTimes[i];
          const dRow = distances[i];
          const eta = Array.isArray(tRow) ? (tRow[0] ?? null) : tRow ?? null;
          const dist = Array.isArray(dRow) ? (dRow[0] ?? null) : dRow ?? null;
          results.push({ id: origins[i].id, etaSeconds: eta, distanceMeters: dist });
        }
        const payload = { results, raw: matrixResp };
        cache.set(cacheKey, { ts: now, payload });
        return NextResponse.json(payload);
      }

      if (matrixResp && matrixResp.matrix && Array.isArray(matrixResp.matrix)) {
        for (let i = 0; i < origins.length; i++) {
          const entry = matrixResp.matrix[i];
          const eta = entry?.travelTimeInSeconds ?? null;
          const dist = entry?.distanceInMeters ?? null;
          results.push({ id: origins[i].id, etaSeconds: eta, distanceMeters: dist });
        }
        const payload = { results, raw: matrixResp };
        cache.set(cacheKey, { ts: now, payload });
        return NextResponse.json(payload);

      }

      // Unknown structure -> fallback to per-origin routing (server-side) and cache
      const fallback = await fallbackRouting(origins, destination, key);
      cache.set(cacheKey, { ts: now, payload: fallback });
      return NextResponse.json(fallback);
    } catch (matrixErr) {
      // Matrix failed; fallback to per-origin routing and cache that result
      const fallback = await fallbackRouting(origins, destination, key);
      cache.set(cacheKey, { ts: now, payload: fallback });
      return NextResponse.json(fallback);
    }
  } catch (e) {
    console.error("matrix-eta handler error", e);
    return NextResponse.json({ error: "server error", detail: String(e) }, { status: 500 });
  }
}
