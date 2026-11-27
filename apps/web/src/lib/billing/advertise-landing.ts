import type { CommercialPlan, PlanFeature } from './plans-service';

export type CanonicalPlanTier = 'bronze' | 'prata' | 'ouro';
export type PublicPlanSlug = 'esquadro' | 'compasso' | 'acacia';

export interface PublicAdvertisePlan {
  id: string;
  tier: CanonicalPlanTier;
  name: string;
  tagline: string;
  annualPriceCents: number;
  pixPriceCents?: number;
  pixDiscountPercentage?: number;
  installmentsMax?: number;
  badge?: string;
  isPopular?: boolean;
  features: PlanFeature[];
}

export const ADVERTISE_PLAN_COOKIE_NAME = 'cm_advertise_plan';

export const ALLOWED_ATTRIBUTION_PARAMS = [
  'ref',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'coupon',
  'src',
] as const;

const SLUG_TO_TIER: Record<string, CanonicalPlanTier> = {
  esquadro: 'bronze',
  bronze: 'bronze',
  compasso: 'prata',
  prata: 'prata',
  silver: 'prata',
  acacia: 'ouro',
  'acácia': 'ouro',
  ouro: 'ouro',
  gold: 'ouro',
};

const TIER_TO_SLUG: Record<CanonicalPlanTier, PublicPlanSlug> = {
  bronze: 'esquadro',
  prata: 'compasso',
  ouro: 'acacia',
};

/**
 * Feature flag server-side que controla a ativação da página comercial pública em /anunciar.
 */
export function isAdvertiseLandingEnabled(): boolean {
  const raw = (process.env.ADVERTISE_LANDING_ENABLED ?? '').trim().toLowerCase();
  return raw !== 'false' && raw !== '0';
}

/**
 * Normaliza um identificador de plano recebido por URL ou cookie para um tier canônico.
 * Ignora qualquer valor inválido ou tentativa de manipulação.
 */
export function normalizeSelectedPlanTier(raw: string | null | undefined): CanonicalPlanTier | null {
  if (!raw || typeof raw !== 'string') return null;
  const normalized = raw.trim().toLowerCase();
  return SLUG_TO_TIER[normalized] ?? null;
}

export function toPublicPlanSlug(tier: CanonicalPlanTier): PublicPlanSlug {
  return TIER_TO_SLUG[tier];
}

/**
 * Serializa e desserializa a seleção de plano isolada por tenant para persistência em cookie.
 */
export function encodeScopedPlanCookie(tenantId: string | null | undefined, tier: CanonicalPlanTier): string {
  const scope = (tenantId ?? 'default').trim() || 'default';
  return `${scope}:${tier}`;
}

export function decodeScopedPlanCookie(
  rawCookie: string | null | undefined,
  tenantId: string | null | undefined,
): CanonicalPlanTier | null {
  if (!rawCookie || typeof rawCookie !== 'string') return null;
  const expectedScope = (tenantId ?? 'default').trim() || 'default';
  const parts = rawCookie.trim().split(':');
  if (parts.length !== 2) return null;
  const [scope, tierRaw] = parts;
  if (scope !== expectedScope) return null;
  return normalizeSelectedPlanTier(tierRaw);
}

/**
 * Extrai somente os parâmetros de atribuição reconhecidos e sanitizados.
 */
export function pickAllowedAttributionParams(
  rawSearchParams?: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  if (!rawSearchParams) return result;
  for (const key of ALLOWED_ATTRIBUTION_PARAMS) {
    const value = rawSearchParams[key];
    const str = Array.isArray(value) ? value[0] : value;
    if (typeof str === 'string') {
      const clean = str.trim().slice(0, 120);
      if (clean) result[key] = clean;
    }
  }
  return result;
}

/**
 * Mapeia o plano para um DTO público estritamente delimitado, sem dados internos.
 */
export function toPublicAdvertisePlan(plan: CommercialPlan): PublicAdvertisePlan {
  return {
    id: plan.id,
    tier: plan.tier,
    name: plan.name,
    tagline: plan.tagline,
    annualPriceCents: plan.annualPriceCents,
    pixPriceCents: plan.pixPriceCents,
    pixDiscountPercentage: plan.pixDiscountPercentage,
    installmentsMax: plan.installmentsMax,
    badge: plan.badge,
    isPopular: plan.isPopular,
    features: plan.features,
  };
}

/**
 * Constrói a URL de entrada no Passo 1 do onboarding preservando apenas o plano validado
 * e parâmetros de atribuição reconhecidos (ref, UTMs, cupom, src). Nunca aceita preços.
 */
export function buildOnboardingEntryUrl(
  planTier: CanonicalPlanTier | null,
  rawSearchParams?: Record<string, string | string[] | undefined>,
): string {
  const params = new URLSearchParams();
  if (planTier) {
    params.set('plan', toPublicPlanSlug(planTier));
  }

  const allowed = pickAllowedAttributionParams(rawSearchParams);
  for (const [key, clean] of Object.entries(allowed)) {
    params.set(key, clean);
  }

  const qs = params.toString();
  return qs ? `/anunciar/passo-1?${qs}` : '/anunciar/passo-1';
}

/**
 * Preserva apenas parâmetros de atribuição reconhecidos ao redirecionar no modo legado (flag off).
 */
export function buildLegacyStep1RedirectUrl(
  rawSearchParams?: Record<string, string | string[] | undefined>,
): string {
  const preselected = normalizeSelectedPlanTier(
    Array.isArray(rawSearchParams?.plan) ? rawSearchParams?.plan[0] : rawSearchParams?.plan,
  );
  return buildOnboardingEntryUrl(preselected, rawSearchParams);
}

/**
 * Resolve o plano inicial no Passo 4 sem sobrescrever a escolha prévia por 'ouro'.
 */
export function resolveStep4InitialPlanTier({
  queryPlan,
  cookieValue,
  tenantId,
  draftPlanTier,
}: {
  queryPlan?: string | null;
  cookieValue?: string | null;
  tenantId?: string | null;
  draftPlanTier?: string | null;
}): CanonicalPlanTier {
  const fromQuery = normalizeSelectedPlanTier(queryPlan);
  if (fromQuery) return fromQuery;

  const fromCookie = decodeScopedPlanCookie(cookieValue, tenantId);
  if (fromCookie) return fromCookie;

  // Ignora 'bronze_draft' (estado inicial de rascunho criado no Passo 2)
  if (draftPlanTier && draftPlanTier !== 'bronze_draft') {
    const fromDraft = normalizeSelectedPlanTier(draftPlanTier);
    if (fromDraft) return fromDraft;
  }

  return 'ouro';
}

