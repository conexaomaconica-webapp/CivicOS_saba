import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { listPayoutsAction } from '@/lib/commercial/commissions-service';
import PayoutsClient from './payouts-client';

export const dynamic = 'force-dynamic';

export default async function CommercialPayoutsPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'payouts.manage')) notFound();
  const result = await listPayoutsAction();
  return <PayoutsClient data={result.success ? (result.data ?? null) : null} loadError={result.success ? null : result.error} isMaster={ctx.isMaster} />;
}
