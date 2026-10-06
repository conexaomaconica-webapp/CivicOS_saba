import { resolveLogoUrl } from '@/lib/business/business-media-helpers';
import React from 'react';
import { redirect } from 'next/navigation';
import { AdvertiserLayoutWrapper } from './advertiser-layout-wrapper';
import { getAdvertiserDashboardDTOAction } from '@/lib/advertiser/advertiser-portal-service';
import { resolveNoBusinessRedirectPath } from '@/lib/advertiser/advertiser-access';
import { getAdvertiserFeaturesAction } from '@/lib/advertiser/advertiser-entitlements';
import { getAdvertiserUnreadCountAction } from '@/lib/advertiser/advertiser-notifications-service';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Portal do Anunciante | Conexão Maçônica',
  description: 'Gerencie seu anúncio, acompanhe seus resultados e faturas comerciais no Guia Conexão Maçônica.',
};

export default async function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  const [data, features, unreadCount, brand] = await Promise.all([
    getAdvertiserDashboardDTOAction(),
    getAdvertiserFeaturesAction(),
    getAdvertiserUnreadCountAction(),
    resolveTenantBrandContext(),
  ]);

  // Sem empresa vinculada (membro comum ou anunciante ainda sem cadastro): não abre um painel vazio.
  if (!data.business.id) redirect(await resolveNoBusinessRedirectPath());

  return (
    <AdvertiserLayoutWrapper
      businessName={data.business.name}
      businessSlug={data.business.slug}
      businessLogo={data.business.logo_url && data.business.logo_url !== resolveLogoUrl(null) ? data.business.logo_url : null}
      features={features}
      unreadCount={unreadCount}
      brand={{ name: brand.appName || 'Conexão Maçônica', logoUrl: brand.logoUrl, primaryColor: brand.primaryColor }}
    >
      {children}
    </AdvertiserLayoutWrapper>
  );
}
