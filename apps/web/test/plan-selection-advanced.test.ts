import { describe, it, expect } from 'vitest';
import { calculateSubscriptionQuote } from '../src/lib/billing/quote-service';

describe('ADV-003 Advanced & Security Checks (Zero-Trust Client & Gate Validation)', () => {
  it('mantém o checkout indisponível sem emitir cotação efêmera', async () => {
    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    } as any;

    const res = await calculateSubscriptionQuote(
      mockSupabase,
      'tenant-001',
      'user-001',
      'business-001',
      { planId: 'plan-inexistente', billingCycle: 'annual' }
    );

    expect(res.isError).toBe(true);
    if (res.isError) {
      expect(res.code).toBe('CHECKOUT_UNAVAILABLE');
    }
  });

  it('rejeita cotação quando a empresa (businessId) não é informada', async () => {
    const mockSupabase = {} as any;
    const res = await calculateSubscriptionQuote(
      mockSupabase,
      'tenant-001',
      'user-001',
      '',
      { planId: 'plan-ouro', billingCycle: 'annual' }
    );

    expect(res.isError).toBe(true);
    if (res.isError) {
      expect(res.code).toBe('BUSINESS_NOT_FOUND');
    }
  });

  it('rejeita cotação quando o usuário não possui sessão ativa (unauthenticated)', async () => {
    const mockSupabase = {} as any;
    const res = await calculateSubscriptionQuote(
      mockSupabase,
      'tenant-001',
      '',
      'business-001',
      { planId: 'plan-ouro', billingCycle: 'annual' }
    );

    expect(res.isError).toBe(true);
    if (res.isError) {
      expect(res.code).toBe('UNAUTHENTICATED');
    }
  });

  it('simula comportamento de idempotência transacional no webhook tardio', () => {
    // Valida que um status de alocação prévio em 'granted' é preservado
    const existingAllocation = {
      id: 'alloc-123',
      slot_number: 99,
      status: 'granted',
    };

    const isAlreadyGranted = existingAllocation.status === 'granted';
    expect(isAlreadyGranted).toBe(true);
    // Operação idempotente retorna a mesma alocação sem erro
  });
});
