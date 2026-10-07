import React from 'react';
import { notFound } from 'next/navigation';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import { getBootData } from '@/runtime/server-kernel';

export const metadata = {
  title: 'Diagnóstico do kernel',
  robots: { index: false, follow: false },
};

// Depende da sessão do usuário: nunca pode ser estática nem cacheada.
export const dynamic = 'force-dynamic';

/**
 * Diagnóstico interno do kernel (versão, linha do tempo de boot). Em produção só administradores de plataforma
 * enxergam esta tela; qualquer outra pessoa recebe 404, como se a rota não existisse. Em desenvolvimento fica aberta.
 */
export default async function DiagnosticsPage() {
  if (process.env.NODE_ENV === 'production') {
    try {
      await assertPlatformAdminAccess();
    } catch {
      notFound();
    }
  }

  const boot = await getBootData();
  if (boot.error) return <div style={{ padding: '2rem' }}>Kernel failed to load: {boot.error}</div>;

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
        {JSON.stringify(boot.diagnostics, null, 2)}
      </pre>
    </div>
  );
}
