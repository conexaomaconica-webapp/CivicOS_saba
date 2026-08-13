import type { PlanTier, BillingCycle } from '@/lib/billing/plans-service';

export const PLAN_DRAFT_KEY = 'civicos_onboarding_plan_draft';

export interface PlanDraft {
  planId: string;
  tier: PlanTier;
  tierName: string;
  billingCycle: BillingCycle;
  price: number;
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
    storage.setItem(PLAN_DRAFT_KEY, JSON.stringify(fullDraft));
    return fullDraft;
  } catch {
    return null;
  }
}

export function loadPlanDraft(customStorage?: StorageLike): PlanDraft | null {
  const storage = resolveStorage(customStorage);
  if (!storage) return null;

  try {
    const raw = storage.getItem(PLAN_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanDraft>;

    if (
      typeof parsed.planId === 'string' &&
      typeof parsed.tier === 'string' &&
      typeof parsed.price === 'number' &&
      (parsed.billingCycle === 'annual' || parsed.billingCycle === 'monthly')
    ) {
      return parsed as PlanDraft;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearPlanDraft(customStorage?: StorageLike): void {
  const storage = resolveStorage(customStorage);
  if (storage) {
    storage.removeItem(PLAN_DRAFT_KEY);
  }
}
