export type BusinessPlanTier = 'bronze' | 'prata' | 'ouro';

export type EffectiveBusinessPlan = {
  configuredTier: BusinessPlanTier;
  subscriptionStatus: string | null;
  effectiveTier: BusinessPlanTier | null;
  entitlements: Record<string, boolean | number>;
};

type ResolveEffectiveBusinessPlanInput = {
  configuredTier: string | null | undefined;
  subscriptionStatus?: string | null;
  subscriptionTier?: string | null;
  entitlements?: Record<string, boolean | number> | null;
};

const isTier = (value: string | null | undefined): value is BusinessPlanTier =>
  value === 'bronze' || value === 'prata' || value === 'ouro';

/**
 * Resolves presentation authority without inventing a commercial downgrade.
 * Only an active subscription can currently establish an effective tier.
 * Tenant-specific grace/suspension rules belong in the future server resolver.
 */
export function resolveEffectiveBusinessPlan({
  configuredTier,
  subscriptionStatus = null,
  subscriptionTier = null,
  entitlements = {},
}: ResolveEffectiveBusinessPlanInput): EffectiveBusinessPlan {
  const safeConfiguredTier = isTier(configuredTier) ? configuredTier : 'bronze';
  const effectiveTier =
    subscriptionStatus === 'active' && isTier(subscriptionTier)
      ? subscriptionTier
      : null;

  return {
    configuredTier: safeConfiguredTier,
    subscriptionStatus,
    effectiveTier,
    entitlements: { ...entitlements },
  };
}

export function hasBusinessEntitlement(
  plan: EffectiveBusinessPlan,
  code: string,
): boolean {
  const value = plan.entitlements[code];
  return value === true || (typeof value === 'number' && value > 0);
}
