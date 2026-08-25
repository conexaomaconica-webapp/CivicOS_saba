import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserResultsDTOAction } from '@/lib/advertiser/advertiser-results-service';
import AdvertiserResultsClient from './results-client';

export const metadata = {
  title: 'Resultados do meu Anúncio · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserResultsPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fresultados');
  }

  const dto = await getAdvertiserResultsDTOAction('30d');

  return <AdvertiserResultsClient initialData={dto} />;
}
