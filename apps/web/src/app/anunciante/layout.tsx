import React from 'react';
import { AdvertiserLayoutWrapper } from './advertiser-layout-wrapper';

export const metadata = {
  title: 'Portal do Anunciante | Conexão Maçônica',
  description: 'Gerencie seu anúncio, acompanhe seus resultados e faturas comerciais no Guia Conexão Maçônica.',
};

export default function AdvertiserLayout({ children }: { children: React.ReactNode }) {
  return <AdvertiserLayoutWrapper>{children}</AdvertiserLayoutWrapper>;
}
