import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserPlanBillingDTOAction } from '@/lib/advertiser/advertiser-billing-service';
import { getAdvertiserFeaturesAction } from '@/lib/advertiser/advertiser-entitlements';
import AdvertiserPlanClient from './plan-client';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Meu Plano & Assinatura · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserPlanPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fplano');
  }

  const [dto, features] = await Promise.all([getAdvertiserPlanBillingDTOAction(), getAdvertiserFeaturesAction()]);

  return <AdvertiserPlanClient data={dto} limits={features?.limits ?? null} />;
}
