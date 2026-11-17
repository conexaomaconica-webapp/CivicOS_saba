'use client';

import { isGuiaHomePathname, isLandingPathname } from '@/lib/site/home-switch';
import { useHomeSwitchActive } from './home-switch-context';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
import { PublicMobileBottomNav } from './PublicMobileBottomNav';
import { DirectoryFavoritesModal } from './directory/DirectoryFavoritesModal';
import { LandingMobileBottomNav } from '@/components/landing/LandingMobileBottomNav';
import { LaunchExperience } from './LaunchExperience';
import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';

type PublicShellProps = {
  children: ReactNode;
  productName?: string | null;
  logoUrl?: string | null;
  showHeader?: boolean;
  showFooter?: boolean;
  viewer?: { name: string; location?: string | null; avatar?: PublicMediaAsset | null } | null;
};

export function PublicShell({
  children,
  productName = 'Conexão Maçônica',
  logoUrl,
  showHeader = true,
  showFooter = true,
  viewer,
}: PublicShellProps) {
  const pathname = usePathname();
  // Antes da virada "/" é a landing; depois, "/" é o Guia e a landing está em /institucional (ver lib/site/home-switch.ts).
  const homeSwitchActive = useHomeSwitchActive();
  const isLandingPage = isLandingPathname(pathname, homeSwitchActive);
  const isGuiaOrLegal = pathname?.startsWith('/guia') || pathname?.startsWith('/conexoes') || pathname === '/privacidade' || pathname === '/termos' || isGuiaHomePathname(pathname, homeSwitchActive);

  // A home (/) traz o próprio cabeçalho com logo e botão Entrar.
  const renderHeader = showHeader && !isGuiaOrLegal && !isLandingPage;
  const renderFooter = showFooter && !isGuiaOrLegal;

  return (
    <div className="cm-public-shell">
      <LaunchExperience />
      {renderHeader ? <PublicHeader productName={productName || 'Conexão Maçônica'} logoUrl={logoUrl} viewer={viewer} /> : null}
      <main className="cm-public-main pb-20 md:pb-0">{children}</main>
      {renderFooter ? <PublicFooter /> : null}
      {!isLandingPage ? <DirectoryFavoritesModal /> : null}
      {isLandingPage ? <LandingMobileBottomNav /> : <PublicMobileBottomNav />}
    </div>
  );
}
