'use client';

import React from 'react';

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <main
          role="alert"
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-3)',
            padding: 'var(--space-8) var(--space-4)',
            textAlign: 'center',
            backgroundColor: 'var(--bg-primary)',
          }}
        >
          <p
            style={{
              fontSize: 'var(--text-4xl)',
              fontWeight: 'var(--font-weight-bold)',
              color: 'var(--text-secondary)',
            }}
          >
            500
          </p>
          <h1
            style={{
              fontSize: 'var(--text-xl)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-primary)',
            }}
          >
            Erro inesperado
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Ocorreu um erro ao renderizar esta página.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 'var(--space-2)',
              padding: 'var(--space-2) var(--space-4)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--text-sm)',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}