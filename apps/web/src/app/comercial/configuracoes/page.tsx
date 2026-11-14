import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { getCommercialSettingsAction } from '@/lib/commercial/settings-service';
import { listContractVersionsAction } from '@/lib/commercial/contract-service';
import SettingsClient from './settings-client';
import ContractClient from './contract-client';

export const dynamic = 'force-dynamic';

export default async function CommercialSettingsPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'settings.manage')) notFound();
  const [result, contracts] = await Promise.all([getCommercialSettingsAction(), listContractVersionsAction()]);
  return (
    <div className="space-y-8">
      <SettingsClient settings={result.success ? (result.data ?? null) : null} loadError={result.success ? null : result.error} />
      <ContractClient
        versions={contracts.success ? (contracts.data?.versions ?? []) : []}
        activeText={contracts.success ? (contracts.data?.activeText ?? null) : null}
        loadError={contracts.success ? null : contracts.error}
      />
    </div>
  );
}
