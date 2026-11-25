// ============================================================================
// Tenant Brand — authoritative, server-side public resolution
// ============================================================================

import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { Database } from '@/types/database.types';
import {
  APPROVED_FONT_STACKS,
  brandCssVarsToStyle,
  brandToCssVars,
  type ApprovedFontToken,
  type BrandCssOutput,
  type BrandVisualInput,
} from './brand-tokens';

export interface TenantBrandContext {
  readonly tenantSlug: string | null;
  readonly appName: string | null;
  readonly logoUrl: string | null;
  readonly faviconUrl: string | null;
  readonly primaryColor: string | null;
  readonly accentColor: string | null;
  readonly launchVideoMobileUrl: string | null;
  readonly launchVideoDesktopUrl: string | null;
  readonly launchAnimationEnabled: boolean;
  readonly colorMode: 'light' | 'dark';
  readonly followsSystem: boolean;
  readonly hasBranding: boolean;
  readonly css: string | null;
}

type PublicBrandingRow =
  Database['public']['Functions']['public_tenant_branding']['Returns'][number];

const HEX_RE = /^#[0-9a-f]{6}$/;
const SAFE_HOST_RE = /^[a-z0-9.-]+(?::[0-9]{1,5})?$/i;

function stringOrNull(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const result = value.trim();
  return result.length > 0 && result.length <= maxLength ? result : null;
}

function isPublicBrandingRow(value: unknown): value is PublicBrandingRow {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return (
    stringOrNull(row.tenant_slug, 160) !== null &&
    stringOrNull(row.display_name, 64) !== null &&
    typeof row.font_token === 'string' &&
    Object.hasOwn(APPROVED_FONT_STACKS, row.font_token)
  );
}

function requestHost(value: string | null): string | null {
  if (!value) return null;
  const host = value.trim();
  // The database performs canonical normalization and verified-domain lookup.
  // This bound prevents forwarding malformed or oversized values.
  return host.length <= 253 && SAFE_HOST_RE.test(host) ? host : null;
}

function contextFromRow(row: PublicBrandingRow): TenantBrandContext {
  const primaryColor = stringOrNull(row.primary_color, 7);
  const accentColor = stringOrNull(row.accent_color, 7);
  const radius = ['sm', 'md', 'lg', 'xl'].includes(row.radius ?? '')
    ? (row.radius as BrandVisualInput['radius'])
    : undefined;
  const visual: BrandVisualInput = {
    primaryColor:
      primaryColor && HEX_RE.test(primaryColor) ? primaryColor : undefined,
    accentColor:
      accentColor && HEX_RE.test(accentColor) ? accentColor : undefined,
    fontToken: row.font_token as ApprovedFontToken,
    radius,
    density: row.density === 'compact' ? 'compact' : 'comfortable',
  };
  const cssOutput: BrandCssOutput = brandToCssVars(visual);

  return {
    tenantSlug: row.tenant_slug,
    appName: stringOrNull(row.display_name, 64),
    logoUrl: stringOrNull(row.logo_url, 512),
    faviconUrl: stringOrNull(row.favicon_url, 512),
    primaryColor:
      primaryColor && HEX_RE.test(primaryColor) ? primaryColor : null,
    accentColor:
      accentColor && HEX_RE.test(accentColor) ? accentColor : null,
    launchVideoMobileUrl: null,
    launchVideoDesktopUrl: null,
    launchAnimationEnabled: true,
    colorMode: row.color_mode === 'dark' ? 'dark' : 'light',
    followsSystem: row.color_mode === 'auto',
    hasBranding: Object.keys(cssOutput.root).length > 0,
    css: brandCssVarsToStyle(cssOutput) || null,
  };
}

function emptyContext(): TenantBrandContext {
  return {
    tenantSlug: null,
    appName: null,
    logoUrl: null,
    faviconUrl: null,
    primaryColor: null,
    accentColor: null,
    launchVideoMobileUrl: null,
    launchVideoDesktopUrl: null,
    launchAnimationEnabled: true,
    colorMode: 'light',
    followsSystem: false,
    hasBranding: false,
    css: null,
  };
}

async function resolveForRequest(): Promise<TenantBrandContext> {
  const headerStore = await headers();
  const host = requestHost(headerStore.get('host'));
  if (!host) return emptyContext();

  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase.rpc('public_tenant_branding', {
      p_host: host,
    });
    const first = Array.isArray(data) ? data[0] : null;
    if (error || !isPublicBrandingRow(first)) return emptyContext();
    const base = contextFromRow(first);

    // Enriquecimento direto de tenants.settings.branding para campos recentes (vídeos de abertura/campanhas)
    // sem exigir alteração imediata da assinatura da RPC no banco.
    const admin = createServiceRoleClient();
    if (admin && base.tenantSlug) {
      try {
        const { data: tenantRow } = await admin
          .from('tenants')
          .select('settings')
          .eq('slug', base.tenantSlug)
          .maybeSingle();
        const settings =
          tenantRow && typeof tenantRow.settings === 'object' && tenantRow.settings !== null
            ? (tenantRow.settings as Record<string, unknown>)
            : null;
        const branding =
          settings && typeof settings.branding === 'object' && settings.branding !== null
            ? (settings.branding as Record<string, unknown>)
            : null;
        if (branding) {
          return {
            ...base,
            logoUrl: stringOrNull(branding.logoUrl, 512) ?? base.logoUrl,
            faviconUrl: stringOrNull(branding.faviconUrl, 512) ?? base.faviconUrl,
            launchVideoMobileUrl: stringOrNull(branding.launchVideoMobileUrl, 512),
            launchVideoDesktopUrl: stringOrNull(branding.launchVideoDesktopUrl, 512),
            launchAnimationEnabled: branding.launchAnimationEnabled !== false,
          };
        }
      } catch {
        // Fallback silencioso para base RPC
      }
    }

    return base;
  } catch {
    return emptyContext();
  }
}

/**
 * Resolve identity exclusively from the request Host via the verified-domain
 * RPC. Client-supplied tenant ids and cookies are deliberately ignored.
 */
export const resolveTenantBrandContext = cache(resolveForRequest);
