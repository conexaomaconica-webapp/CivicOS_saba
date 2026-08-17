import type { ReactNode } from 'react';
import { PublicShell } from '@/components/public/PublicShell';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import '@/styles/public-experience.css';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const brand = await resolveTenantBrandContext();

  return (
    <PublicShell productName={brand.appName} logoUrl={brand.logoUrl}>
      {children}
    </PublicShell>
  );
}
