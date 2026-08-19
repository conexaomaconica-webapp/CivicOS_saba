import type { Metadata } from 'next';
import { getAppUrl } from '@/lib/seo/app-url';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';

const PLATFORM_NAME = 'Plataforma';
const PLATFORM_DESCRIPTION =
  'Plataforma digital white label para comunidades, organizações e negócios.';
const APP_URL = getAppUrl();

export async function generateRootMetadata(): Promise<Metadata> {
  const brand = await resolveTenantBrandContext();
  const appName = brand.appName ?? PLATFORM_NAME;

  return {
    metadataBase: new URL(APP_URL),
    title: { default: appName, template: `%s | ${appName}` },
    description: PLATFORM_DESCRIPTION,
    icons: {
      icon: brand.faviconUrl ?? '/icone.png',
      shortcut: brand.faviconUrl ?? '/icone.png',
      apple: brand.faviconUrl ?? '/icone.png',
    },
    ...(brand.primaryColor ? { themeColor: brand.primaryColor } : {}),
    robots: { index: true, follow: true },
  };
}
