'use client';

import React from 'react';

export default function ComputeConfirmModal({
  open,
  onConfirm,
  onCancel,
  title = 'Enable Live ETA & Route',
  children,
}: {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  children?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compute-confirm-title"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
        background: 'rgba(0,0,0,0.36)',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(720px, 94%)',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 12px 48px rgba(2,6,23,0.28)',
          padding: 18,
          maxWidth: 720,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <h3 id="compute-confirm-title" style={{ margin: 0, fontSize: 18 }}>
              {title}
            </h3>
            <div style={{ marginTop: 8, color: '#444', fontSize: 13, lineHeight: 1.4 }}>{children}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'start', gap: 8 }}>
            <button
              onClick={onCancel}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: '#fff',
                border: '1px solid #e6e6e6',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'linear-gradient(90deg,#0ea5e9,#0369a1)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              Enable (I understand)
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          <strong>Tip:</strong> You can disable live polling any time from the toggle. Enabling will cause periodic network requests to update ETAs and may use the configured TomTom routing/matrix quotas.
        </div>
      </div>
    </div>
  );
}
