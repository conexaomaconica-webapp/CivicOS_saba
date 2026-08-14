import type { PlanTier, BillingCycle } from '@/lib/billing/plans-service';

export function buildPlanDraftKey(tenantId: string, userId: string): string {
  return `civicos_plan_draft_${tenantId}_${userId}`;
}

export interface PlanDraft {
  tenantId: string;
  userId: string;
  planId: string;
  tier: PlanTier;
  tierName: string;
  billingCycle: BillingCycle;
  originalPriceCents: number;
  discountCents: number;
  finalPriceCents: number;
  couponCode?: string;
  badgeOffer?: string;
  savedAt: string;
}

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function resolveStorage(customStorage?: StorageLike): StorageLike | null {
  if (customStorage) return customStorage;
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

export function savePlanDraft(
  draft: Omit<PlanDraft, 'savedAt'>,
  customStorage?: StorageLike
): PlanDraft | null {
  const storage = resolveStorage(customStorage);
  if (!storage) return null;

  const fullDraft: PlanDraft = {
    ...draft,
    savedAt: new Date().toISOString(),
  };

  try {
    const key = buildPlanDraftKey(draft.tenantId, draft.userId);
    storage.setItem(key, JSON.stringify(fullDraft));
    return fullDraft;
  } catch {
    return null;
  }
}

export function loadPlanDraft(
  tenantId: string = 'default',
  userId: string = 'anonymous',
  customStorage?: StorageLike
): PlanDraft | null {
  const storage = resolveStorage(customStorage);
  if (!storage) return null;

  try {
    const key = buildPlanDraftKey(tenantId, userId);
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanDraft>;

    if (
      typeof parsed.planId === 'string' &&
      typeof parsed.tier === 'string' &&
      typeof parsed.finalPriceCents === 'number' &&
      (parsed.billingCycle === 'annual' || parsed.billingCycle === 'monthly')
    ) {
      return parsed as PlanDraft;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPlanDraft(
  tenantId: string = 'default',
  userId: string = 'anonymous',
  customStorage?: StorageLike
): void {
  const storage = resolveStorage(customStorage);
  if (storage) {
    const key = buildPlanDraftKey(tenantId, userId);
    storage.removeItem(key);
  }
}
