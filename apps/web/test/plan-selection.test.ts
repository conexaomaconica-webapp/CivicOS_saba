import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PLANS,
  fetchTenantPlans,
  type CommercialPlan,
} from '../src/lib/billing/plans-service';
import {
  savePlanDraft,
  loadPlanDraft,
  clearPlanDraft,
  PLAN_DRAFT_KEY,
  type StorageLike,
} from '../src/lib/onboarding/plan-selection-flow';

function makeStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe('DEFAULT_PLANS · ADV-003 (CRIT-VSC-005)', () => {
  it('contém definições de planos Bronze, Prata e Ouro', () => {
    expect(DEFAULT_PLANS.bronze).toBeDefined();
    expect(DEFAULT_PLANS.prata).toBeDefined();
    expect(DEFAULT_PLANS.ouro).toBeDefined();
  });

  it('valida que o plano Bronze é gratuito', () => {
    expect(DEFAULT_PLANS.bronze.defaultPriceAnnual).toBe(0);
    expect(DEFAULT_PLANS.bronze.defaultPriceMonthly).toBe(0);
  });

  it('valida que os planos pagos possuem recursos estendidos', () => {
    expect(DEFAULT_PLANS.prata.defaultPriceAnnual).toBeGreaterThan(0);
    expect(DEFAULT_PLANS.ouro.defaultPriceAnnual).toBeGreaterThan(DEFAULT_PLANS.prata.defaultPriceAnnual);

    const prataFeatures = DEFAULT_PLANS.prata.features.filter((f) => f.included);
    const ouroFeatures = DEFAULT_PLANS.ouro.features.filter((f) => f.included);

    expect(ouroFeatures.length).toBeGreaterThan(prataFeatures.length);
  });
});

describe('fetchTenantPlans fallback', () => {
  it('retorna os planos padrão quando o Supabase não retorna dados', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    } as any;

    const plans = await fetchTenantPlans(mockSupabase, 'tenant-123');
    expect(plans).toHaveLength(3);
    expect(plans[0].tier).toBe('bronze');
    expect(plans[1].tier).toBe('prata');
    expect(plans[2].tier).toBe('ouro');
  });

  it('mescla preços customizados do tenant quando disponíveis', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () =>
            Promise.resolve({
              data: [
                { id: 'custom-prata', tier: 'prata', price_annual: 350.0 },
              ],
              error: null,
            }),
        }),
      }),
    } as any;

    const plans = await fetchTenantPlans(mockSupabase, 'tenant-123');
    const prataPlan = plans.find((p) => p.tier === 'prata');
    expect(prataPlan?.priceAnnual).toBe(350.0);
    expect(prataPlan?.priceMonthly).toBe(35.0);
  });
});

describe('plan-selection-flow · ADV-003', () => {
  it('salva e restaura o rascunho do plano selecionado', () => {
    const storage = makeStorage();
    const saved = savePlanDraft(
      {
        planId: 'plan-prata',
        tier: 'prata',
        tierName: 'Plano Prata',
        billingCycle: 'annual',
        price: 299.0,
      },
      storage
    );

    expect(saved?.savedAt).toBeTruthy();
    expect(storage.getItem(PLAN_DRAFT_KEY)).toBeTruthy();

    const loaded = loadPlanDraft(storage);
    expect(loaded).toMatchObject({
      planId: 'plan-prata',
      tier: 'prata',
      tierName: 'Plano Prata',
      billingCycle: 'annual',
      price: 299.0,
    });
  });

  it('retorna null quando não há rascunho de plano', () => {
    expect(loadPlanDraft(makeStorage())).toBeNull();
  });

  it('limpa o rascunho do plano', () => {
    const storage = makeStorage();
    savePlanDraft(
      {
        planId: 'plan-ouro',
        tier: 'ouro',
        tierName: 'Plano Ouro',
        billingCycle: 'monthly',
        price: 49.9,
      },
      storage
    );

    clearPlanDraft(storage);
    expect(loadPlanDraft(storage)).toBeNull();
  });
});
