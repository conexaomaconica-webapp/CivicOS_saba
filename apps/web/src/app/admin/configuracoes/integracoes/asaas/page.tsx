import React from 'react';
import type { Metadata } from 'next';
import { getAdminAsaasIntegrationOverviewAction } from '@/lib/payment/asaas-config-service';
import { AsaasIntegrationClient } from './asaas-integration-client';

export const metadata: Metadata = {
  title: 'Integração Asaas (Sandbox & Produção) · Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminAsaasIntegrationPage() {
  const result = await getAdminAsaasIntegrationOverviewAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3">
          <h2 className="text-lg font-bold">Erro ao carregar configurações do Asaas</h2>
          <p className="text-sm text-rose-800">{result.error || 'Acesso não autorizado.'}</p>
        </div>
      </div>
    );
  }

  return <AsaasIntegrationClient initialOverview={result.data} />;
}
