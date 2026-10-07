import type { ReactNode } from 'react';
import { PublicShell } from '@/components/public/PublicShell';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import { FloatingWhatsApp } from '@/components/public/FloatingWhatsApp';
import { getPublicSupportContact } from '@/lib/directory/support-contact-server';
import { getPedraFundamentalCardConfigAction } from '@/app/actions/institutional-recognitions';
import { PedraCardDisplayProvider } from '@/lib/directory/pedra-card-display-context';
import { FavoritesProvider } from '@/lib/directory/favorites-context';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import '@/styles/public-experience.css';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const gaMeasurementId = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? '').trim();
  const [brand, pedraCardConfig, support] = await Promise.all([
    resolveTenantBrandContext(),
    getPedraFundamentalCardConfigAction(),
    getPublicSupportContact(),
  ]);

  return (
    <PedraCardDisplayProvider
      value={pedraCardConfig.display}
      horizontalSealUrl={pedraCardConfig.horizontalSealUrl}
    >
      <FavoritesProvider>
        <PublicShell productName={brand.appName} logoUrl={brand.logoUrl}>
          {children}
          {/^G-[A-Z0-9]+$/i.test(gaMeasurementId) ? <GoogleAnalytics measurementId={gaMeasurementId} /> : null}
          <FloatingWhatsApp whatsapp={support.whatsapp} email={support.email} />
        </PublicShell>
      </FavoritesProvider>
    </PedraCardDisplayProvider>
  );
}

