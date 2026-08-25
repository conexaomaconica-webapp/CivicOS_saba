'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
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
  const isGuia = pathname?.startsWith('/guia');

  const renderHeader = showHeader && !isGuia;
  const renderFooter = showFooter && !isGuia;

  return (
    <div className="cm-public-shell">
      {renderHeader ? <PublicHeader productName={productName || 'Conexão Maçônica'} logoUrl={logoUrl} viewer={viewer} /> : null}
      <main className="cm-public-main">{children}</main>
      {renderFooter ? <PublicFooter /> : null}
    </div>
  );
}
