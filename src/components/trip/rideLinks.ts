// src/components/trip/rideLinks.ts
// Utilities to open Uber / Ola / Rapido / Transit with deep link + web fallback.

type Coords = { lat: number; lng: number; name?: string };

// Small helper: tries deep link, falls back to web URL after timeout.
// Uses Android intent scheme for Uber if on Android.
function openDeepLinkWithFallback(appUrl: string, webUrl: string, opts?: { useIntentAndroid?: boolean; packageName?: string }) {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // Android Intent fallback (stronger than naive timeout) when requested
  if (isAndroid && opts?.useIntentAndroid && opts?.packageName) {
    try {
      // Create intent URI (opens app if installed or Play Store if not)
      // Format: intent://<path>#Intent;scheme=<scheme>;package=<pkg>;end
      // For simplicity we assume appUrl is like "uber://?action=..." -> we convert scheme & path
      const url = new URL(appUrl);
      const scheme = url.protocol.replace(':', '');
      const hostAndPath = appUrl.replace(`${scheme}://`, '');
      const intentUri = `intent://${hostAndPath}#Intent;scheme=${scheme};package=${opts.packageName};end`;
      window.location.href = intentUri;
      // fallback to web after 1.2s
      setTimeout(() => { window.location.href = webUrl; }, 1200);
      return;
    } catch (e) {
      // continue to default behavior
    }
  }

  // Generic attempt: set location then fallback
  const start = Date.now();
  // Attempt to open app
  window.location.href = appUrl;

  // After a short timeout, if still here, open web fallback
  setTimeout(() => {
    if (Date.now() - start < 2500) {
      // still on page -> open fallback
      window.location.href = webUrl;
    }
  }, 1200);
}

// ----- Provider builders -----

export function buildUberLinks(pickup?: Coords, drop?: Coords) {
  // app deep link
  const app = new URL('uber://?action=setPickup');
  if (pickup) {
    app.searchParams.set('pickup[latitude]', String(pickup.lat));
    app.searchParams.set('pickup[longitude]', String(pickup.lng));
    if (pickup.name) app.searchParams.set('pickup[nickname]', pickup.name);
  } else {
    app.searchParams.set('pickup', 'my_location');
  }
  if (drop) {
    app.searchParams.set('dropoff[latitude]', String(drop.lat));
    app.searchParams.set('dropoff[longitude]', String(drop.lng));
    if (drop.name) app.searchParams.set('dropoff[formatted_address]', drop.name);
  }

  // web fallback
  const web = new URL('https://m.uber.com/ul/');
  web.searchParams.set('action', 'setPickup');
  if (pickup) {
    web.searchParams.set('pickup[latitude]', String(pickup.lat));
    web.searchParams.set('pickup[longitude]', String(pickup.lng));
    if (pickup.name) web.searchParams.set('pickup[nickname]', pickup.name);
  } else {
    web.searchParams.set('pickup', 'my_location');
  }
  if (drop) {
    web.searchParams.set('dropoff[latitude]', String(drop.lat));
    web.searchParams.set('dropoff[longitude]', String(drop.lng));
    if (drop.name) web.searchParams.set('dropoff[formatted_address]', drop.name);
  }

  return {
    appUrl: app.toString(),
    webUrl: web.toString(),
    // Uber Android package (used for intent fallback)
    packageName: 'com.ubercab',
    scheme: 'uber',
  };
}

export function buildOlaLinks(pickup?: Coords, drop?: Coords) {
  // Ola web-first approach (web reliably opens on desktop/mobile and often prompts app)
  const web = new URL('https://book.olacabs.com/');
  if (pickup) {
    web.searchParams.set('lat', String(pickup.lat));
    web.searchParams.set('lng', String(pickup.lng));
    if (pickup.name) web.searchParams.set('pickup', pickup.name);
  }
  if (drop) {
    web.searchParams.set('drop_lat', String(drop.lat));
    web.searchParams.set('drop_lng', String(drop.lng));
    if (drop.name) web.searchParams.set('drop', drop.name);
  }

  // Ola app scheme — varies by version; we provide a common attempt
  const app = new URL('olacabs://book/?');
  if (pickup) {
    app.searchParams.set('pickup_lat', String(pickup.lat));
    app.searchParams.set('pickup_lng', String(pickup.lng));
    if (pickup.name) app.searchParams.set('pickup', pickup.name);
  }
  if (drop) {
    app.searchParams.set('drop_lat', String(drop.lat));
    app.searchParams.set('drop_lng', String(drop.lng));
    if (drop.name) app.searchParams.set('drop', drop.name);
  }

  return {
    appUrl: app.toString(),
    webUrl: web.toString(),
    packageName: 'com.olacabs.customer', // best-effort
    scheme: 'olacabs',
  };
}

export function buildRapidoLinks(pickup?: Coords, drop?: Coords) {
  // Rapido has limited public deep link docs; use web booking or app attempt
  const web = new URL('https://www.rapido.bike/');
  // Rapido web may not support lat/lng query params publicly; we include basic params
  if (pickup) {
    web.searchParams.set('pickup_lat', String(pickup.lat));
    web.searchParams.set('pickup_lng', String(pickup.lng));
  }
  if (drop) {
    web.searchParams.set('drop_lat', String(drop.lat));
    web.searchParams.set('drop_lng', String(drop.lng));
  }

  const app = new URL('rapidobike://open');
  if (pickup) app.searchParams.set('pickup_lat', String(pickup.lat));
  if (pickup) app.searchParams.set('pickup_lng', String(pickup.lng));
  if (drop) app.searchParams.set('drop_lat', String(drop.lat));
  if (drop) app.searchParams.set('drop_lng', String(drop.lng));

  return {
    appUrl: app.toString(),
    webUrl: web.toString(),
    packageName: 'com.rapido.customer',
    scheme: 'rapidobike',
  };
}

export function buildTransitLink(origin: Coords, destination: Coords) {
  // Use Google Maps transit directions (reliable cross-platform web fallback)
  const u = new URL('https://www.google.com/maps/dir/');
  u.searchParams.set('api', '1');
  u.searchParams.set('travelmode', 'transit');
  u.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  u.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  return u.toString();
}

// High-level open helper
export function openRideProvider(provider: 'uber' | 'ola' | 'rapido' | 'transit', pickup?: Coords, drop?: Coords) {
  if (provider === 'uber') {
    const { appUrl, webUrl, packageName } = buildUberLinks(pickup, drop);
    // use intent fallback on Android for Uber
    openDeepLinkWithFallback(appUrl, webUrl, { useIntentAndroid: true, packageName });
  } else if (provider === 'ola') {
    const { appUrl, webUrl, packageName } = buildOlaLinks(pickup, drop);
    openDeepLinkWithFallback(appUrl, webUrl, { useIntentAndroid: true, packageName });
  } else if (provider === 'rapido') {
    const { appUrl, webUrl, packageName } = buildRapidoLinks(pickup, drop);
    openDeepLinkWithFallback(appUrl, webUrl, { useIntentAndroid: true, packageName });
  } else if (provider === 'transit') {
    if (!pickup || !drop) return;
    window.open(buildTransitLink(pickup, drop), '_blank');
  }
}
