import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const ua = req.headers.get('user-agent') || '';
  const record = {
    provider: body.provider || null,
    pickup: body.pickup || null,
    drop: body.drop || null,
    attemptedAppUrl: body.attemptedAppUrl || null,
    attemptedWebUrl: body.attemptedWebUrl || null,
    ua,
    timestamp: body.timestamp || Date.now(),
  };

  console.info('[ride-click]', JSON.stringify(record));
  return NextResponse.json({ ok: true });
}
