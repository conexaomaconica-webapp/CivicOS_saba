'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
import { PublicMobileBottomNav } from './PublicMobileBottomNav';
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
  const isGuiaOrLegal = pathname?.startsWith('/guia') || pathname === '/privacidade' || pathname === '/termos';

  // A home (/) traz o próprio cabeçalho com logo e botão Entrar.
  const renderHeader = showHeader && !isGuiaOrLegal && pathname !== '/';
  const renderFooter = showFooter && !isGuiaOrLegal;

  return (
    <div className="cm-public-shell">
      {renderHeader ? <PublicHeader productName={productName || 'Conexão Maçônica'} logoUrl={logoUrl} viewer={viewer} /> : null}
      <main className="cm-public-main pb-20 md:pb-0">{children}</main>
      {renderFooter ? <PublicFooter /> : null}
      <PublicMobileBottomNav />
    </div>
  );
}
