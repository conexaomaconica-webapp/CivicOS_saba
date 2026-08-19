import { Providers } from './Providers';
import { getBootData } from '../runtime/server-kernel';
import { generateRootMetadata } from '@/lib/seo/root-metadata';
import { resolveTenantBrandContext } from '@/lib/tenant/tenant-brand';
import '@saas/ui/tokens.css';
import './globals.css';

export const generateMetadata = generateRootMetadata;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const bootData = await getBootData();
  const brand = await resolveTenantBrandContext();

  return (
    <html
      lang="pt-BR"
      data-theme={brand.colorMode === 'dark' ? 'dark' : undefined}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/icone.png" type="image/png" />
        <link rel="apple-touch-icon" href="/icone.png" />
        {brand.css ? (
          <style id="tenant-brand" data-tenant={brand.tenantSlug ?? undefined}>
            {brand.css}
          </style>
        ) : null}
        {brand.followsSystem ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){var m=window.matchMedia('(prefers-color-scheme: dark)');function a(){document.documentElement.setAttribute('data-theme',m.matches?'dark':'light')}a();m.addEventListener('change',a)})()`,
            }}
          />
        ) : null}
      </head>
      <body>
        <Providers bootData={bootData}>{children}</Providers>
      </body>
    </html>
  );
}
