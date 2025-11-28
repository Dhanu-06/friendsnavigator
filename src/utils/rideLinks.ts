// src/utils/rideLinks.ts

export type LatLng = { latitude: number; longitude: number };

export const buildUber = (pickup: LatLng, drop?: LatLng) => {
  const pu = `${pickup.latitude},${pickup.longitude}`;
  const dr = drop ? `${drop.latitude},${drop.longitude}` : "";
  const dropPart = drop ? `&d_lat=${drop.latitude}&d_lng=${drop.longitude}` : "";

  return {
    appUrl: `uber://?action=setPickup&pickup=${pu}${dr ? `&dropoff=${dr}` : ""}`,
    androidIntentUrl: `intent://uber.com?pickup=${pu}${dr ? `&dropoff=${dr}` : ""}#Intent;scheme=uber;package=com.ubercab;end`,
    fallbackUrl: `https://m.uber.com/ul/?action=setPickup&pickup=${pu}${dr ? `&dropoff=${dr}` : ""}`,
  };
};

export const buildOla = (pickup: LatLng, drop?: LatLng) => {
  const pu = `${pickup.latitude},${pickup.longitude}`;
  const dr = drop ? `${drop.latitude},${drop.longitude}` : "";
  const dropPart = drop ? `&d_lat=${drop.latitude}&d_lng=${drop.longitude}` : "";

  return {
    appUrl: `olacabs://?lat=${pickup.latitude}&lng=${pickup.longitude}${dropPart}`,
    androidIntentUrl: `intent://ola.com?pickup=${pu}${dr ? `&drop=${dr}` : ""}#Intent;scheme=olacabs;package=com.olacabs.customer;end`,
    fallbackUrl: `https://book.olacabs.com/?pickup=${pu}${dr ? `&drop=${dr}` : ""}`,
  };
};

export const buildRapido = (pickup: LatLng, drop?: LatLng) => {
  const pu = `${pickup.latitude},${pickup.longitude}`;
  const dr = drop ? `${drop.latitude},${drop.longitude}` : "";

  return {
    appUrl: `rapidocabs://book?pickup=${pu}${dr ? `&drop=${dr}` : ""}`,
    androidIntentUrl: `intent://rapido?pickup=${pu}${dr ? `&drop=${dr}` : ""}#Intent;scheme=rapidocabs;package=com.rapido.consumer;end`,
    fallbackUrl: `https://www.rapido.bike/book?pickup=${pu}${dr ? `&drop=${dr}` : ""}`,
  };
};

export const buildTransit = (dest: LatLng) => {
  const d = `${dest.latitude},${dest.longitude}`;
  return {
    appUrl: `comgooglemaps://?daddr=${d}`,
    androidIntentUrl: `intent://maps.google.com/maps?daddr=${d}#Intent;package=com.google.android.apps.maps;end`,
    fallbackUrl: `https://www.google.com/maps/dir/?api=1&destination=${d}`,
  };
};
