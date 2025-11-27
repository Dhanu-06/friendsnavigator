// src/app/api/ride-click/route.ts
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
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

    // log to server console (dev). In prod forward to logging/analytics.
    console.info('[ride-click]', JSON.stringify(record, null, 2));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[ride-click-error]', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
