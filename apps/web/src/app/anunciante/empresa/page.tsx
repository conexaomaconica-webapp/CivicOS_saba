import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserProfileDataAction } from '@/lib/advertiser/advertiser-profile-service';
import AdvertiserProfileFormClient from './profile-form-client';

export const metadata = {
  title: 'Perfil da Empresa · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserProfilePage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fempresa');
  }

  const dto = await getAdvertiserProfileDataAction();

  return <AdvertiserProfileFormClient data={dto} />;
}
