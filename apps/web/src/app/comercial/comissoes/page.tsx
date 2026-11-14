import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { getEngineOverviewAction } from '@/lib/commercial/commissions-service';
import CommissionsClient from './commissions-client';

export const dynamic = 'force-dynamic';

export default async function CommercialCommissionsPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'commissions.read')) notFound();
  const overview = await getEngineOverviewAction();
  return <CommissionsClient overview={overview.success ? (overview.data ?? null) : null} loadError={overview.success ? null : overview.error} canAct={staffCan(ctx, 'commissions.approve')} />;
}
