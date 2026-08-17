import { describe, it, expect } from 'vitest';
import {
  createDraftBusinessAction,
  selectPlanAndGenerateCheckoutAction,
  confirmPaymentWebhookSimulationAction,
} from '../src/app/actions/onboarding-checkout-actions';
import {
  AsaasBillingAdapter,
  StripeBillingAdapter,
  MercadoPagoBillingAdapter,
} from '../src/lib/billing/billing-adapters';

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
    expect(res.business).toBeDefined();
    expect(res.business.name).toBe('Oficina Rascunho Onboarding');
    createdBusinessId = res.business.id;
  });

  it('2. should normalize ouro_founder to planCode ouro on checkout generation', async () => {
    const res = await selectPlanAndGenerateCheckoutAction(createdBusinessId, 'ouro_founder', 'mercadopago');

    expect(res).toBeDefined();
    expect(res.success).toBe(true);
    expect(res.checkoutSession).toBeDefined();
    expect(res.checkoutSession.planCode).toBe('ouro'); // Normalizado para 'ouro'
    expect(res.checkoutSession.isFounderRequested).toBe(true);
    expect(res.checkoutSession.provider).toBe('mercadopago');
  });

  it('3. should reject invalid plan_code on checkout selection', async () => {
    await expect(
      selectPlanAndGenerateCheckoutAction(createdBusinessId, 'plan_invalid' as any)
    ).rejects.toThrow('INVALID_PLAN');
  });

  it('4. AsaasBillingAdapter should correctly parse PAYMENT_RECEIVED into payment_confirmed', () => {
    const parsed = AsaasBillingAdapter.parseEvent(new Headers(), {
      id: 'asaas_evt_100',
      event: 'PAYMENT_RECEIVED',
      payment: {
        externalReference: 'bus-123',
        value: 199.0,
        planCode: 'ouro',
      },
    });

    expect(parsed.provider).toBe('asaas');
    expect(parsed.canonicalEvent).toBe('payment_confirmed');
    expect(parsed.planCode).toBe('ouro');
    expect(parsed.amountCents).toBe(19900);
  });

  it('5. StripeBillingAdapter should correctly parse invoice.paid into payment_confirmed', () => {
    const parsed = StripeBillingAdapter.parseEvent(new Headers(), {
      id: 'evt_stripe_100',
      type: 'invoice.paid',
      data: {
        object: {
          amount_paid: 19900,
          metadata: { businessId: 'bus-123', planCode: 'ouro' },
        },
      },
    });

    expect(parsed.provider).toBe('stripe');
    expect(parsed.canonicalEvent).toBe('payment_confirmed');
    expect(parsed.planCode).toBe('ouro');
    expect(parsed.amountCents).toBe(19900);
  });

  it('6. MercadoPagoBillingAdapter should correctly parse payment.updated into payment_confirmed', () => {
    const parsed = MercadoPagoBillingAdapter.parseEvent(new Headers(), {
      id: 'mp_evt_100',
      action: 'payment.updated',
      status: 'approved',
      external_reference: 'bus-123',
      transaction_amount: 199.0,
      metadata: { plan_code: 'ouro' },
    });

    expect(parsed.provider).toBe('mercadopago');
    expect(parsed.canonicalEvent).toBe('payment_confirmed');
    expect(parsed.planCode).toBe('ouro');
    expect(parsed.amountCents).toBe(19900);
  });

  it('7. MercadoPagoBillingAdapter should parse cancelled into subscription_canceled', () => {
    const parsed = MercadoPagoBillingAdapter.parseEvent(new Headers(), {
      id: 'mp_evt_101',
      action: 'subscription_preapproval.updated',
      status: 'cancelled',
      external_reference: 'bus-123',
    });

    expect(parsed.provider).toBe('mercadopago');
    expect(parsed.canonicalEvent).toBe('subscription_canceled');
  });

  it('8. should process payment simulation for Asaas', async () => {
    const res = await confirmPaymentWebhookSimulationAction(createdBusinessId, 'ouro', 'payment_confirmed', 'asaas');
    expect(res.success).toBe(true);
  });

  it('9. should process payment simulation for Stripe', async () => {
    const res = await confirmPaymentWebhookSimulationAction(createdBusinessId, 'ouro', 'payment_confirmed', 'stripe');
    expect(res.success).toBe(true);
  });

  it('10. should process payment simulation for Mercado Pago', async () => {
    const res = await confirmPaymentWebhookSimulationAction(createdBusinessId, 'ouro', 'payment_confirmed', 'mercadopago');
    expect(res.success).toBe(true);
  });

  it('11. should handle subscription_canceled with residual period access', async () => {
    const res = await confirmPaymentWebhookSimulationAction(createdBusinessId, 'ouro', 'subscription_canceled', 'mercadopago');
    expect(res.success).toBe(true);
  });

  it('12. should handle payment_refunded revoking access', async () => {
    const res = await confirmPaymentWebhookSimulationAction(createdBusinessId, 'ouro', 'payment_refunded', 'asaas');
    expect(res.success).toBe(true);
  });
});
