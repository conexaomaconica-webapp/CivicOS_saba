import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserPlanBillingDTOAction } from '@/lib/advertiser/advertiser-billing-service';
import AdvertiserPaymentsClient from './payments-client';

export const metadata = {
  title: 'Faturas & Pagamentos · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserPaymentsPage() {
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

  const dto = await getAdvertiserPlanBillingDTOAction();

  return <AdvertiserPaymentsClient data={dto} />;
}
