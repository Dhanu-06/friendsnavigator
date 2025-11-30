
// src/app/api/route/route.ts
import { NextResponse } from 'next/server';

const TOMTOM_KEY = process.env.NEXT_PUBLIC_TOMTOM_KEY || process.env.TOMTOM_KEY || '';

function buildTomtomUrl(origin: { lat: number; lng: number }, destination: { lat: number; lng: number }, opts: any = {}) {
  const base = 'https://api.tomtom.com/routing/1/calculateRoute';
  const loc = `${origin.lat},${origin.lng}:${destination.lat},${destination.lng}`;
  const url = new URL(`${base}/${loc}/json`);
  if (TOMTOM_KEY) url.searchParams.set('key', TOMTOM_KEY);
  url.searchParams.set('travelMode', opts.travelMode || 'car');
  url.searchParams.set('routeType', opts.routeType || 'fastest');
  url.searchParams.set('routeRepresentation', 'summaryOnly');
  return url.toString();
}

function normalizeTomTomGeometry(resp: any) {
  try {
    if (!resp) return null;
    if (resp.routes && resp.routes[0]) {
      const r = resp.routes[0];
      if (r.geoJson && r.geoJson.type === 'Feature' && r.geoJson.geometry && r.geoJson.geometry.type === 'LineString' && Array.isArray(r.geoJson.geometry.coordinates)) {
        return { coordinates: r.geoJson.geometry.coordinates };
      }
      if (r.geoJson && r.geoJson.type === 'LineString' && Array.isArray(r.geoJson.coordinates)) {
        return { coordinates: r.geoJson.coordinates };
      }
    }

    if (resp.routes && Array.isArray(resp.routes) && resp.routes[0].legs) {
      const coords: Array<[number, number]> = [];
      for (const leg of resp.routes[0].legs) {
        if (Array.isArray(leg.points)) {
          leg.points.forEach((p: any) => {
            if (p.latitude != null && p.longitude != null) coords.push([p.longitude, p.latitude]);
            else if (p.lat != null && p.lon != null) coords.push([p.lon, p.lat]);
          });
        } else if (Array.isArray(leg.coordinates)) {
          leg.coordinates.forEach((c: any) => {
            if (Array.isArray(c) && c.length >= 2) {
              const [a, b] = c;
              if (Math.abs(a) <= 180 && Math.abs(b) <= 90) coords.push([a, b]);
              else coords.push([b, a]);
            }
          });
        }
      }
      if (coords.length > 0) return { coordinates: coords };
    }

    if (resp.routes && resp.routes[0].shape && Array.isArray(resp.routes[0].shape)) {
      const coords: Array<[number, number]> = [];
      resp.routes[0].shape.forEach((s: any) => {
        if (typeof s === 'string') {
          const [latStr, lonStr] = s.split(',');
          const lat = Number(latStr);
          const lon = Number(lonStr);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) coords.push([lon, lat]);
        } else if (Array.isArray(s) && s.length >= 2) {
          const lat = Number(s[0]);
          const lon = Number(s[1]);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) coords.push([lon, lat]);
        }
      });
      if (coords.length > 0) return { coordinates: coords };
    }

    if (resp.geoJson && resp.geoJson.type === 'FeatureCollection' && Array.isArray(resp.geoJson.features)) {
      for (const f of resp.geoJson.features) {
        if (f.geometry && f.geometry.type === 'LineString' && Array.isArray(f.geometry.coordinates)) {
          return { coordinates: f.geometry.coordinates };
        }
      }
    }

    const coords: Array<[number, number]> = [];
    function findPoints(obj: any) {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(findPoints);
        return;
      }
      const keys = Object.keys(obj);
      if (keys.includes('latitude') && keys.includes('longitude')) {
        coords.push([Number(obj.longitude), Number(obj.latitude)]);
      } else {
        keys.forEach((k) => findPoints(obj[k]));
      }
    }
    findPoints(resp);
    if (coords.length > 0) return { coordinates: coords };
  } catch (e) {}
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const origin = body.origin;
    const destination = body.destination;
    const options = body.options || {};

    if (!origin || !destination || isNaN(Number(origin.lat)) || isNaN(Number(origin.lng)) || isNaN(Number(destination.lat)) || isNaN(Number(destination.lng))) {
      return NextResponse.json({ error: 'origin and destination required { lat, lng }' }, { status: 400 });
    }

     if (!TOMTOM_KEY) {
      console.error("[api/route] TOMTOM_KEY is not configured.");
      return NextResponse.json({ error: "Routing service is not configured on the server." }, { status: 500 });
    }

    const url = buildTomtomUrl({ lat: Number(origin.lat), lng: Number(origin.lng) }, { lat: Number(destination.lat), lng: Number(destination.lng) }, options);
    const r = await fetch(url);

    if (!r.ok) {
      const txt = await r.text().catch(() => 'Failed to read error body');
      console.error(`[api/route] TomTom API error: ${r.status}`, txt);
      return NextResponse.json({ error: 'TomTom routing API error', status: r.status, body: txt }, { status: 502 });
    }

    const json = await r.json();
    const normalized = normalizeTomTomGeometry(json);

    let distanceMeters = null;
    let travelTimeSeconds = null;
    try {
      if (json.routes && json.routes[0] && json.routes[0].summary) {
        distanceMeters = json.routes[0].summary.lengthInMeters ?? json.routes[0].summary.length ?? null;
        travelTimeSeconds = json.routes[0].summary.travelTimeInSeconds ?? json.routes[0].summary.travelTime ?? null;
      } else if (json.summary) {
        distanceMeters = json.summary.lengthInMeters ?? json.summary.length ?? null;
        travelTimeSeconds = json.summary.travelTimeInSeconds ?? json.summary.travelTime ?? null;
      }
    } catch (e) {}

    if (!normalized) {
      return NextResponse.json({ ok: true, geojson: null, summary: { distanceMeters, travelTimeSeconds }, raw: json });
    }

    const geojson = { type: 'LineString', coordinates: normalized.coordinates };
    return NextResponse.json({ ok: true, geojson, summary: { distanceMeters, travelTimeSeconds }});
  } catch (e: any) {
    console.error("[api/route] General Error:", e);
    return NextResponse.json({ error: 'Server error processing route request', message: e?.message || String(e) }, { status: 500 });
  }
}
