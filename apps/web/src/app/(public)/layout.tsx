import type { ReactNode } from 'react';
import { PublicShell } from '@/components/public/PublicShell';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { FloatingWhatsApp } from '@/components/public/FloatingWhatsApp';
import { getPedraFundamentalCardDisplayAction } from '@/app/actions/institutional-recognitions';
import { PedraCardDisplayProvider } from '@/lib/directory/pedra-card-display-context';
import '@/styles/public-experience.css';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [brand, pedraCardDisplay] = await Promise.all([
    resolveTenantBrandContext(),
    getPedraFundamentalCardDisplayAction(),
  ]);

  return (
    <PedraCardDisplayProvider value={pedraCardDisplay}>
      <PublicShell productName={brand.appName} logoUrl={brand.logoUrl}>
        {children}
        <FloatingWhatsApp />
      </PublicShell>
    </PedraCardDisplayProvider>
  );
}

