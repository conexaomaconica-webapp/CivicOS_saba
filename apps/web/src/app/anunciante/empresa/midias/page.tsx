import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserProfileDataAction } from '@/lib/advertiser/advertiser-profile-service';
import AdvertiserMediaManagementClient from './media-management-client';

export const metadata = {
  title: 'Fotos e Mídias · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserMediaPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fempresa%2Fmidias');
  }

  const dto = await getAdvertiserProfileDataAction();

  return <AdvertiserMediaManagementClient data={dto} />;
}
