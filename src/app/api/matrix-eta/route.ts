
import { NextResponse } from 'next/server';

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const participants = Array.isArray(body.participants) ? body.participants : [];

    if (!participants || participants.length === 0) {
      return NextResponse.json({ etas: {} });
    }

    const dest = body.destination ?? { lat: 12.9716, lng: 77.5946 };
    const speedMetersPerSec = 13.89; // Roughly 50 km/h

    const etas: Record<string, { etaSeconds: number; distanceMeters: number }> = {};

    participants.forEach((p: any) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return;

      const dist = Math.round(haversineDistance(lat, lng, dest.lat, dest.lng));
      const etaSeconds = Math.round(dist / speedMetersPerSec);
      etas[p.id] = { etaSeconds, distanceMeters: dist };
    });

    return NextResponse.json({ etas });
  } catch (err: any) {
    console.error('[api/matrix-eta] Error:', err);
    return NextResponse.json(
        { error: 'Failed to compute ETAs', details: err.message },
        { status: 500 }
    );
  }
}
