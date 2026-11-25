import {
  createMobileSupabaseClients,
  mobileCorsOptionsResponse,
  mobileJsonResponse,
  resolveMobileTenantId,
} from '@/lib/mobile/mobile-api-auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function OPTIONS() {
  return mobileCorsOptionsResponse();
}

export async function GET() {
  const clients = createMobileSupabaseClients();
  if (!clients) {
    return mobileJsonResponse({ success: false, error: 'Serviço indisponível.' }, 503);
  }

  const db = clients.adminClient || clients.anonClient;
  const tenantId = await resolveMobileTenantId(db);
  if (!tenantId) {
    return mobileJsonResponse({ success: true, brand: null });
  }

  const { data } = await (db as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: { name?: string; settings?: Record<string, unknown> } | null }>;
        };
      };
    };
  })
    .from('tenants')
    .select('name, settings')
    .eq('id', tenantId)
    .maybeSingle();

  const settings =
    data && typeof data.settings === 'object' && data.settings !== null
      ? (data.settings as Record<string, unknown>)
      : {};
  const branding =
    typeof settings.branding === 'object' && settings.branding !== null
      ? (settings.branding as Record<string, unknown>)
      : {};

  return mobileJsonResponse({
    success: true,
    brand: {
      appName: typeof branding.appName === 'string' && branding.appName ? branding.appName : data?.name || 'Conexão Maçônica',
      logoUrl: typeof branding.logoUrl === 'string' && branding.logoUrl ? branding.logoUrl : null,
      primaryColor: typeof branding.primaryColor === 'string' && branding.primaryColor ? branding.primaryColor : null,
      accentColor: typeof branding.accentColor === 'string' && branding.accentColor ? branding.accentColor : null,
      launchVideoMobileUrl:
        typeof branding.launchVideoMobileUrl === 'string' && branding.launchVideoMobileUrl
          ? branding.launchVideoMobileUrl
          : null,
      launchAnimationEnabled: branding.launchAnimationEnabled !== false,
    },
  });
}

