import React from 'react';

// ---------------------------------------------------------------------------
// AUX-005 (CRIT-TRN-022) — permission-denied content (HTTP 403).
// ---------------------------------------------------------------------------

export interface PermissionDeniedProps {
  requiredPermission?: string;
  description?: string;
}

export function PermissionDenied({
  requiredPermission,
  description = 'Sua conta não possui permissão para acessar este conteúdo. Entre em contato com o administrador do tenant se acredita que isso é um erro.',
}: PermissionDeniedProps) {
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
      <p
        style={{
          fontSize: 'var(--text-4xl)',
          fontWeight: 'var(--font-weight-bold)',
          color: 'var(--text-secondary)',
        }}
      >
        403
      </p>
      <h1
        style={{
          fontSize: 'var(--text-xl)',
          fontWeight: 'var(--font-weight-semibold)',
          color: 'var(--text-primary)',
        }}
      >
        Acesso Negado
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
      {requiredPermission && (
        <code
          style={{
            marginTop: 'var(--space-1)',
            padding: 'var(--space-1) var(--space-2)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-tertiary)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
          }}
        >
          Permissão necessária: {requiredPermission}
        </code>
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
        Voltar para a página inicial
      </a>
    </main>
  );
}