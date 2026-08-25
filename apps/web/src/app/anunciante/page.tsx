import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserDashboardDTOAction } from '@/lib/advertiser/advertiser-portal-service';
import AdvertiserHomeClient from './advertiser-home-client';

export const metadata = {
  title: 'Visão Geral · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserDashboardPage() {
  let isUserAuthenticated = false;
  let userId: string | undefined = undefined;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
    userId = data?.user?.id;
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante');
  }

  const dto = await getAdvertiserDashboardDTOAction(userId);

  return <AdvertiserHomeClient data={dto} />;
}
