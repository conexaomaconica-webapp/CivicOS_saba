import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateVoucherCode,
  formatVoucherExpiration,
  formatBenefitBadgeLabel,
  redeemBenefit,
  loadRedeemedBenefits,
  getRedeemedBenefit,
  type MobileBenefitItem,
} from './benefit-redemption';
import { createMobileGuideService } from './guide-data';

describe('Benefit Redemption System', () => {
  let store: Record<string, string> = {};

  beforeEach(() => {
    store = {};
    (globalThis as any).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  });

  afterEach(() => {
    delete (globalThis as any).localStorage;
  });

  it('generates a valid voucher code with CM-BEN- prefix by default', () => {
    const code = generateVoucherCode();
    expect(code).toMatch(/^CM-BEN-[A-Z0-9]{6}$/);
  });

  it('preserves custom discount code when provided', () => {
    const code = generateVoucherCode('PROMO20');
    expect(code).toBe('PROMO20');
  });

  it('formats expiration dates correctly for BR locale', () => {
    const formatted = formatVoucherExpiration('2026-12-31T23:59:59.000Z');
    expect(formatted).toBe('31/12/2026');

    const empty = formatVoucherExpiration(null);
    expect(empty).toBe('Consulte as condições da oferta');
  });

  it('redeems a benefit, persists in localStorage, and returns voucher', () => {
    const sampleBenefit: MobileBenefitItem = {
      id: 'ben-123',
      title: '15% de Desconto em Rodízio',
      description: 'Válido de terça a quinta para membros e familiares.',
      discount_percentage: 15,
      valid_until: '2026-12-31T23:59:59.000Z',
    };

    const voucher = redeemBenefit({
      benefit: sampleBenefit,
      businessName: 'Churrascaria Fraterna',
      businessSlug: 'churrascaria-fraterna',
      businessId: 'biz-999',
      user: { id: 'usr-1', name: 'Ir. João Silva', email: 'joao@exemplo.com' },
    });

    expect(voucher.benefitId).toBe('ben-123');
    expect(voucher.businessName).toBe('Churrascaria Fraterna');
    expect(voucher.discountPercentage).toBe(15);
    expect(voucher.code).toMatch(/^CM-BEN-/);
    expect(voucher.userName).toBe('Ir. João Silva');
    expect(voucher.userEmail).toBe('joao@exemplo.com');

    // Verifica que foi salvo
    const saved = loadRedeemedBenefits();
    expect(saved.length).toBe(1);
    expect(saved[0]?.benefitId).toBe('ben-123');

    // Recupera diretamente
    const retrieved = getRedeemedBenefit('ben-123');
    expect(retrieved).toBeDefined();
    expect(retrieved?.code).toBe(voucher.code);

    // Se resgatar novamente, retorna o existente sem duplicar
    const secondCall = redeemBenefit({
      benefit: sampleBenefit,
      businessName: 'Churrascaria Fraterna',
      businessSlug: 'churrascaria-fraterna',
    });
    expect(secondCall.code).toBe(voucher.code);
    expect(loadRedeemedBenefits().length).toBe(1);
  });

  it('normalizes internal benefit types into user-friendly Portuguese labels', () => {
    expect(formatBenefitBadgeLabel(null, 'special_condition')).toBe('Condição especial');
    expect(formatBenefitBadgeLabel('special_condition', 'special_condition')).toBe('Condição especial');
    expect(formatBenefitBadgeLabel(null, 'discount')).toBe('Oferta');
    expect(formatBenefitBadgeLabel('15% OFF', 'discount')).toBe('15% Desconto');
    expect(formatBenefitBadgeLabel(null, null)).toBe('Oferta');
  });

  it('loads inline benefits via BFF slug detail even when direct Supabase REST returns 401', async () => {
    const fetchMock: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/rest/v1/business_benefits')) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
      }
      if (url.includes('slug=comandos')) {
        return new Response(
          JSON.stringify({
            detail: {
              business_id: 'biz-comandos',
              business_name: 'Comandos',
              business_slug: 'comandos',
              benefits: [
                {
                  id: 'b-1',
                  title: 'Desconto na instalação',
                  description: 'Instalação gratuita',
                  benefit_type: 'special_condition',
                  discount_percentage: null,
                },
                {
                  id: 'b-2',
                  title: '15% na mensalidade',
                  description: 'Plano residencial',
                  benefit_type: 'discount',
                  discount_percentage: 15,
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ detail: null }), { status: 404 });
    };

    const service = createMobileGuideService(fetchMock);
    const grouped = await service.loadBenefitsForBusinessEntries([
      { id: 'biz-comandos', slug: 'comandos' },
    ]);

    expect(grouped['biz-comandos']).toHaveLength(2);
    expect(grouped['biz-comandos']?.[0]?.benefit_type).toBe('special_condition');
    expect(grouped['biz-comandos']?.[1]?.discount_percentage).toBe(15);
  });

  it('caps BFF concurrency to <= 4 and isolates partial failures across multiple businesses', async () => {
    let activeRequests = 0;
    let maxObservedConcurrency = 0;

    const entries = [
      { id: 'biz-1', slug: 'emp-1' },
      { id: 'biz-2', slug: 'emp-2' },
      { id: 'biz-3', slug: 'emp-3' },
      { id: 'biz-4', slug: 'emp-4' },
      { id: 'biz-5', slug: 'emp-5' },
      { id: 'biz-6', slug: 'emp-6' },
    ];

    const fetchMock: typeof fetch = async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url.includes('/rest/v1/')) {
        return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 });
      }
      if (url.includes('/api/mobile/guide?slug=')) {
        activeRequests += 1;
        maxObservedConcurrency = Math.max(maxObservedConcurrency, activeRequests);
        await new Promise((r) => setTimeout(r, 15));
        activeRequests -= 1;

        if (url.includes('slug=emp-3')) {
          return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
        }

        const match = url.match(/slug=(emp-\d+)/);
        const slug = match?.[1] || 'emp';
        return new Response(
          JSON.stringify({
            detail: {
              business_id: slug,
              business_slug: slug,
              benefits: [
                {
                  id: `ben-${slug}`,
                  title: `Oferta ${slug}`,
                  description: 'Benefício ativo',
                  benefit_type: 'discount',
                  discount_percentage: 10,
                },
              ],
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response('{}', { status: 404 });
    };

    const service = createMobileGuideService(fetchMock);
    const grouped = await service.loadBenefitsForBusinessEntries(entries);

    expect(maxObservedConcurrency).toBeLessThanOrEqual(4);
    expect(grouped['biz-1']?.[0]?.id).toBe('ben-emp-1');
    expect(grouped['biz-2']?.[0]?.id).toBe('ben-emp-2');
    expect(grouped['biz-3']).toBeUndefined();
    expect(grouped['biz-4']?.[0]?.id).toBe('ben-emp-4');
    expect(grouped['biz-5']?.[0]?.id).toBe('ben-emp-5');
    expect(grouped['biz-6']?.[0]?.id).toBe('ben-emp-6');
  });
});
