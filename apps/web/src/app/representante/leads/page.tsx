import React from 'react';
import { notFound } from 'next/navigation';
import { getRepresentativeContext } from '@/lib/commercial/commercial-auth';
import { representativeScopeAllows } from '@/lib/commercial/access-rules';
import { listMyLeadsAction } from '@/lib/commercial/leads-service';
import MyLeadsClient from './my-leads-client';

export const dynamic = 'force-dynamic';

export default async function RepresentativeLeadsPage() {
  const ctx = await getRepresentativeContext();
  // Indicações são operacionais: somente representante ATIVO.
  if (!ctx || !representativeScopeAllows(ctx.representative.status, 'operational')) notFound();

  const result = await listMyLeadsAction();
  return (
    <MyLeadsClient
      items={result.success ? (result.data ?? []) : []}
      loadError={result.success ? null : result.error}
      referralCode={ctx.representative.referral_code}
    />
  );
}
