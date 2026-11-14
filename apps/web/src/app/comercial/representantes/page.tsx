import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { listRepresentativesAction } from '@/lib/commercial/representatives-service';
import { listCategoriesAction } from '@/lib/commercial/rules-service';
import RepresentativesClient from './representatives-client';

export const dynamic = 'force-dynamic';

export default async function CommercialRepresentativesPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'representatives.read')) notFound();

  const [result, categories] = await Promise.all([listRepresentativesAction(), staffCan(ctx, 'rules.manage') ? listCategoriesAction() : Promise.resolve(null)]);
  return (
    <RepresentativesClient
      items={result.success ? (result.data ?? []) : []}
      loadError={result.success ? null : result.error}
      canManage={staffCan(ctx, 'representatives.manage')}
      categories={categories && categories.success ? (categories.data ?? []).filter((c) => c.active).map((c) => ({ id: c.id, name: c.name })) : []}
    />
  );
}
