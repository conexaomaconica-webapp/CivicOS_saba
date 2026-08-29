import React from 'react';
import { AdvertiserLayoutWrapper } from './advertiser-layout-wrapper';
import { getAdvertiserDashboardDTOAction } from '@/lib/advertiser/advertiser-portal-service';

export const metadata = {
  title: 'Portal do Anunciante | Conexão Maçônica',
  description: 'Gerencie seu anúncio, acompanhe seus resultados e faturas comerciais no Guia Conexão Maçônica.',
};

export default async function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  const data = await getAdvertiserDashboardDTOAction();

  return (
    <AdvertiserLayoutWrapper
      businessName={data.business.name}
      businessSlug={data.business.slug}
    >
      {children}
    </AdvertiserLayoutWrapper>
  );
}
