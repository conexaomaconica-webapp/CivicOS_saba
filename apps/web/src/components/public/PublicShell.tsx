import type { ReactNode } from 'react';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';
import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';

type PublicShellProps = {
  children: ReactNode;
  productName?: string | null;
  logoUrl?: string | null;
  showFooter?: boolean;
  viewer?: { name: string; location?: string | null; avatar?: PublicMediaAsset | null } | null;
};

export function PublicShell({
  children,
  productName = 'Conexão Maçônica',
  logoUrl,
  showFooter = true,
  viewer,
}: PublicShellProps) {
  return (
    <div className="cm-public-shell">
      <PublicHeader productName={productName || 'Conexão Maçônica'} logoUrl={logoUrl} viewer={viewer} />
      <main className="cm-public-main">{children}</main>
      {showFooter ? <PublicFooter /> : null}
    </div>
  );
}
