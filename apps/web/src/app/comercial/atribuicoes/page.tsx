import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { listAttributionIssuesAction, listAttributionsAction } from '@/lib/commercial/attributions-service';
import { listRepresentativesAction } from '@/lib/commercial/representatives-service';
import AttributionsClient from './attributions-client';

export const dynamic = 'force-dynamic';

export default async function CommercialAttributionsPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'attributions.manage')) notFound();

  const [attributions, issues, representatives] = await Promise.all([
    listAttributionsAction(),
    listAttributionIssuesAction(),
    staffCan(ctx, 'representatives.read') ? listRepresentativesAction() : Promise.resolve({ success: true as const, data: [] }),
  ]);

  return (
    <AttributionsClient
      items={attributions.success ? (attributions.data ?? []) : []}
      loadError={attributions.success ? null : attributions.error}
      issues={issues.success ? (issues.data ?? []) : []}
      issueLoadError={issues.success ? null : issues.error}
      representatives={(representatives.success ? (representatives.data ?? []) : [])
        .filter((r) => r.status === 'active')
        .map((r) => ({ id: r.id, name: r.trade_name || r.legal_name }))}
    />
  );
}
