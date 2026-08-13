'use client';

import { useBoot } from '@/app/Providers';
import React from 'react';

export default function DiagnosticsPage() {
  const boot = useBoot();
  const diagnostics = boot?.diagnostics ?? null;

  if (boot?.error) return <div>Kernel failed to load: {boot.error}</div>;
  if (!diagnostics) return <div>Loading Kernel...</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>CivicOS Diagnostics</h1>
      <pre
        style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          borderRadius: '8px',
        }}
      >
        {JSON.stringify(diagnostics, null, 2)}
      </pre>
    </div>
  );
}