import Link from 'next/link';
import React from 'react';

export default function HomePage() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Welcome to CivicOS</h1>
      <p>This is the edge routing layer (Next.js) running as a thin presentation host.</p>
      
      <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
        <Link href="/health" style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
          Check Health
        </Link>
        <Link href="/diagnostics" style={{ padding: '0.5rem 1rem', background: '#10b981', color: 'white', borderRadius: '4px', textDecoration: 'none' }}>
          Run Diagnostics
        </Link>
      </div>
    </div>
  );
}
