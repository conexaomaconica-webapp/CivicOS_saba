import { describe, expect, it } from 'vitest';
import { toPublicBusinessPresentation } from '../src/lib/business/public-business-presentation';
import { resolveEffectiveBusinessPlan } from '../src/lib/business/effective-business-plan';
import type { Database } from '../src/types/database.types';

type DetailRow = Database['public']['Functions']['public_business_detail']['Returns'][number];

const BASE_RPC: DetailRow = {
  tenant_slug: 'conexao-maconica',
  business_slug: 'empresa-resiliente',
  business_name: 'Empresa Resiliente',
  description: 'Descrição simples para testes de resiliência.',
  company_type: 'commercial',
  logo_url: null,
  primary_category_slug: 'servicos',
  primary_category_name: 'Serviços',
  locations: [],
  contacts: [],
  business_hours: [],
  media: [],
  is_founder: false,
  is_verified: false,
  effective_plan_code: 'bronze',
  responsible: null,
  rating_average: null,
  rating_count: 0,
};

describe('Bronze Preset Resilience and Multi-tenant Rules', () => {
  it('gracefully handles missing optional content without throwing', () => {
    const presentation = toPublicBusinessPresentation(BASE_RPC, []);
    expect(presentation.identity.logo).toBeNull();
    expect(presentation.media.cover).toBeNull();
    expect(presentation.contacts.whatsapp).toBeNull();
    expect(presentation.contacts.phone).toBeNull();
    expect(presentation.benefit).toBeNull();
    expect(presentation.reviews.items).toHaveLength(0);
    expect(presentation.reviews.average ?? null).toBeNull();
  });

  it('allows a Bronze company to be Founder and Verified independently', () => {
    const founderVerifiedRpc: DetailRow = {
      ...BASE_RPC,
      is_founder: true,
      is_verified: true,
    };
    const presentation = toPublicBusinessPresentation(founderVerifiedRpc, []);
    expect(presentation.authority.isFounder).toBe(true);
    expect(presentation.authority.isVerified).toBe(true);
    expect(presentation.authority.effectivePlan).toBe('bronze');
  });

  it('fails closed when subscription is inactive or effective tier is null', () => {
    const inactiveRpc: DetailRow = {
      ...BASE_RPC,
      effective_plan_code: null,
    };
    const plan = resolveEffectiveBusinessPlan({
      configuredTier: 'bronze',
      subscriptionStatus: 'expired',
      subscriptionTier: 'bronze',
    });
    expect(plan.effectiveTier).toBeNull();

    const presentation = toPublicBusinessPresentation(inactiveRpc, []);
    expect(presentation.authority.effectivePlan).toBeNull();
  });
});
