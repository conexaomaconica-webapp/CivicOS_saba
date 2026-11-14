import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { getCommercialSettingsAction } from '@/lib/commercial/settings-service';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function CommercialSettingsPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'settings.manage')) notFound();
  const result = await getCommercialSettingsAction();
  return <SettingsClient settings={result.success ? (result.data ?? null) : null} loadError={result.success ? null : result.error} />;
}
