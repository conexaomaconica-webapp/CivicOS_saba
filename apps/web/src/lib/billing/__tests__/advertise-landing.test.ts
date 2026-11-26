import { describe, expect, it, afterEach } from 'vitest';
import {
  buildLegacyStep1RedirectUrl,
  buildOnboardingEntryUrl,
  decodeScopedPlanCookie,
  encodeScopedPlanCookie,
  isAdvertiseLandingEnabled,
  normalizeSelectedPlanTier,
  pickAllowedAttributionParams,
  resolveStep4InitialPlanTier,
  toPublicAdvertisePlan,
} from '../advertise-landing';

describe('advertise-landing helpers', () => {
  const originalFlag = process.env.ADVERTISE_LANDING_ENABLED;

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env.ADVERTISE_LANDING_ENABLED;
    } else {
      process.env.ADVERTISE_LANDING_ENABLED = originalFlag;
    }
  });

  it('controls feature flag ADVERTISE_LANDING_ENABLED safely across absent, false, true, and invalid values', () => {
    delete process.env.ADVERTISE_LANDING_ENABLED;
    expect(isAdvertiseLandingEnabled()).toBe(false);

    for (const falsyValue of ['false', '0', '', 'yes', 'maybe', 'TRUE_INVALID']) {
      process.env.ADVERTISE_LANDING_ENABLED = falsyValue;
      expect(isAdvertiseLandingEnabled()).toBe(false);
    }

    for (const truthyValue of ['true', 'TRUE', '1']) {
      process.env.ADVERTISE_LANDING_ENABLED = truthyValue;
      expect(isAdvertiseLandingEnabled()).toBe(true);
    }
  });

  it('maps Esquadro, Compasso and Acacia to bronze, prata and ouro and ignores price tampering', () => {
    expect(normalizeSelectedPlanTier('esquadro')).toBe('bronze');
    expect(normalizeSelectedPlanTier('compasso')).toBe('prata');
    expect(normalizeSelectedPlanTier('acacia')).toBe('ouro');
    expect(normalizeSelectedPlanTier('acácia')).toBe('ouro');
    expect(normalizeSelectedPlanTier('invalid-plan')).toBeNull();
    expect(normalizeSelectedPlanTier('')).toBeNull();

    const url = buildOnboardingEntryUrl('bronze', {
      ref: 'CODIGO_TESTE',
      utm_source: 'representante',
      utm_campaign: 'lancamento',
      coupon: 'BEMVINDO',
      price: '1',
      amount_cents: '0',
      arbitrary: 'evil',
    });

    expect(url).toBe(
      '/anunciar/passo-1?plan=esquadro&ref=CODIGO_TESTE&utm_source=representante&utm_campaign=lancamento&coupon=BEMVINDO',
    );
  });

  it('preserves esquadro/compasso/acacia in Step 4 and isolates cookies by tenant and malformed/expired state', () => {
    const cookieEsquadro = encodeScopedPlanCookie('tenant-a', 'bronze');
    expect(decodeScopedPlanCookie(cookieEsquadro, 'tenant-a')).toBe('bronze');
    expect(decodeScopedPlanCookie(cookieEsquadro, 'tenant-b')).toBeNull();
    expect(decodeScopedPlanCookie('malformed-cookie', 'tenant-a')).toBeNull();
    expect(decodeScopedPlanCookie('tenant-a:9999', 'tenant-a')).toBeNull();

    // Esquadro pre-selected via cookie is never overridden by 'ouro' or 'bronze_draft'
    expect(
      resolveStep4InitialPlanTier({
        cookieValue: cookieEsquadro,
        tenantId: 'tenant-a',
        draftPlanTier: 'bronze_draft',
      }),
    ).toBe('bronze');

    // Voluntary override via query param wins over cookie
    expect(
      resolveStep4InitialPlanTier({
        queryPlan: 'compasso',
        cookieValue: cookieEsquadro,
        tenantId: 'tenant-a',
        draftPlanTier: 'bronze_draft',
      }),
    ).toBe('prata');

    // Direct access without any prior selection falls back cleanly
    expect(
      resolveStep4InitialPlanTier({
        cookieValue: null,
        tenantId: 'tenant-a',
        draftPlanTier: 'bronze_draft',
      }),
    ).toBe('ouro');
  });

  it('preserves representative ref, coupon, and UTMs on legacy redirect when flag is disabled', () => {
    expect(
      buildLegacyStep1RedirectUrl({
        ref: 'CODIGO_TESTE',
        utm_source: 'representante',
        coupon: 'PARCEIRO10',
        foo: 'bar',
      }),
    ).toBe('/anunciar/passo-1?ref=CODIGO_TESTE&utm_source=representante&coupon=PARCEIRO10');
  });

  it('sanitizes public plan DTO and attribution params without leaking internal fields', () => {
    const publicPlan = toPublicAdvertisePlan({
      id: 'plan-bronze',
      tier: 'bronze',
      code: 'esquadro',
      name: 'Plano Esquadro',
      tagline: 'Presença no Guia',
      currency: 'BRL',
      annualPriceCents: 60000,
      monthlyPriceCents: 5000,
      payInFullCents: 60000,
      installmentTotalCents: 63500,
      installmentValueCents: 31750,
      pixPriceCents: 54000,
      pixDiscountPercentage: 10,
      installmentsMax: 3,
      features: [{ text: 'Presença básica', included: true }],
    });

    expect(Object.keys(publicPlan)).not.toContain('payInFullCents');
    expect(Object.keys(publicPlan)).not.toContain('installmentTotalCents');
    expect(Object.keys(publicPlan)).not.toContain('installmentValueCents');
    expect(publicPlan.annualPriceCents).toBe(60000);

    const safeAttribution = pickAllowedAttributionParams({
      ref: 'CODIGO_TESTE',
      utm_source: 'representante',
      secret_token: 'leak',
      price: '1',
    });
    expect(safeAttribution).toEqual({
      ref: 'CODIGO_TESTE',
      utm_source: 'representante',
    });
  });
});
