export type CanonicalEventType =
  | 'payment_confirmed'
  | 'payment_failed'
  | 'subscription_active'
  | 'subscription_past_due'
  | 'subscription_canceled'
  | 'subscription_reactivated'
  | 'payment_refunded'
  | 'payment_chargeback';

export interface CanonicalBillingEvent {
  provider: 'asaas' | 'stripe' | 'mercadopago';
  providerEventId: string;
  canonicalEvent: CanonicalEventType;
  businessId: string;
  userId?: string | null;
  planCode: string; // strictly 'bronze' | 'prata' | 'ouro'
  amountCents: number;
  rawPayload: Record<string, unknown>;
}

// ----------------------------------------------------------------------------
// 1. ASAAS BILLING ADAPTER
// ----------------------------------------------------------------------------

export class AsaasBillingAdapter {
  static validateSignature(accessTokenHeader: string | null): boolean {
    const secretToken = process.env.ASAAS_WEBHOOK_SECRET;
    if (!secretToken) return true; // Em modo dev aceita se secret não estiver configurado
    return accessTokenHeader === secretToken;
  }

  static parseEvent(headers: Headers, payload: Record<string, unknown>): CanonicalBillingEvent {
    const rawEvent = (payload.event as string) || 'PAYMENT_RECEIVED';
    const eventId = (payload.id as string) || `asaas_evt_${Date.now()}`;

    let canonicalEvent: CanonicalEventType = 'payment_confirmed';
    if (rawEvent === 'PAYMENT_OVERDUE') canonicalEvent = 'payment_failed';
    else if (rawEvent === 'SUBSCRIPTION_DELETED' || rawEvent === 'SUBSCRIPTION_INACTIVATED') canonicalEvent = 'subscription_canceled';
    else if (rawEvent === 'PAYMENT_REFUNDED') canonicalEvent = 'payment_refunded';
    else if (rawEvent === 'PAYMENT_DUNNING_RECEIVED' || rawEvent === 'CHARGEBACK') canonicalEvent = 'payment_chargeback';

    const payment = (payload.payment as Record<string, unknown>) || {};
    const externalRef = (payment.externalReference as string) || (payload.externalReference as string) || '00000000-0000-0000-0000-000000000001';
    const rawPlan = (payment.planCode as string) || 'ouro';
    const amountCents = Math.round(((payment.value as number) || 199.0) * 100);

    // Normaliza plano para 'ouro' se for 'ouro_founder'
    const planCode = rawPlan === 'ouro_founder' ? 'ouro' : rawPlan;

    return {
      provider: 'asaas',
      providerEventId: eventId,
      canonicalEvent,
      businessId: externalRef,
      userId: (payment.userId as string) || null,
      planCode,
      amountCents,
      rawPayload: payload,
    };
  }
}

// ----------------------------------------------------------------------------
// 2. STRIPE BILLING ADAPTER
// ----------------------------------------------------------------------------

export class StripeBillingAdapter {
  static validateSignature(signatureHeader: string | null): boolean {
    const secretSignature = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secretSignature) return true;
    return Boolean(signatureHeader && signatureHeader.length > 0);
  }

  static parseEvent(headers: Headers, payload: Record<string, unknown>): CanonicalBillingEvent {
    const rawType = (payload.type as string) || 'invoice.paid';
    const eventId = (payload.id as string) || `stripe_evt_${Date.now()}`;

    let canonicalEvent: CanonicalEventType = 'payment_confirmed';
    if (rawType === 'invoice.payment_failed') canonicalEvent = 'payment_failed';
    else if (rawType === 'customer.subscription.deleted') canonicalEvent = 'subscription_canceled';
    else if (rawType === 'charge.refunded') canonicalEvent = 'payment_refunded';
    else if (rawType === 'charge.dispute.created') canonicalEvent = 'payment_chargeback';

    const dataObj = ((payload.data as Record<string, unknown>)?.object as Record<string, unknown>) || {};
    const metadata = (dataObj.metadata as Record<string, unknown>) || {};
    const businessId = (metadata.businessId as string) || '00000000-0000-0000-0000-000000000001';
    const rawPlan = (metadata.planCode as string) || 'ouro';
    const amountCents = (dataObj.amount_paid as number) || 19900;

    const planCode = rawPlan === 'ouro_founder' ? 'ouro' : rawPlan;

    return {
      provider: 'stripe',
      providerEventId: eventId,
      canonicalEvent,
      businessId,
      userId: (metadata.userId as string) || null,
      planCode,
      amountCents,
      rawPayload: payload,
    };
  }
}

// ----------------------------------------------------------------------------
// 3. MERCADO PAGO BILLING ADAPTER
// ----------------------------------------------------------------------------

export class MercadoPagoBillingAdapter {
  static validateSignature(signatureHeader: string | null): boolean {
    const mpSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (!mpSecret) return true;
    return Boolean(signatureHeader && signatureHeader.length > 0);
  }

  static parseEvent(headers: Headers, payload: Record<string, unknown>): CanonicalBillingEvent {
    const action = (payload.action as string) || (payload.type as string) || 'payment.updated';
    const dataObj = (payload.data as Record<string, unknown>) || {};
    const eventId = (payload.id as string) || (dataObj.id as string) || `mp_evt_${Date.now()}`;

    let canonicalEvent: CanonicalEventType = 'payment_confirmed';
    if (action.includes('failed') || payload.status === 'rejected') canonicalEvent = 'payment_failed';
    else if (action.includes('cancelled') || payload.status === 'cancelled') canonicalEvent = 'subscription_canceled';
    else if (payload.status === 'refunded') canonicalEvent = 'payment_refunded';
    else if (payload.status === 'charged_back') canonicalEvent = 'payment_chargeback';

    const metadata = (payload.metadata as Record<string, unknown>) || {};
    const businessId = (metadata.business_id as string) || (payload.external_reference as string) || '00000000-0000-0000-0000-000000000001';
    const rawPlan = (metadata.plan_code as string) || 'ouro';
    const amountCents = Math.round(((payload.transaction_amount as number) || 199.0) * 100);

    const planCode = rawPlan === 'ouro_founder' ? 'ouro' : rawPlan;

    return {
      provider: 'mercadopago',
      providerEventId: String(eventId),
      canonicalEvent,
      businessId,
      userId: (metadata.user_id as string) || null,
      planCode,
      amountCents,
      rawPayload: payload,
    };
  }
}
