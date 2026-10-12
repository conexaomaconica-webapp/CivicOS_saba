import React from 'react';
import type { Metadata } from 'next';
import { getAdminEmailIntegrationOverviewAction } from '@/lib/email/email-config-service';
import { EmailIntegrationClient } from './email-integration-client';

export const metadata: Metadata = {
  title: 'Integração E-mail (Hostinger Mail API) · Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminEmailIntegrationPage() {
  const result = await getAdminEmailIntegrationOverviewAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3">
          <h2 className="text-lg font-bold">Erro ao carregar configurações de e-mail</h2>
          <p className="text-sm text-rose-800">{result.error || 'Acesso não autorizado ou sessão expirada.'}</p>
        </div>
      </div>
    );
  }

  return <EmailIntegrationClient initialOverview={result.data} />;
}
