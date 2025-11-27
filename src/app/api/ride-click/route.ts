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
  savedToFirestore?: boolean;
};

const MAX_STORE = 200;
const STORE: RideRecord[] = [];

let admin: any = null;
let firestore: any = null;
let adminInitAttempted = false;

function tryInitAdmin() {
  if (adminInitAttempted) return;
  adminInitAttempted = true;
  try {
    admin = require('firebase-admin');
    const saBase64 = process.env.NEXT_FIREBASE_ADMIN_SA || process.env.FIREBASE_ADMIN_SA_BASE64 || '';
    if (!admin.apps.length) {
      if (saBase64) {
        const saJson = Buffer.from(saBase64, 'base64').toString('utf8');
        const serviceAccount = JSON.parse(saJson);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        firestore = admin.firestore();
        console.info('[ride-click] initialized firebase-admin from env');
      } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp();
        firestore = admin.firestore();
        console.info('[ride-click] initialized firebase-admin via ADC (GOOGLE_APPLICATION_CREDENTIALS)');
      } else {
        console.warn('[ride-click] firebase-admin service account not provided; will use in-memory store only');
      }
    } else {
      firestore = admin.firestore();
    }
  } catch (e: any) {
    console.warn('[ride-click] firebase-admin not available or failed to init:', e?.message || e);
    admin = null;
    firestore = null;
  }
}

export async function POST(req: Request) {
  tryInitAdmin();
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
    savedToFirestore: false,
  };

  if (firestore) {
    try {
      await firestore.collection('ride_clicks').doc(record.id).set({
        provider: record.provider,
        pickup: record.pickup,
        drop: record.drop,
        attemptedAppUrl: record.attemptedAppUrl,
        attemptedWebUrl: record.attemptedWebUrl,
        ua: record.ua,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      record.savedToFirestore = true;
      console.info('[ride-click] saved to firestore', record.id);
    } catch (e: any) {
      console.warn('[ride-click] firestore write failed:', e?.message || e);
    }
  }

  STORE.push(record);
  if (STORE.length > MAX_STORE) STORE.splice(0, STORE.length - MAX_STORE);

  console.info('[ride-click] stored', JSON.stringify(record));
  return NextResponse.json({ ok: true, savedToFirestore: record.savedToFirestore });
}

export async function GET() {
  const last = [...STORE].reverse();
  return NextResponse.json({ ok: true, count: last.length, records: last });
}
