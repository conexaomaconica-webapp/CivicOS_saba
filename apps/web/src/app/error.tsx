'use client';

import React from 'react';
import { EmptyState } from '@/components/aux/EmptyState';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-8) var(--space-4)',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <p
        style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--text-secondary)',
          marginBottom: 'var(--space-2)',
        }}
      >
        500
      </p>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <EmptyState
          title="Algo deu errado"
          description="Não foi possível concluir a operação. Tente novamente em instantes — se o problema persistir, contate o suporte."
          icon="!"
          actionLabel="Tentar novamente"
          onAction={() => reset()}
        />
      </div>
    </main>
  );
}