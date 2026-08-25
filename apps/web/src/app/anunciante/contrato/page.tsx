import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserPlanBillingDTOAction } from '@/lib/advertiser/advertiser-billing-service';
import AdvertiserContractClient from './contract-client';

export const metadata = {
  title: 'Meu Contrato Digital · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserContractPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fcontrato');
  }

  const dto = await getAdvertiserPlanBillingDTOAction();

  return <AdvertiserContractClient data={dto} />;
}
