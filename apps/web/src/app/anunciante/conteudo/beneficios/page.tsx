import React from 'react';
import { listMyChangeRequestsAction } from '@/lib/advertiser/change-requests-service';
import { redirect } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getAdvertiserContentDataAction } from '@/lib/advertiser/advertiser-content-service';
import { getAdvertiserFeaturesAction } from '@/lib/advertiser/advertiser-entitlements';
import { FeatureLockedNotice } from '@/components/advertiser/FeatureLockedNotice';
import AdvertiserBenefitsClient from './benefits-client';

export const metadata = {
  title: 'Benefícios e Ofertas · Portal do Anunciante | Conexão Maçônica',
};

export default async function AdvertiserBenefitsPage() {
  let isUserAuthenticated = false;

  try {
    const supabase = await createServerSideClient();
    const { data } = await supabase.auth.getUser();
    isUserAuthenticated = Boolean(data?.user);
  } catch (_e) {
    isUserAuthenticated = false;
  }

  if (!isUserAuthenticated) {
    redirect('/login?redirect=%2Fanunciante%2Fconteudo%2Fbeneficios');
  }

  const features = await getAdvertiserFeaturesAction();
  if (features && !features.allows.benefits) return <FeatureLockedNotice feature="Benefícios e Ofertas" planName={features.planName} />;

  const [dto, requests] = await Promise.all([getAdvertiserContentDataAction(), listMyChangeRequestsAction()]);

  return <AdvertiserBenefitsClient data={dto} requests={requests} />;
}
