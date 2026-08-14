import { describe, expect, it } from 'vitest';
import {
  hasBusinessEntitlement,
  resolveEffectiveBusinessPlan,
} from '../src/lib/business/effective-business-plan';

describe('resolveEffectiveBusinessPlan', () => {
  it('does not turn an inactive paid tier into Bronze', () => {
    expect(
      resolveEffectiveBusinessPlan({
        configuredTier: 'ouro',
        subscriptionStatus: 'expired',
        subscriptionTier: 'ouro',
      }),
    ).toMatchObject({
      configuredTier: 'ouro',
      subscriptionStatus: 'expired',
      effectiveTier: null,
    });
  });

  it('does not authorize presentation from businesses.plan_tier alone', () => {
    expect(resolveEffectiveBusinessPlan({ configuredTier: 'prata' }).effectiveTier).toBeNull();
  });

  it('accepts a tier only when the subscription is active', () => {
    expect(
      resolveEffectiveBusinessPlan({
        configuredTier: 'ouro',
        subscriptionStatus: 'active',
        subscriptionTier: 'ouro',
        entitlements: { featured_listing: true, gallery_limit: 5 },
      }),
    ).toMatchObject({
      effectiveTier: 'ouro',
      entitlements: { featured_listing: true, gallery_limit: 5 },
    });
  });

  it('requires a positive entitlement value', () => {
    const plan = resolveEffectiveBusinessPlan({
      configuredTier: 'bronze',
      subscriptionStatus: 'active',
      subscriptionTier: 'bronze',
      entitlements: { enabled: true, disabled: false, quota: 2, empty: 0 },
    });

    expect(hasBusinessEntitlement(plan, 'enabled')).toBe(true);
    expect(hasBusinessEntitlement(plan, 'quota')).toBe(true);
    expect(hasBusinessEntitlement(plan, 'disabled')).toBe(false);
    expect(hasBusinessEntitlement(plan, 'empty')).toBe(false);
  });
});
