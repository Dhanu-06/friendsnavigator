// src/components/RideButton.tsx
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { openRideProvider } from "@/components/trip/rideLinks";
import { logRideClick } from "@/components/trip/rideTelemetry";
import type { LatLng } from "@/utils/rideLinks";

type Provider = "uber" | "ola" | "rapido" | "transit";

export default function RideButton({
  provider,
  pickup,
  drop,
  label,
}: {
  provider: Provider;
  pickup: LatLng;
  drop?: LatLng;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleOpen = async () => {
    setLoading(true);
    const pu = { lat: pickup.latitude, lng: pickup.longitude };
    const dr = drop ? { lat: drop.latitude, lng: drop.longitude } : undefined;
    logRideClick({ provider, pickup: pu, drop: dr });
    openRideProvider(provider, pu, dr);
    setLoading(false);
  };

  return (
    <Button
      onClick={handleOpen}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? "Opening…" : label ?? "Open"}
    </Button>
  );
}
