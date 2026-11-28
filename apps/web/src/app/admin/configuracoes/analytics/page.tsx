import React from 'react';
import type { Metadata } from 'next';
import { getAdminAnalyticsViewsPolicyOverviewAction } from '@/lib/analytics/views-policy-service';
import { AnalyticsPolicyClient } from './analytics-policy-client';

export const metadata: Metadata = {
  title: 'Analytics e Visualizações · Configurações Admin | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPolicyPage() {
  const result = await getAdminAnalyticsViewsPolicyOverviewAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="p-6 rounded-3xl bg-rose-50 border border-rose-200 text-rose-950 space-y-3">
          <h2 className="text-lg font-bold">Acesso restrito às configurações de Analytics</h2>
          <p className="text-sm text-rose-800">{result.error || 'Acesso não autorizado.'}</p>
        </div>
      </div>
    );
  }

  return <AnalyticsPolicyClient initialOverview={result.data} />;
}

