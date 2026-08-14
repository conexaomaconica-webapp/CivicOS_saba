import React from 'react';

// ---------------------------------------------------------------------------
// AUX-006 (CRIT-TRN-022) — scheduled-maintenance notice.
// ---------------------------------------------------------------------------

export interface MaintenanceNoticeProps {
  description?: string;
  estimatedReturn?: string;
}

export function MaintenanceNotice({
  description = 'Estamos realizando melhorias na plataforma. Pode levar alguns minutos para concluirmos.',
  estimatedReturn,
}: MaintenanceNoticeProps) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-8) var(--space-4)',
        textAlign: 'center',
        backgroundColor: 'var(--bg-primary)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: 'var(--text-3xl)',
          marginBottom: 'var(--space-1)',
        }}
      >
        🛠️
      </span>
      <h1
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-primary)',
        }}
      >
        Manutenção Programada
      </h1>
      <p
        style={{
          fontSize: 'var(--text-sm)',
          color: 'var(--text-secondary)',
          maxWidth: 480,
        }}
      >
        {description}
      </p>
      {estimatedReturn && (
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Previsão de retorno: {estimatedReturn}
        </p>
      )}
      <a
        href="/"
        style={{
          marginTop: 'var(--space-4)',
          padding: 'var(--space-2) var(--space-4)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--accent)',
          color: 'var(--text-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--text-sm)',
        }}
      >
        Tentar novamente
      </a>
    </main>
  );
}