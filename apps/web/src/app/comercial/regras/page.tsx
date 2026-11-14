import React from 'react';
import { notFound } from 'next/navigation';
import { getStaffContext, staffCan } from '@/lib/commercial/commercial-auth';
import { listCategoriesAction, listRulesAction } from '@/lib/commercial/rules-service';
import { listRepresentativesAction } from '@/lib/commercial/representatives-service';
import RulesClient from './rules-client';

export const dynamic = 'force-dynamic';

export default async function CommercialRulesPage() {
  const ctx = await getStaffContext();
  if (!ctx || !staffCan(ctx, 'rules.manage')) notFound();

  const [categories, rules, reps] = await Promise.all([listCategoriesAction(), listRulesAction(), staffCan(ctx, 'representatives.read') ? listRepresentativesAction() : Promise.resolve(null)]);
  return (
    <RulesClient
      categories={categories.success ? (categories.data ?? []) : []}
      rules={rules.success ? (rules.data ?? []) : []}
      representatives={reps && reps.success ? (reps.data ?? []).filter((r) => r.status === 'active').map((r) => ({ id: r.id, name: r.trade_name || r.legal_name })) : []}
      loadError={categories.success && rules.success ? null : (!categories.success ? categories.error : !rules.success ? rules.error : null)}
      canApprove={staffCan(ctx, 'rules.approve')}
    />
  );
}
