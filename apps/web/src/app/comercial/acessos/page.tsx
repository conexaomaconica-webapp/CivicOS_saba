import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { listAccessGrantsAction } from '@/lib/commercial/access-grants-service';
import AccessGrantsClient from './access-grants-client';

export const dynamic = 'force-dynamic';

export default async function CommercialAccessPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'settings.manage')) notFound();
  const result = await listAccessGrantsAction();
  return <AccessGrantsClient items={result.success ? (result.data ?? []) : []} loadError={result.success ? null : result.error} />;
}
