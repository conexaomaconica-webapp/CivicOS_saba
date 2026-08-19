import type { ReactNode } from 'react';
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
  return (
    <div className="cm-public-shell">
      {showHeader ? <PublicHeader productName={productName || 'Conexão Maçônica'} logoUrl={logoUrl} viewer={viewer} /> : null}
      <main className="cm-public-main">{children}</main>
      {showFooter ? <PublicFooter /> : null}
    </div>
  );
}
