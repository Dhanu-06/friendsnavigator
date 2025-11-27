import { NextResponse } from 'next/server';
import { getFirebaseInstances } from '@/lib/firebaseClient';
import { collection, addDoc } from 'firebase/firestore';

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

  // Log to server console for immediate debugging
  console.info('[ride-click]', JSON.stringify(record));

  // Persist to Firestore for dashboard viewing
  try {
    const { firestore } = getFirebaseInstances();
    if (firestore) {
      const logsCollection = collection(firestore, 'ride-clicks');
      await addDoc(logsCollection, record);
    }
  } catch (e) {
    console.error('Failed to save ride-click log to Firestore:', e);
    // Still return OK to the client, as logging failure should not block the user.
  }

  return NextResponse.json({ ok: true });
}
