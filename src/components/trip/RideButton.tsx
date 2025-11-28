// src/components/RideButton.tsx
"use client";

import { useState } from "react";
import { openAppOrFallback } from "@/utils/openAppOrFallback";
import { buildUber, buildOla, buildRapido, buildTransit } from "@/utils/rideLinks";
import type { LatLng } from "@/utils/rideLinks";
import { Button } from "../ui/button";

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

  const getLink = () => {
    switch (provider) {
      case "uber": return buildUber(pickup, drop);
      case "ola": return buildOla(pickup, drop);
      case "rapido": return buildRapido(pickup, drop);
      case "transit": return buildTransit(drop ?? pickup);
    }
  };

  const handleOpen = async () => {
    setLoading(true);
    const links = getLink();
    await openAppOrFallback({
      appUrl: links.appUrl,
      androidIntentUrl: links.androidIntentUrl,
      fallbackUrl: links.fallbackUrl,
    });
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
