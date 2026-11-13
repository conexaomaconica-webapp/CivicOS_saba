import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { listLeadsAction } from '@/lib/commercial/leads-service';
import LeadsStaffClient from './leads-staff-client';

export const dynamic = 'force-dynamic';

export default async function CommercialLeadsPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'leads.manage')) notFound();
  const result = await listLeadsAction();
  return (
    <LeadsStaffClient
      items={result.success ? (result.data ?? []) : []}
      loadError={result.success ? null : result.error}
      canConvert={staffCan(ctx, 'attributions.manage')}
    />
  );
}
