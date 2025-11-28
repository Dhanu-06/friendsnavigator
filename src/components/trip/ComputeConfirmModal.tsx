'use client';

import React, { useEffect, useRef, useState } from 'react';

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
  // Local mount state to allow exit animation before unmounting
  const [mounted, setMounted] = useState<boolean>(open);
  const [visible, setVisible] = useState<boolean>(open);
  const confirmRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Respect user "reduced motion" preference
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    try {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const handler = () => setPrefersReducedMotion(mq.matches);
      mq.addEventListener ? mq.addEventListener('change', handler) : mq.addListener(handler);
      return () => {
        mq.removeEventListener ? mq.removeEventListener('change', handler) : mq.removeListener(handler);
      };
    } catch {
      // fail quietly
    }
  }, []);

  // manage mount/visibility to allow exit animation
  useEffect(() => {
    if (open) {
      setMounted(true);
      // short tick so CSS transitions apply
      requestAnimationFrame(() => {
        setVisible(true);
      });
    } else {
      // trigger exit animation, then unmount
      setVisible(false);
      const t = setTimeout(() => setMounted(false), prefersReducedMotion ? 0 : 220);
      return () => clearTimeout(t);
    }
  }, [open, prefersReducedMotion]);

  // focus primary button when opened
  useEffect(() => {
    if (open && mounted) {
      const t = setTimeout(() => {
        confirmRef.current?.focus();
      }, prefersReducedMotion ? 0 : 160);
      return () => clearTimeout(t);
    }
  }, [open, mounted, prefersReducedMotion]);

  if (!mounted) return null;

  // styles
  const backdropStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 120,
    background: visible ? 'rgba(0,0,0,0.36)' : 'rgba(0,0,0,0)',
    transition: prefersReducedMotion ? undefined : 'background 200ms ease',
    padding: 16,
    pointerEvents: visible ? 'auto' : 'none',
  };

  const panelBase: React.CSSProperties = {
    width: 'min(720px, 94%)',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 12px 48px rgba(2,6,23,0.28)',
    padding: 18,
    maxWidth: 720,
    transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.995)',
    opacity: visible ? 1 : 0,
    transition: prefersReducedMotion
      ? undefined
      : 'opacity 220ms cubic-bezier(.2,.8,.2,1), transform 220ms cubic-bezier(.2,.8,.2,1)',
    willChange: 'transform, opacity',
  };

  // trap focus simply by returning focus to confirm on click outside (lightweight)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      // close on backdrop click — treat as cancel
      onCancel();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="compute-confirm-title"
      style={backdropStyle}
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={dialogRef}
        style={panelBase}
        onMouseDown={(e) => {
          // prevent backdrop click from firing when interacting inside
          e.stopPropagation();
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
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
              ref={confirmRef}
              onClick={onConfirm}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                background: 'linear-gradient(90deg,#0ea5e9,#0369a1)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 700,
                boxShadow: '0 6px 20px rgba(3,105,161,0.12)',
              }}
            >
              Enable (I understand)
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12, fontSize: 12, color: '#666' }}>
          <strong>Tip:</strong> You can disable live polling any time from the toggle. Enabling will cause periodic network
          requests to update ETAs and may use the configured TomTom routing/matrix quotas.
        </div>
      </div>
    </div>
  );
}
