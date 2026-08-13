import type { ResponsibleRelationship } from '@/lib/onboarding/onboarding-validation';

// ---------------------------------------------------------------------------
// ADV-001 — responsible-account wizard persistence. Local first; the draft is
// consumed by ADV-002 (business data) to bind the advertiser as owner.
// ---------------------------------------------------------------------------

export const RESPONSIBLE_DRAFT_KEY = 'adverter_onboarding_responsible';

export interface ResponsibleDraft {
  name: string;
  email: string;
  relationship: ResponsibleRelationship;
  savedAt: string;
}

export interface ResponsiveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function getStorage(): ResponsiveStorage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function saveResponsibleDraft(
  draft: Omit<ResponsibleDraft, 'savedAt'>,
  storage: ResponsiveStorage | null = getStorage(),
): ResponsibleDraft | null {
  if (!storage) return null;
  const persisted: ResponsibleDraft = { ...draft, savedAt: new Date().toISOString() };
  storage.setItem(RESPONSIBLE_DRAFT_KEY, JSON.stringify(persisted));
  return persisted;
}

export function loadResponsibleDraft(storage: ResponsiveStorage | null = getStorage()): ResponsibleDraft | null {
  if (!storage) return null;
  const raw = storage.getItem(RESPONSIBLE_DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ResponsibleDraft>;
    if (
      typeof parsed.name === 'string' &&
      typeof parsed.email === 'string' &&
      (parsed.relationship === 'owner' || parsed.relationship === 'representative')
    ) {
      return parsed as ResponsibleDraft;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearResponsibleDraft(storage: ResponsiveStorage | null = getStorage()): void {
  if (!storage) return;
  storage.removeItem(RESPONSIBLE_DRAFT_KEY);
}