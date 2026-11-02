import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateVoucherCode,
  formatVoucherExpiration,
  redeemBenefit,
  loadRedeemedBenefits,
  getRedeemedBenefit,
  type MobileBenefitItem,
} from './benefit-redemption';

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
});
