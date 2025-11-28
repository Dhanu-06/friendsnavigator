'use client';

import React, { useEffect, useState } from 'react';
import ComputeConfirmModal from './ComputeConfirmModal';

const KEY = 'trip_compute_routes_enabled_v1';
const CONFIRMED_KEY = 'trip_compute_routes_confirmed_v1';

export default function ComputeToggle({
  value,
  onChange,
  className,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const [local, setLocal] = useState<boolean>(value);
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && window.localStorage.getItem(CONFIRMED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, local ? '1' : '0');
    } catch {}
  }, [local]);

  // handle user interaction: when attempting to turn ON, show modal unless already confirmed
  const handleToggle = () => {
    const next = !local;
    if (next) {
      // turning ON
      if (confirmed) {
        setLocal(true);
        onChange(true);
        try {
          window.localStorage.setItem(KEY, '1');
        } catch {}
      } else {
        // show modal to confirm
        setModalOpen(true);
      }
    } else {
      // turning OFF: just do it
      setLocal(false);
      onChange(false);
      try {
        window.localStorage.setItem(KEY, '0');
      } catch {}
    }
  };

  const handleConfirm = () => {
    try {
      window.localStorage.setItem(CONFIRMED_KEY, '1');
    } catch {}
    setConfirmed(true);
    setModalOpen(false);
    setLocal(true);
    onChange(true);
    try {
      window.localStorage.setItem(KEY, '1');
    } catch {}
  };

  const handleCancel = () => {
    setModalOpen(false);
    // Keep local unchanged (remains off)
    setLocal(false);
    onChange(false);
    try {
      window.localStorage.setItem(KEY, '0');
    } catch {}
  };

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Live ETA & Route</div>
        <div style={{ fontSize: 12, color: '#666' }}>Toggle real-time ETA polling and route drawing</div>
      </div>

      <div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        {/* Switch */}
        <button
          onClick={handleToggle}
          aria-pressed={local}
          aria-label="Toggle live ETA and route polling"
          style={{
            width: 50,
            height: 30,
            borderRadius: 18,
            padding: 4,
            border: '1px solid rgba(0,0,0,0.08)',
            background: local ? 'linear-gradient(90deg,#0ea5e9,#0369a1)' : '#f2f4f7',
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: local ? '0 4px 10px rgba(3,105,161,0.12)' : 'none',
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 12,
              background: '#fff',
              transform: local ? 'translateX(20px)' : 'translateX(0)',
              transition: 'transform 160ms cubic-bezier(.4,0,.2,1)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
            }}
          />
        </button>

        {/* State label */}
        <div style={{ fontSize: 13, minWidth: 36, fontWeight: 600 }}>{local ? 'On' : 'Off'}</div>

        {/* Tooltip */}
        <div style={{ position: 'relative' }}>
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.7 }}
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="#e2e8f0" />
            <path d="M11 10h2v6h-2zM11 7h2v2h-2z" fill="#94a3b8" />
          </svg>

          {hover && (
            <div
              role="tooltip"
              style={{
                position: 'absolute',
                right: '110%',
                top: '50%',
                transform: 'translateY(-50%)',
                width: 260,
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.08)',
                boxShadow: '0 6px 18px rgba(2,6,23,0.08)',
                padding: 10,
                borderRadius: 8,
                fontSize: 12,
                color: '#222',
                zIndex: 80,
                textAlign: 'left',
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>What this does</div>
              <div style={{ lineHeight: 1.35 }}>
                When enabled, the map will poll for participant ETAs (every 5s) and draw the route between pickup and destination.
                Disabling saves network calls and reduces API usage.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation modal (first-time enable) */}
      <ComputeConfirmModal
        open={modalOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        title="Enable Live ETA & Route"
      >
        <div>
          Enabling live ETA polling will cause the app to call routing/ETA APIs periodically (every ~5 seconds) to
          compute participant ETAs and draw the route. This uses TomTom routing/matrix quota and network bandwidth. Do
          you want to enable it?
        </div>
      </ComputeConfirmModal>
    </div>
  );
}
