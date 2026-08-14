import type { BillingCycle, PlanTier } from './plans-service';

export interface CouponValidationResult {
  valid: false;
  code: string;
  errorCode: 'UNAVAILABLE';
  errorMessage: string;
  discountCents: 0;
  badgeOffer?: undefined;
  tagline?: undefined;
}

/**
 * Fase 1 containment.
 *
 * Coupon authority belongs to persisted, tenant-scoped campaign/coupon data.
 * No local promotional code may grant a discount, founder recognition, or a
 * locked price.
 */
export function validateCoupon(
  codeInput: string,
  tier: PlanTier,
  billingCycle: BillingCycle,
  originalPriceCents: number,
): CouponValidationResult {
  void tier;
  void billingCycle;
  void originalPriceCents;

  return {
    valid: false,
    code: codeInput.trim().toUpperCase(),
    errorCode: 'UNAVAILABLE',
    errorMessage:
      'A validação de cupons está temporariamente indisponível até a integração com o catálogo oficial.',
    discountCents: 0,
  };
}
