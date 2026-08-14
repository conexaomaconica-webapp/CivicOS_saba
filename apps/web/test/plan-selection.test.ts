import { describe, it, expect } from 'vitest';
import {
  CANONICAL_PLANS,
  fetchTenantPlans,
  computeMonthlyEquivalenceText,
  formatCentsToReais,
} from '../src/lib/billing/plans-service';
import { validateCoupon } from '../src/lib/billing/coupons-service';
import { calculateSubscriptionQuote } from '../src/lib/billing/quote-service';
import {
  savePlanDraft,
  loadPlanDraft,
  clearPlanDraft,
  buildPlanDraftKey,
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

describe('CANONICAL_PLANS & Formatação Monetária · ADV-003 (CRIT-VSC-005)', () => {
  it('contém os preços oficiais em centavos inteiros alinhados aos documentos do produto', () => {
    expect(CANONICAL_PLANS.bronze.annualPriceCents).toBe(50000);   // R$ 500
    expect(CANONICAL_PLANS.bronze.monthlyPriceCents).toBe(5000);   // R$ 50
    expect(CANONICAL_PLANS.prata.annualPriceCents).toBe(80000);    // R$ 800
    expect(CANONICAL_PLANS.prata.monthlyPriceCents).toBe(8000);    // R$ 80
    expect(CANONICAL_PLANS.ouro.annualPriceCents).toBe(100000);   // R$ 1000
    expect(CANONICAL_PLANS.ouro.monthlyPriceCents).toBe(10000);   // R$ 100
  });

  it('formata valores em centavos para a moeda oficial BRL', () => {
    expect(formatCentsToReais(50000)).toContain('500,00');
    expect(formatCentsToReais(59900)).toContain('599,00');
    expect(formatCentsToReais(0)).toBe('Grátis');
  });

  it('calcula equivalências mensais informativas com arredondamento comercial correto', () => {
    // R$ 500 / 12 = R$ 41,67/mês (arredondado para cima)
    expect(computeMonthlyEquivalenceText(50000)).toContain('41,67');
    // R$ 800 / 12 = R$ 66,67/mês
    expect(computeMonthlyEquivalenceText(80000)).toContain('66,67');
    // R$ 1000 / 12 = R$ 83,33/mês
    expect(computeMonthlyEquivalenceText(100000)).toContain('83,33');
    // Fundadores R$ 599 / 12 = R$ 49,92/mês
    expect(computeMonthlyEquivalenceText(59900)).toContain('49,92');
  });
});

describe('fetchTenantPlans & Tratamento de Erro do Supabase', () => {
  it('lança exceção explicita quando o Supabase retorna erro de infraestrutura', async () => {
    const mockSupabaseError = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: null, error: { message: 'Connection timeout' } }),
        }),
      }),
    } as any;

    await expect(fetchTenantPlans(mockSupabaseError, 'tenant-123')).rejects.toThrow(
      'INFRASTRUCTURE_ERROR'
    );
  });

  it('retorna os planos canônicos quando o tenant não possui customizações (retorno legítimo de array vazio)', async () => {
    const mockSupabaseClean = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    } as any;

    const plans = await fetchTenantPlans(mockSupabaseClean, 'tenant-123');
    expect(plans).toHaveLength(3);
    expect(plans[0].annualPriceCents).toBe(50000);
    expect(plans[1].annualPriceCents).toBe(80000);
    expect(plans[2].annualPriceCents).toBe(100000);
  });
});

describe('validateCoupon & Motor de Cupons', () => {
  it('não usa FUNDADOR599 como autoridade local de desconto ou reconhecimento', () => {
    const res = validateCoupon('FUNDADOR599', 'ouro', 'annual', 100000);
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe('UNAVAILABLE');
    expect(res.discountCents).toBe(0);
  });

  it('mantém qualquer cupom indisponível sem catálogo oficial persistido', () => {
    const resInvalid = validateCoupon('INEXISTENTE', 'ouro', 'annual', 100000);
    expect(resInvalid.valid).toBe(false);
    expect(resInvalid.errorCode).toBe('UNAVAILABLE');
  });
});

describe('calculateSubscriptionQuote · contenção', () => {
  const mockSupabaseOk = {
    from: () => ({
      select: () => ({
        eq: () => Promise.resolve({ data: [], error: null }),
      }),
    }),
  } as any;

  it('não apresenta uma cotação efêmera como persistida', async () => {
    const res = await calculateSubscriptionQuote(
      mockSupabaseOk,
      'tenant-001',
      'user-001',
      'business-001',
      { planId: 'plan-ouro', billingCycle: 'annual' }
    );

    expect(res).toMatchObject({ isError: true, code: 'CHECKOUT_UNAVAILABLE' });
  });

  it('não concede desconto por cupom hardcoded', async () => {
    const res = await calculateSubscriptionQuote(
      mockSupabaseOk,
      'tenant-001',
      'user-001',
      'business-001',
      { planId: 'plan-ouro', billingCycle: 'annual', couponCode: 'FUNDADOR599' }
    );

    expect(res).toMatchObject({ isError: true, code: 'CHECKOUT_UNAVAILABLE' });
  });
});

describe('plan-selection-flow · Isolamento por Tenant e Usuário', () => {
  it('constrói chave de armazenamento composta por tenantId e userId', () => {
    const key = buildPlanDraftKey('t10', 'u101');
    expect(key).toBe('civicos_plan_draft_t10_u101');
  });

  it('persiste e recupera o rascunho de forma isolada', () => {
    const storage = makeStorage();
    savePlanDraft(
      {
        tenantId: 't10',
        userId: 'u101',
        planId: 'plan-ouro',
        tier: 'ouro',
        tierName: 'Plano Ouro',
        billingCycle: 'annual',
        originalPriceCents: 100000,
        discountCents: 40100,
        finalPriceCents: 59900,
        couponCode: 'FUNDADOR599',
      },
      storage
    );

    const loaded = loadPlanDraft('t10', 'u101', storage);
    expect(loaded).toMatchObject({
      tenantId: 't10',
      userId: 'u101',
      planId: 'plan-ouro',
      finalPriceCents: 59900,
      couponCode: 'FUNDADOR599',
    });

    // Outro usuário não lê o rascunho de t10/u101
    expect(loadPlanDraft('t10', 'u999', storage)).toBeNull();
  });
});
