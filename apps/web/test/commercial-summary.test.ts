import { describe, it, expect } from 'vitest';
import type { CommercialPlan } from '../src/lib/billing/plans-service';
import {
  buildCommercialSummary,
  formatCurrencyBRL,
  getBillingCycleLabel,
  CONTRACTUAL_CONDITIONS,
} from '../src/lib/onboarding/commercial-summary';

function makePlan(overrides: Partial<CommercialPlan> = {}): CommercialPlan {
  return {
    id: 'plan-prata',
    tier: 'prata',
    name: 'Plano Prata',
    tagline: '',
    currency: 'BRL',
    annualPriceCents: 80000,
    monthlyPriceCents: 8000,
    features: [],
    ...overrides,
  };
}

describe('buildCommercialSummary · ADV-004 (CRIT-VSC-005)', () => {
  it('monta resumo com valores do ciclo anual', () => {
    const summary = buildCommercialSummary({
      plan: makePlan(),
      cycle: 'annual',
      business: {
        name: 'Padaria Estrela',
        legalName: 'Padaria Estrela Ltda',
        cnpj: '11222333000181',
        categoryName: 'Alimentos e Bebidas',
      },
      responsible: { name: 'João Silva', relationship: 'owner' },
    });

    expect(summary.planName).toBe('Plano Prata');
    expect(summary.cycleLabel).toBe('Anual');
    expect(summary.price).toBe(800);
    expect(summary.priceFormatted).toBe('R$ 800,00');
    expect(summary.business.cnpjDisplay).toBe('11.222.333/0001-81');
    expect(summary.business.categoryName).toBe('Alimentos e Bebidas');
    expect(summary.responsible.relationshipLabel).toContain('Proprietário');
  });

  it('apresenta preço e ciclo mensal quando selecionado', () => {
    const summary = buildCommercialSummary({
      plan: makePlan(),
      cycle: 'monthly',
      business: null,
      responsible: null,
    });

    expect(summary.cycleLabel).toBe('Mensal');
    expect(summary.price).toBe(80);
  });

  it('manipula a ausência de dados (rascunhos faltantes)', () => {
    const summary = buildCommercialSummary({
      plan: null,
      cycle: 'annual',
      business: null,
      responsible: null,
    });

    expect(summary.planName).toBeNull();
    expect(summary.business.name).toBeNull();
    expect(summary.business.cnpjDisplay).toBeNull();
    expect(summary.responsible.relationshipLabel).toBeNull();
    expect(summary.priceFormatted).toBe('Grátis');
  });

  it('expõe as condições contratuais canonizadas (CRIT-VSC-006)', () => {
    expect(CONTRACTUAL_CONDITIONS.length).toBeGreaterThanOrEqual(4);
    expect(CONTRACTUAL_CONDITIONS.join(' ')).toContain('SHA-256');
  });
});

describe('formatCurrencyBRL', () => {
  it('formata valores e zero como Grátis', () => {
    expect(formatCurrencyBRL(0)).toBe('Grátis');
    expect(formatCurrencyBRL(499)).toBe('R$ 499,00');
  });
});

describe('getBillingCycleLabel', () => {
  it('mapeia ciclos para rótulos', () => {
    expect(getBillingCycleLabel('annual')).toBe('Anual');
    expect(getBillingCycleLabel('monthly')).toBe('Mensal');
  });
});