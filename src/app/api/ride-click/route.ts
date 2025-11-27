// src/app/api/ride-click/route.ts
import { NextResponse } from 'next/server';

type RideRecord = {
  id: string;
  provider?: string | null;
  pickup?: any | null;
  drop?: any | null;
  attemptedAppUrl?: string | null;
  attemptedWebUrl?: string | null;
  ua?: string | null;
  timestamp: number;
};

const MAX_STORE = 200;
const STORE: RideRecord[] = [];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ua = req.headers.get('user-agent') || '';
  const record: RideRecord = {
    id: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
    provider: body.provider || null,
    pickup: body.pickup || null,
    drop: body.drop || null,
    attemptedAppUrl: body.attemptedAppUrl || null,
    attemptedWebUrl: body.attemptedWebUrl || null,
    ua,
    timestamp: body.timestamp || Date.now(),
  };

  STORE.push(record);
  if (STORE.length > MAX_STORE) STORE.splice(0, STORE.length - MAX_STORE);

  console.info('[ride-click] stored', JSON.stringify(record));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const last = [...STORE].reverse();
  return NextResponse.json({ ok: true, count: last.length, records: last });
}
