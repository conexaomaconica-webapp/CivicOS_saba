import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserPlanBillingDTOAction } from '@/lib/advertiser/advertiser-billing-service';
import AdvertiserPaymentsClient from './payments-client';

export const metadata = {
  title: 'Faturas & Pagamentos · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserPaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ businessId?: string }>;
}) {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fpagamentos');
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const businessId = resolvedParams?.businessId;

  const dto = await getAdvertiserPlanBillingDTOAction(businessId);

  return <AdvertiserPaymentsClient data={dto} />;
}
