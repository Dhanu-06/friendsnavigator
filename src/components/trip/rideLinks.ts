// src/components/trip/rideLinks.ts
// Robust deep-link + Android Intent fallback builder for Uber / Ola / Rapido / Transit

type Coords = { lat: number; lng: number; name?: string };

function isAndroid(ua = navigator.userAgent) {
  return /Android/i.test(ua);
}
function isIOS(ua = navigator.userAgent) {
  return /iPhone|iPad|iPod/i.test(ua);
}

/**
 * tryOpenAndFallback
 * - On Android with intentUri: sets location to intentUri (which triggers Play Store fallback if not installed).
 * - On other platforms: attempts to open appUrl then falls back to webUrl after timeout.
 * - Uses visibilitychange to infer whether user left the page (app opened) and avoid opening fallback when not needed.
 */
function tryOpenAndFallback(appUrl: string, webUrl: string, intentUri?: string) {
  const ua = navigator.userAgent || '';
  const onAndroid = isAndroid(ua);

  // If we have a platform-specific intentUri and Android, use it for best fallback behavior
  if (onAndroid && intentUri) {
    // Setting location to intent: URI either opens app or Play Store
    window.location.href = intentUri;
    // Still set a fallback to web after a short delay in case something blocks intent
    setTimeout(() => {
      window.location.href = webUrl;
    }, 1400);
    return;
  }

  // Otherwise fallback to the generic approach using visibilitychange + timeout
  let hidden = false;
  const handleVisibility = () => {
    hidden = document.hidden;
  };
  document.addEventListener('visibilitychange', handleVisibility);

  const start = Date.now();
  // Attempt to open app via appUrl
  try {
    // On iOS Safari, setting location may be blocked unless triggered by user gesture
    window.location.href = appUrl;
  } catch (e) {
    // ignore
  }

  // Wait 1.2s; if page still visible, open web fallback
  setTimeout(() => {
    document.removeEventListener('visibilitychange', handleVisibility);
    // If page still visible (user didn't leave to another app), open web fallback
    if (!hidden && Date.now() - start < 3000) {
      window.location.href = webUrl;
    }
  }, 1200);
}

/* ---------------------------
   Provider link builders
   --------------------------- */

export function buildUberLinks(pickup?: Coords, drop?: Coords) {
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

  // Build Android intent URI for Uber
  // Convert appUrl into intent format: intent://<path>#Intent;scheme=uber;package=com.ubercab;end
  const appStr = app.toString();
  let intentUri = '';
  try {
    const parsed = new URL(appStr);
    const scheme = parsed.protocol.replace(':', '');
    const rest = appStr.replace(`${scheme}://`, '');
    intentUri = `intent://${rest}#Intent;scheme=${scheme};package=com.ubercab;end`;
  } catch (e) {
    intentUri = '';
  }

  return {
    appUrl: app.toString(),
    webUrl: web.toString(),
    intentUri,
    packageName: 'com.ubercab',
  };
}

export function buildOlaLinks(pickup?: Coords, drop?: Coords) {
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

  const app = new URL('olacabs://book/');
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

  let intentUri = '';
  try {
    const appStr = app.toString();
    const parsed = new URL(appStr);
    const scheme = parsed.protocol.replace(':', '');
    const rest = appStr.replace(`${scheme}://`, '');
    intentUri = `intent://${rest}#Intent;scheme=${scheme};package=com.olacabs.customer;end`;
  } catch (e) {
    intentUri = '';
  }

  return {
    appUrl: app.toString(),
    webUrl: web.toString(),
    intentUri,
    packageName: 'com.olacabs.customer',
  };
}

export function buildRapidoLinks(pickup?: Coords, drop?: Coords) {
  const web = new URL('https://www.rapido.bike/');
  if (pickup) {
    web.searchParams.set('pickup_lat', String(pickup.lat));
    web.searchParams.set('pickup_lng', String(pickup.lng));
  }
  if (drop) {
    web.searchParams.set('drop_lat', String(drop.lat));
    web.searchParams.set('drop_lng', String(drop.lng));
  }

  const app = new URL('rapido://ride');
  if (pickup) app.searchParams.set('pickup_lat', String(pickup.lat));
  if (pickup) app.searchParams.set('pickup_lng', String(pickup.lng));
  if (drop) app.searchParams.set('drop_lat', String(drop.lat));
  if (drop) app.searchParams.set('drop_lng', String(drop.lng));

  let intentUri = '';
  try {
    const appStr = app.toString();
    const parsed = new URL(appStr);
    const scheme = parsed.protocol.replace(':', '');
    const rest = appStr.replace(`${scheme}://`, '');
    intentUri = `intent://${rest}#Intent;scheme=${scheme};package=com.rapido.passenger;end`;
  } catch (e) {
    intentUri = '';
  }

  return {
    appUrl: app.toString(),
    webUrl: web.toString(),
    intentUri,
    packageName: 'com.rapido.passenger',
  };
}

export function buildTransitLink(origin: Coords, destination: Coords) {
  const u = new URL('https://www.google.com/maps/dir/');
  u.searchParams.set('api', '1');
  u.searchParams.set('travelmode', 'transit');
  u.searchParams.set('origin', `${origin.lat},${origin.lng}`);
  u.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  return u.toString();
}

export function openRideProvider(provider: 'uber' | 'ola' | 'rapido' | 'transit', pickup?: Coords, drop?: Coords) {
  if (provider === 'uber') {
    const { appUrl, webUrl, intentUri } = buildUberLinks(pickup, drop);
    tryOpenAndFallback(appUrl, webUrl, intentUri);
  } else if (provider === 'ola') {
    const { appUrl, webUrl, intentUri } = buildOlaLinks(pickup, drop);
    tryOpenAndFallback(appUrl, webUrl, intentUri);
  } else if (provider === 'rapido') {
    const { appUrl, webUrl, intentUri } = buildRapidoLinks(pickup, drop);
    tryOpenAndFallback(appUrl, webUrl, intentUri);
  } else if (provider === 'transit') {
    if (!pickup || !drop) return;
    window.open(buildTransitLink(pickup, drop), '_blank');
  }
}
