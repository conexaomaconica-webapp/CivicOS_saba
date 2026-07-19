// ============================================================================
// Billing Contract — Core Kernel
// ============================================================================
// Defines subscription plans, status tracking, payment, and commission limits.
// All modules consume these abstractions to query active tiers or trigger
// transactions.
// ============================================================================

export interface Subscription {
  readonly tenantId: string;
  readonly planId: string;
  readonly status: 'active' | 'past_due' | 'canceled' | 'trialing';
  readonly currentPeriodStart: Date;
  readonly currentPeriodEnd: Date; // For annual plans, capped at December 31
  readonly limits: Record<string, number>;
  readonly metadata: Record<string, unknown>;
}

export interface PaymentDetails {
  readonly id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: 'pending' | 'succeeded' | 'failed';
  readonly method: 'pix' | 'credit_card';
  readonly checkoutUrl?: string;
  readonly qrCode?: string; // For PIX payments
  readonly qrCodeCopyPaste?: string;
}

export interface CommissionDetails {
  readonly referrerId: string;
  readonly tenantId: string;
  readonly saleAmount: number;
  readonly percentage: number;
  readonly calculatedAmount: number;
}

export interface BillingService {
  /** Get current subscription for a tenant. */
  getSubscription(tenantId: string): Promise<Subscription | null>;

  /** Create a payment checkout session. */
  createCheckout(
    tenantId: string,
    planId: string,
    paymentMethod: 'pix' | 'credit_card',
  ): Promise<PaymentDetails>;

  /** Calculate pro-rata adjustment when upgrading or downgrading. */
  calculateProRata(
    tenantId: string,
    newPlanId: string,
  ): Promise<{ creditAmount: number; chargingAmount: number }>;

  /** Processes and issues a commission to a referrer. */
  processCommission(details: CommissionDetails): Promise<void>;

  /** Helper to adjust the expiration of annual plans to expire on Dec 31. */
  calculateAnnualExpiration(startDate: Date): Date;
}
