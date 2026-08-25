import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserContentDataAction } from '@/lib/advertiser/advertiser-content-service';
import AdvertiserPostsClient from './posts-client';

export const metadata = {
  title: 'Publicações · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserPostsPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fconteudo%2Fposts');
  }

  const dto = await getAdvertiserContentDataAction();

  return <AdvertiserPostsClient data={dto} />;
}
