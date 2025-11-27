// src/components/trip/rideTelemetry.ts
export async function logRideClick(payload: {
  provider: string;
  pickup?: { lat?: number; lng?: number; name?: string };
  drop?: { lat?: number; lng?: number; name?: string };
  attemptedAppUrl?: string;
  attemptedWebUrl?: string;
}) {
  try {
    // fire-and-forget; don't block UI. Call but ignore result.
    fetch('/api/ride-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        timestamp: Date.now(),
      }),
    }).catch(() => { /* ignore */ });
  } catch (e) {
    // swallow any errors
  }
}
