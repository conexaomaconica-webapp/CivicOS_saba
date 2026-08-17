// ============================================================================
// Tenant Brand — authoritative, server-side public resolution
// ============================================================================

import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
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
    return contextFromRow(first);
  } catch {
    return emptyContext();
  }
}

/**
 * Resolve identity exclusively from the request Host via the verified-domain
 * RPC. Client-supplied tenant ids and cookies are deliberately ignored.
 */
export const resolveTenantBrandContext = cache(resolveForRequest);
