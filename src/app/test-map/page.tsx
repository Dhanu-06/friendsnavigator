import dynamic from "next/dynamic";
import React from "react";

// dynamic import to ensure this only runs on client
const TripMap = dynamic(()=> import("../../components/TripMap.client"), { ssr: false });

export default function TestMapPage() {
  return (
    <div style={{ padding: 20 }}>
      <h2>TomTom Test Map</h2>
      <p>If you see a map with a marker below, the TomTom SDK is loading correctly.</p>
      <div style={{ height: "600px", border: "1px solid #ddd", marginTop: '1rem' }}>
        <TripMap />
      </div>
    </div>
  );
}
