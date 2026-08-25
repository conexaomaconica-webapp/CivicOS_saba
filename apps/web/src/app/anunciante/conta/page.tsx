import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserAccountDTOAction } from '@/lib/advertiser/advertiser-account-service';
import AdvertiserAccountClient from './account-client';

export const metadata = {
  title: 'Minha Conta & Segurança · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserAccountPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fconta');
  }

  const dto = await getAdvertiserAccountDTOAction();

  return <AdvertiserAccountClient data={dto} />;
}
