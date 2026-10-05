import React from 'react';
import { redirect } from 'next/navigation';
import { AdvertiserLayoutWrapper } from './advertiser-layout-wrapper';
import { getAdvertiserDashboardDTOAction } from '@/lib/advertiser/advertiser-portal-service';
import { resolveNoBusinessRedirectPath } from '@/lib/advertiser/advertiser-access';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Portal do Anunciante | Conexão Maçônica',
  description: 'Gerencie seu anúncio, acompanhe seus resultados e faturas comerciais no Guia Conexão Maçônica.',
};

export default async function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  const data = await getAdvertiserDashboardDTOAction();

  // Sem empresa vinculada (membro comum ou anunciante ainda sem cadastro): não abre um painel vazio.
  if (!data.business.id) redirect(await resolveNoBusinessRedirectPath());

  return (
    <AdvertiserLayoutWrapper
      businessName={data.business.name}
      businessSlug={data.business.slug}
    >
      {children}
    </AdvertiserLayoutWrapper>
  );
}
