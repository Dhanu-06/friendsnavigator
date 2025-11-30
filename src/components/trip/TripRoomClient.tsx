
// src/components/trip/TripRoomClient.tsx
"use client";
import React, { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("../TripMap.client"), { ssr: false });

export default function TripRoomClient({ tripId }: { tripId: string }) {

  return (
    <div style={{ padding: 12 }}>
       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2>{`Trip Room - ${tripId}`}</h2>
       </div>

      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: 600 }}>
            <TripMap />
          </div>
        </div>

        <aside style={{ width: 420, borderLeft: "1px solid #eee", paddingLeft: 12, display: "flex", flexDirection: "column", gap: 12 }}>
           <div>
            <h3 style={{ margin: '0 0 8px 0' }}>Participants</h3>
             <div style={{ color: "#666" }}>Participants will show here when available.</div>
           </div>
        </aside>
      </div>
    </div>
  );
}
