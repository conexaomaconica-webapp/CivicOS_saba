'use client';

import { useKernelSafe } from '@saas/app-sdk';
import React, { useEffect, useState } from 'react';

export default function HealthPage() {
  const { kernel, isLoading, error } = useKernelSafe();
  const [health, setHealth] = useState<unknown>(null);
  const [errorFetching, setErrorFetching] = useState<unknown>(null);

  useEffect(() => {
    if (kernel) {
      kernel.diagnostics().then(setHealth).catch(setErrorFetching);
    }
  }, [kernel]);

  if (isLoading) return <div>Loading Kernel...</div>;
  if (error) return <div>Kernel failed to load: {String(error)}</div>;
  if (errorFetching) return <div>Error fetching health: {JSON.stringify(errorFetching)}</div>;
  if (!health) return <div>Checking health...</div>;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>CivicOS Health Status</h1>
      <pre
        style={{
          background: '#1e1e1e',
          color: '#d4d4d4',
          padding: '1rem',
          borderRadius: '8px',
        }}
      >
        {JSON.stringify(health, null, 2)}
      </pre>
    </div>
  );
}
