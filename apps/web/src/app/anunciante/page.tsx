import React from 'react';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserDashboardDTOAction } from '@/lib/advertiser/advertiser-portal-service';
import { resolveNoBusinessRedirectPath } from '@/lib/advertiser/advertiser-access';
import { getAdvertiserSeoProfile } from '@/lib/advertiser/advertiser-seo-service';
import { AdvertiserSeoCard } from '@/components/advertiser/AdvertiserSeoCard';
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
  if (!dto.business.id) redirect(await resolveNoBusinessRedirectPath());

  const seoProfile = await getAdvertiserSeoProfile(dto.business.id);

  return (
    <>
      <AdvertiserHomeClient data={dto} />
      {seoProfile ? (
        <div className="mx-auto w-full max-w-5xl px-4 pb-10">
          <AdvertiserSeoCard profile={seoProfile} />
        </div>
      ) : null}
    </>
  );
}
