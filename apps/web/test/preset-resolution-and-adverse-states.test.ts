import { describe, expect, it } from 'vitest';
import { toPublicBusinessPresentation } from '../src/lib/business/public-business-presentation';
import { resolveEffectiveBusinessPlan } from '../src/lib/business/effective-business-plan';
import type { Database } from '../src/types/database.types';

type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number];

const BASE_ROW: DetailRow = {
  tenant_slug: 'conexao-maconica',
  business_slug: 'test-company',
  business_name: 'Empresa Teste',
  description: 'Empresa para teste de resolução de presets.',
  company_type: 'commercial',
  logo_url: 'https://example.com/logo.png',
  primary_category_slug: 'servicos',
  primary_category_name: 'Serviços',
  locations: [],
  contacts: [],
  business_hours: [],
  media: [],
  is_founder: false,
  is_verified: true,
  effective_plan_code: 'bronze',
  responsible: null,
  rating_average: 4.8,
  rating_count: 12,
};

describe('Checkpoint 6 — Preset Resolution & Adverse States Unit Tests', () => {
  it('resolves Bronze preset when effective_plan_code is bronze', () => {
    const presentation = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'bronze' }, []);
    expect(presentation.authority.effectivePlan).toBe('bronze');
    expect(presentation.authority.isFounder).toBe(false);
  });

  it('resolves Prata preset when effective_plan_code is prata', () => {
    const presentation = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'prata' }, []);
    expect(presentation.authority.effectivePlan).toBe('prata');
    expect(presentation.authority.isFounder).toBe(false);
  });

  it('resolves Ouro preset when effective_plan_code is ouro', () => {
    const presentation = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'ouro' }, []);
    expect(presentation.authority.effectivePlan).toBe('ouro');
    expect(presentation.authority.isFounder).toBe(false);
  });

  it('resolves Ouro + Founder when effective_plan_code is ouro and is_founder is true', () => {
    const presentation = toPublicBusinessPresentation({
      ...BASE_ROW,
      effective_plan_code: 'ouro',
      is_founder: true,
    }, []);
    expect(presentation.authority.effectivePlan).toBe('ouro');
    expect(presentation.authority.isFounder).toBe(true);
  });

  it('never creates an independent 4th tier called founder', () => {
    const presentation = toPublicBusinessPresentation({
      ...BASE_ROW,
      effective_plan_code: 'ouro',
      is_founder: true,
    }, []);
    expect(presentation.authority.effectivePlan).not.toBe('founder');
    expect(['bronze', 'prata', 'ouro']).toContain(presentation.authority.effectivePlan);
  });

  it('fails closed when effective_plan_code is null or invalid', () => {
    const nullPlanPresentation = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: null }, []);
    expect(nullPlanPresentation.authority.effectivePlan).toBeNull();

    const invalidPlanPresentation = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'free_trial_fake' }, []);
    expect(invalidPlanPresentation.authority.effectivePlan).toBeNull();
  });

  it('correctly resolves subscription status for active subscription', () => {
    const resolved = resolveEffectiveBusinessPlan({
      configuredTier: 'ouro',
      subscriptionStatus: 'active',
      subscriptionTier: 'ouro',
    });
    expect(resolved.effectiveTier).toBe('ouro');
  });

  it('fails closed when subscription status is not active or expired', () => {
    const expiredResolved = resolveEffectiveBusinessPlan({
      configuredTier: 'ouro',
      subscriptionStatus: 'expired',
      subscriptionTier: 'ouro',
    });
    expect(expiredResolved.effectiveTier).toBeNull();

    const canceledResolved = resolveEffectiveBusinessPlan({
      configuredTier: 'prata',
      subscriptionStatus: 'canceled_and_ended',
      subscriptionTier: 'prata',
    });
    expect(canceledResolved.effectiveTier).toBeNull();
  });

  it('correctly maps all DEV_FIXTURES without runtime errors', () => {
    const bronze = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'bronze' }, []);
    const prata = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'prata' }, []);
    const ouro = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'ouro' }, []);
    const founder = toPublicBusinessPresentation({ ...BASE_ROW, effective_plan_code: 'ouro', is_founder: true }, []);

    expect(bronze.authority.effectivePlan).toBe('bronze');
    expect(prata.authority.effectivePlan).toBe('prata');
    expect(ouro.authority.effectivePlan).toBe('ouro');
    expect(founder.authority.effectivePlan).toBe('ouro');
    expect(founder.authority.isFounder).toBe(true);
  });
});
