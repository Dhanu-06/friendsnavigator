// src/utils/rideLinks.ts
// Builders return { appUrl?, androidIntentUrl?, webUrl } to be passed into openAppOrFallback

export type LatLng = { latitude: number; longitude: number };
export type RideLinkResult = {
  appUrl?: string; // app-scheme or universal link
  androidIntentUrl?: string; // Android intent: URL (optional)
  webUrl: string; // fallback https URL
};

/**
 * Encode lat/lng for query usage
 */
const enc = (v: string) => encodeURIComponent(v);

/**
 * Uber:
 * - App (scheme): uber://?action=setPickup&pickup[latitude]=...&pickup[longitude]=...&dropoff[latitude]=......
 * - Universal link (web): https://m.uber.com/ul/?action=setPickup&pickup[latitude]=... (works on iOS/Android)
 * - Android intent fallback (optional): intent://...;package=com.ubercab;end (we can construct a common intent)
 */
export function buildUberUrl(
  pickup: LatLng,
  dropoff?: LatLng,
  pickupName?: string,
  dropoffName?: string
): RideLinkResult {
  const pickupLat = pickup.latitude;
  const pickupLng = pickup.longitude;
  const pickupLabel = pickupName ? `&pickup[nickname]=${enc(pickupName)}` : "";

  let dropoffParams = "";
  let dropoffLabel = "";
  if (dropoff) {
    dropoffParams = `&dropoff[latitude]=${dropoff.latitude}&dropoff[longitude]=${dropoff.longitude}`;
    dropoffLabel = dropoffName ? `&dropoff[nickname]=${enc(dropoffName)}` : "";
  }

  const appUrl = `uber://?action=setPickup&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}${pickupLabel}${dropoffParams}${dropoffLabel}`;
  const webUrl = `https://m.uber.com/ul/?action=setPickup&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}${pickupLabel}${dropoffParams}${dropoffLabel}`;

  // Android intent format for Uber (helps Chrome on Android)
  const androidIntentUrl = `intent://ul/?action=setPickup&pickup[latitude]=${pickupLat}&pickup[longitude]=${pickupLng}${pickupLabel}${dropoffParams}${dropoffLabel}#Intent;package=com.ubercab;scheme=uber;end`;

  return { appUrl, androidIntentUrl, webUrl };
}

/**
 * Ola:
 * - Ola app docs are not public in one spec; common schemes: ola://?lat=..&lng=.. OR olacabs://
 * - Web fallback: https://book.olacabs.com/?pickup=lat,lng
 */
export function buildOlaUrl(
  pickup: LatLng,
  dropoff?: LatLng,
  pickupName?: string,
  dropoffName?: string
): RideLinkResult {
  const p = `${pickup.latitude},${pickup.longitude}`;
  const d = dropoff ? `${dropoff.latitude},${dropoff.longitude}` : undefined;
  const appUrl = d
    ? `olacabs://?pickup=${enc(p)}&drop=${enc(d)}${pickupName ? `&pickup_name=${enc(pickupName)}` : ""}${dropoffName ? `&drop_name=${enc(dropoffName)}` : ""}`
    : `olacabs://?pickup=${enc(p)}${pickupName ? `&pickup_name=${enc(pickupName)}` : ""}`;

  const webUrl = d
    ? `https://book.olacabs.com/?pickup=${enc(p)}&drop=${enc(d)}`
    : `https://book.olacabs.com/?pickup=${enc(p)}`;

  // Android intent (best-effort)
  const androidIntentUrl = `intent://book/?pickup=${enc(p)}${d ? `&drop=${enc(d)}` : ""}#Intent;package=com.olacabs.customer;scheme=olacabs;end`;

  return { appUrl, androidIntentUrl, webUrl };
}

/**
 * Rapido:
 * - App scheme: rapido://book?pickup=lat,lng&drop=lat,lng
 * - Fallback web: https://www.rapido.bike/book?pickup=lat,lng&drop=lat,lng
 */
export function buildRapidoUrl(
  pickup: LatLng,
  dropoff?: LatLng,
  pickupName?: string,
  dropoffName?: string
): RideLinkResult {
  const p = `${pickup.latitude},${pickup.longitude}`;
  const d = dropoff ? `${dropoff.latitude},${dropoff.longitude}` : undefined;

  const appUrl = d
    ? `rapidocabs://book?pickup=${enc(p)}&drop=${enc(d)}${pickupName ? `&pickup_name=${enc(pickupName)}` : ""}${dropoffName ? `&drop_name=${enc(dropoffName)}` : ""}`
    : `rapidocabs://book?pickup=${enc(p)}${pickupName ? `&pickup_name=${enc(pickupName)}` : ""}`;

  const webUrl = d
    ? `https://www.rapido.bike/book?pickup=${enc(p)}&drop=${enc(d)}`
    : `https://www.rapido.bike/book?pickup=${enc(p)}`;

  const androidIntentUrl = `intent://book/?pickup=${enc(p)}${d ? `&drop=${enc(d)}` : ""}#Intent;package=com.rapido.consumer;scheme=rapidocabs;end`;

  return { appUrl, androidIntentUrl, webUrl };
}

/**
 * Transit (Directions):
 * We provide Google Maps / Apple Maps / geo: alternatives:
 * - Google Maps app scheme: comgooglemaps://?daddr=lat,lng
 * - Google Maps web: https://www.google.com/maps/dir/?api=1&destination=lat,long
 * - Apple Maps web / app: http://maps.apple.com/?daddr=lat,long
 */
export function buildTransitUrl(destination: LatLng, label?: string): RideLinkResult {
  const d = `${destination.latitude},${destination.longitude}`;
  const googleApp = `comgooglemaps://?daddr=${enc(d)}${label ? `&directionsmode=driving&daddr_label=${enc(label)}` : ""}`;
  const appleMaps = `http://maps.apple.com/?daddr=${enc(d)}${label ? `&q=${enc(label)}` : ""}`;
  const googleWeb = `https://www.google.com/maps/dir/?api=1&destination=${enc(d)}${label ? `&destination_place_id=${enc(label)}` : ""}`;

  // For transit we prefer opening google maps app (if installed), else apple maps web will redirect on iOS
  return { appUrl: googleApp, androidIntentUrl: `intent://maps.google.com/maps?daddr=${enc(d)}#Intent;package=com.google.android.apps.maps;end`, webUrl: googleWeb || appleMaps };
}
