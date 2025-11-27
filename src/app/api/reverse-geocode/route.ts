import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get('lat'));
  const lng = Number(url.searchParams.get('lng'));
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json({ error: 'lat & lng required' }, { status: 400 });
  }
  const name = `Lat ${lat.toFixed(5)}, Lng ${lng.toFixed(5)}`;
  const display_name = `Location near ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  return NextResponse.json({ name, display_name, address: { road: 'Demo Rd', city: 'Demo City' } });
}
