// src/app/api/route/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const origin = url.searchParams.get("origin"); // "lng,lat"
    const destination = url.searchParams.get("destination"); // "lng,lat"
    if (!origin || !destination) {
      return NextResponse.json({ error: "missing origin or destination" }, { status: 400 });
    }

    const key = process.env.TOMTOM_KEY || process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!key) {
      return NextResponse.json({ error: "TOMTOM_KEY not set on server" }, { status: 500 });
    }

    const tomtomUrl = `https://api.tomtom.com/routing/1/calculateRoute/${encodeURIComponent(origin)}:${encodeURIComponent(destination)}/json?key=${key}&routeType=fastest&traffic=true`;

    const r = await fetch(tomtomUrl);
    const text = await r.text();
    if (!r.ok) {
      return NextResponse.json({ error: "TomTom routing failed", details: text }, { status: 502 });
    }
    
    const data = JSON.parse(text);
    
    let geojson = null;
    let summary = null;

    if (data.routes && data.routes[0]) {
        const route = data.routes[0];
        if(route.legs && route.legs[0] && route.legs[0].points) {
             geojson = {
                type: 'LineString',
                coordinates: route.legs[0].points.map((p: {latitude: number, longitude: number}) => [p.longitude, p.latitude])
            };
        }
        if(route.summary) {
            summary = {
                travelTimeSeconds: route.summary.travelTimeInSeconds,
                distanceMeters: route.summary.lengthInMeters,
            }
        }
    }
    
    return NextResponse.json({ ok: true, geojson, summary, raw: data });
  } catch (err: any) {
    console.error("Route handler exception:", err);
    return NextResponse.json({ error: err?.message ?? "unknown error" }, { status: 500 });
  }
}
