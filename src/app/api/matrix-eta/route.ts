import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { participants, destination } = body;

    if (!participants || !Array.isArray(participants) || !destination) {
      return NextResponse.json({ error: 'missing participants or destination' }, { status: 400 });
    }

    const key = process.env.TOMTOM_KEY || process.env.NEXT_PUBLIC_TOMTOM_KEY;
    if (!key) {
      return NextResponse.json({ error: 'TOMTOM_KEY not set on server' }, { status: 500 });
    }
    
    if (participants.length === 0) {
      return NextResponse.json({ etas: {} });
    }

    const origins = participants.map(p => `${p.lng},${p.lat}`).join(':');
    const dest = `${destination.lng},${destination.lat}`;

    const tomtomUrl = `https://api.tomtom.com/routing/1/matrix/json?key=${key}&routeType=fastest&travelMode=car`;
    
    const matrixBody = {
      origins: participants.map(p => ({ point: { latitude: p.lat, longitude: p.lng }})),
      destinations: [{ point: { latitude: destination.lat, longitude: destination.lng }}]
    };

    const r = await fetch(tomtomUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(matrixBody)
    });

    if (!r.ok) {
        const text = await r.text();
        return NextResponse.json({ error: 'TomTom matrix failed', details: text }, { status: 502 });
    }

    const data = await r.json();
    const etas: Record<string, { etaSeconds: number; distanceMeters: number }> = {};

    if (data.matrix && data.matrix.length > 0) {
      data.matrix.forEach((row: any, index: number) => {
        const participantId = participants[index].id;
        const routeSummary = row[0].response.routeSummary;
        etas[participantId] = {
          etaSeconds: routeSummary.travelTimeInSeconds,
          distanceMeters: routeSummary.lengthInMeters
        };
      });
    }

    return NextResponse.json({ etas });
  } catch (err: any) {
    console.error('Matrix handler exception:', err);
    return NextResponse.json({ error: err?.message ?? 'unknown error' }, { status: 500 });
  }
}
