import type { ReactNode } from 'react';
import { PublicShell } from '@/components/public/PublicShell';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { FloatingWhatsApp } from '@/components/public/FloatingWhatsApp';
import { getPedraFundamentalCardConfigAction } from '@/app/actions/institutional-recognitions';
import { PedraCardDisplayProvider } from '@/lib/directory/pedra-card-display-context';
import '@/styles/public-experience.css';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [brand, pedraCardConfig] = await Promise.all([
    resolveTenantBrandContext(),
    getPedraFundamentalCardConfigAction(),
  ]);

  return (
    <PedraCardDisplayProvider
      value={pedraCardConfig.display}
      horizontalSealUrl={pedraCardConfig.horizontalSealUrl}
    >
      <PublicShell productName={brand.appName} logoUrl={brand.logoUrl}>
        {children}
        <FloatingWhatsApp />
      </PublicShell>
    </PedraCardDisplayProvider>
  );
}

