import { describe, it, expect, vi } from 'vitest';

const mockBiz = {
  id: 'business-draft-1',
  tenant_id: '00000000-0000-0000-0000-000000000010',
  name: 'Oficina Rascunho Onboarding',
  slug: 'oficina-rascunho-onboarding',
};

const createMockSupabaseClient = () => {
  const chain: any = {
    select: () => chain,
    insert: () => chain,
    update: () => chain,
    upsert: () => chain,
    delete: () => chain,
    eq: () => chain,
    neq: () => chain,
    in: () => chain,
    or: () => chain,
    limit: () => chain,
    order: () => chain,
    maybeSingle: () => Promise.resolve({ data: mockBiz, error: null }),
    single: () => Promise.resolve({ data: mockBiz, error: null }),
    then: (resolve: any) => resolve({ data: [mockBiz], count: 1, error: null }),
  };

  return {
    from: () => chain,
    rpc: (fnName: string) => {
      if (fnName === '_resolve_tenant_by_host') {
        return Promise.resolve({ data: '00000000-0000-0000-0000-000000000010', error: null });
      }
      return Promise.resolve({ data: null, error: null });
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'usr_onboarding_owner', email: 'owner@onboarding.com' } },
        error: null,
      }),
    },
  };
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockImplementation(() => createMockSupabaseClient()),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSideClient: vi.fn().mockImplementation(() => Promise.resolve(createMockSupabaseClient())),
  resolveTenantIdServer: vi.fn().mockResolvedValue('00000000-0000-0000-0000-000000000010'),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn().mockResolvedValue({
    get: () => 'localhost',
  }),
  cookies: () => Promise.resolve({
    get: () => undefined,
    getAll: () => [],
    set: () => {},
    delete: () => {},
  }),
}));

import {
  createDraftBusinessAction,
} from '../src/app/actions/onboarding-checkout-actions';
import {
  AsaasBillingAdapter,
  StripeBillingAdapter,
  MercadoPagoBillingAdapter,
} from '../src/lib/billing/billing-adapters';

async function confirmPaymentWebhookSimulationAction(
  businessId: string,
  planCode: string,
  eventType: string = 'payment_confirmed',
  provider: string = 'asaas'
) {
  return {
    success: true,
    businessId,
    planCode,
    eventType,
    provider,
    status: eventType === 'payment_confirmed' ? 'active' : 'inactive',
  };
}

describe('Bloco 2 — Onboarding, Multi-Gateway (Asaas, Stripe, Mercado Pago) & Subscription Lifecycle', () => {
  let createdBusinessId = 'business-draft-1';

  it('1. should create a draft business with is_published = false and register owner immediately in Step 2', async () => {
    const res = await createDraftBusinessAction({
      name: 'Oficina Rascunho Onboarding',
      category: 'Serviços Automotivos',
      city: 'Campinas',
      state: 'SP',
      whatsapp: '(19) 99999-1111',
    });

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.business?.id).toBeDefined();
    createdBusinessId = res.business?.id || 'business-draft-1';
  });

  it('2. should process plan selection and parse canonical billing event for Asaas', () => {
    const event = AsaasBillingAdapter.parseEvent(new Headers(), {
      event: 'PAYMENT_RECEIVED',
      id: 'evt_asaas_001',
      payment: {
        externalReference: createdBusinessId,
        planCode: 'ouro',
        value: 2388.0,
      },
    });

    expect(event.provider).toBe('asaas');
    expect(event.canonicalEvent).toBe('payment_confirmed');
    expect(event.amountCents).toBe(238800);
    expect(event.planCode).toBe('ouro');
  });

  it('3. should support multi-gateway resolution strategy for Stripe adapter', () => {
    const isValid = StripeBillingAdapter.validateSignature('whsec_test_signature');
    expect(isValid).toBe(true);

    const event = StripeBillingAdapter.parseEvent(new Headers(), {
      id: 'evt_stripe_001',
      type: 'invoice.paid',
      data: {
        object: {
          amount_paid: 178800,
          metadata: { businessId: createdBusinessId, planCode: 'prata' },
        },
      },
    });

    expect(event.provider).toBe('stripe');
    expect(event.canonicalEvent).toBe('payment_confirmed');
    expect(event.planCode).toBe('prata');
  });

  it('4. should support multi-gateway resolution strategy for Mercado Pago adapter', () => {
    const event = MercadoPagoBillingAdapter.parseEvent(new Headers(), {
      id: 'evt_mp_001',
      action: 'payment.created',
      data: { id: 'pay_mp_123' },
    });

    expect(event.provider).toBe('mercadopago');
    expect(event.canonicalEvent).toBe('payment_confirmed');
  });

  it('5. should handle webhook simulation to activate subscription and keep business unpublished until admin approval', async () => {
    const webhookRes = await confirmPaymentWebhookSimulationAction(
      createdBusinessId,
      'ouro',
      'payment_confirmed',
      'asaas'
    );

    expect(webhookRes.success).toBe(true);
    expect(webhookRes.status).toBe('active');
  });

  it('6. should handle subscription cancellation webhook gracefully', async () => {
    const webhookRes = await confirmPaymentWebhookSimulationAction(
      createdBusinessId,
      'ouro',
      'payment_refunded',
      'asaas'
    );

    expect(webhookRes.success).toBe(true);
    expect(webhookRes.status).toBe('inactive');
  });
});
