import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserNotificationsDTOAction } from '@/lib/advertiser/advertiser-notifications-service';
import AdvertiserNotificationsClient from './notifications-client';

export const metadata = {
  title: 'Notificações & Avisos · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserNotificationsPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fnotificacoes');
  }

  const dto = await getAdvertiserNotificationsDTOAction();

  return <AdvertiserNotificationsClient data={dto} />;
}
