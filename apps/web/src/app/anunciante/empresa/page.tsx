import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserProfileDataAction } from '@/lib/advertiser/advertiser-profile-service';
import { listMyChangeRequestsAction } from '@/lib/advertiser/change-requests-service';
import AdvertiserProfileFormClient from './profile-form-client';

export const metadata = {
  title: 'Perfil da Empresa · Portal do Anunciante | Conexão Maçônica',
};

export const dynamic = 'force-dynamic';

export default async function AdvertiserProfilePage() {
  const supabase = await createServerSideClient();
  const { data: authData } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!authData?.user) {
    redirect('/login?redirect=%2Fanunciante%2Fempresa');
  }

  const [dto, requests, categoryRows] = await Promise.all([
    getAdvertiserProfileDataAction(),
    listMyChangeRequestsAction(),
    (supabase as any).from('categories').select('name').eq('is_active', true).order('name').limit(300),
  ]);
  const categories: string[] = Array.isArray(categoryRows?.data) ? categoryRows.data.map((c: any) => String(c.name)) : [];

  return <AdvertiserProfileFormClient data={dto} requests={requests} categories={categories} />;
}
