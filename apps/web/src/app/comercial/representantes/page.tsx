import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { listRepresentativesAction } from '@/lib/commercial/representatives-service';
import RepresentativesClient from './representatives-client';

export const dynamic = 'force-dynamic';

export default async function CommercialRepresentativesPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'representatives.read')) notFound();

  const result = await listRepresentativesAction();
  return (
    <RepresentativesClient
      items={result.success ? (result.data ?? []) : []}
      loadError={result.success ? null : result.error}
      canManage={staffCan(ctx, 'representatives.manage')}
    />
  );
}
