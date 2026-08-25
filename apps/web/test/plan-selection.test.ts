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
    expect(CANONICAL_PLANS.bronze.annualPriceCents).toBe(0);         // R$ 0 / Gratuito
    expect(CANONICAL_PLANS.bronze.monthlyPriceCents).toBe(0);
    expect(CANONICAL_PLANS.prata.annualPriceCents).toBe(178800);    // R$ 1.788
    expect(CANONICAL_PLANS.ouro.annualPriceCents).toBe(238800);     // R$ 2.388
  });

  it('formata valores em centavos para a moeda oficial BRL', () => {
    expect(formatCentsToReais(178800)).toContain('1.788,00');
    expect(formatCentsToReais(238800)).toContain('2.388,00');
    expect(formatCentsToReais(0)).toBe('Gratuito');
  });

  it('calcula equivalências mensais informativas com arredondamento comercial correto', () => {
    expect(computeMonthlyEquivalenceText(178800)).toContain('149,00');
    expect(computeMonthlyEquivalenceText(238800)).toContain('199,00');
    expect(computeMonthlyEquivalenceText(0)).toBe('Gratuito');
  });
});

describe('fetchTenantPlans & Tratamento de Erro do Supabase', () => {
  it('retorna os planos padrão quando o Supabase retorna falha temporária de conexão', async () => {
    const mockSupabaseError = {
      from: () => ({
        select: () => ({
          in: () => Promise.resolve({ data: null, error: { message: 'Connection timeout' } }),
        }),
      }),
    } as any;

    const plans = await fetchTenantPlans(mockSupabaseError, 'tenant-123');
    expect(plans).toHaveLength(3);
    expect(plans[0].tier).toBe('bronze');
  });

  it('retorna os planos canônicos quando o tenant não possui customizações (retorno legítimo de array vazio)', async () => {
    const mockSupabaseClean = {
      from: () => ({
        select: () => ({
          in: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    } as any;

    const plans = await fetchTenantPlans(mockSupabaseClean, 'tenant-123');
    expect(plans).toHaveLength(3);
    expect(plans[0].annualPriceCents).toBe(0);
    expect(plans[1].annualPriceCents).toBe(178800);
    expect(plans[2].annualPriceCents).toBe(238800);
  });
});

describe('validateCoupon & Motor de Cupons', () => {
  it('não usa FUNDADOR599 como autoridade local de desconto ou reconhecimento', () => {
    const res = validateCoupon('FUNDADOR599', 'ouro', 'annual', 238800);
    expect(res.valid).toBe(false);
    expect(res.errorCode).toBe('UNAVAILABLE');
    expect(res.discountCents).toBe(0);
  });

  it('mantém qualquer cupom indisponível sem catálogo oficial persistido', () => {
    const resInvalid = validateCoupon('INEXISTENTE', 'ouro', 'annual', 238800);
    expect(resInvalid.valid).toBe(false);
    expect(resInvalid.errorCode).toBe('UNAVAILABLE');
    expect(resInvalid.discountCents).toBe(0);
  });
});

describe('calculateSubscriptionQuote & Cotação Final', () => {
  it('valida sessão e empresa para geração de cotação', () => {
    const mockSupabase = {} as any;
    const res = calculateSubscriptionQuote(mockSupabase, 'tenant-1', 'user-1', 'biz-1', {
      planId: 'plan-ouro',
      billingCycle: 'annual',
    });
    expect(res.isError).toBe(true);
    expect(res.code).toBe('CHECKOUT_UNAVAILABLE');
  });
});

describe('plan-selection-flow & Persistência Local em Rascunho', () => {
  it('salva, carrega e limpa rascunho de seleção de plano', () => {
    const storage = makeStorage();

    savePlanDraft(
      {
        tenantId: 'tenant-1',
        userId: 'user-100',
        planId: 'plan-prata',
        tier: 'prata',
        tierName: 'Plano Prata',
        billingCycle: 'annual',
        originalPriceCents: 178800,
        discountCents: 0,
        finalPriceCents: 178800,
      },
      storage
    );

    const loaded = loadPlanDraft('tenant-1', 'user-100', storage);
    expect(loaded).not.toBeNull();
    expect(loaded?.tier).toBe('prata');

    clearPlanDraft('tenant-1', 'user-100', storage);
    expect(loadPlanDraft('tenant-1', 'user-100', storage)).toBeNull();
  });
});
