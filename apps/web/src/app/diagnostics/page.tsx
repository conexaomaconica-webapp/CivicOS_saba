'use client';

import { useKernelSafe } from '@saas/app-sdk';
import React, { useEffect, useState } from 'react';

export default function DiagnosticsPage() {
  const { kernel, isLoading, error } = useKernelSafe();
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [errorFetching, setErrorFetching] = useState<any>(null);

  useEffect(() => {
    if (kernel) {
      kernel.diagnostics()
        .then(res => setDiagnostics(res))
        .catch(err => setErrorFetching(err));
    }
  }, [kernel]);

  if (isLoading) return <div>Loading Kernel...</div>;
  if (error) return <div>Kernel failed to load: {String(error)}</div>;
  if (errorFetching) return <div>Error fetching diagnostics: {String(errorFetching)}</div>;
  if (!diagnostics) return <div>Checking diagnostics...</div>;

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
