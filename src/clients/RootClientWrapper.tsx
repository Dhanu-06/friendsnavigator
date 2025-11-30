"use client";
import React, { useEffect } from "react";

export default function RootClientWrapper({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handler = (ev: PromiseRejectionEvent) => {
      console.error("Unhandled Promise Rejection detected:", ev.reason);
      try {
        console.info("Stringified reason:", JSON.stringify(ev.reason, null, 2));
      } catch (e) {
        console.info("Could not stringify reason", e);
      }
    };
    window.addEventListener("unhandledrejection", handler as EventListener);
    return () => window.removeEventListener("unhandledrejection", handler as EventListener);
  }, []);
  return <>{children}</>;
}
