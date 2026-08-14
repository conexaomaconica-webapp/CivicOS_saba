import type { ResponsibleRelationship } from '@/lib/onboarding/onboarding-validation';
import type { MasonicStatus } from '@/lib/masonic/masonic-affiliation';

// ---------------------------------------------------------------------------
// ADV-001 — responsible-account wizard persistence. Local first; the draft is
// consumed by ADV-002 (business data) to bind the advertiser as owner.
// ---------------------------------------------------------------------------

export const RESPONSIBLE_DRAFT_KEY = 'adverter_onboarding_responsible';

export interface MasonicDraft {
  status: MasonicStatus;
  isActive: boolean;
  cimbCode: string;
  lodgeName: string;
  chapterName: string;
  spouseMasonName: string;
  masonicConsent: boolean;
}

export interface ResponsibleDraft {
  name: string;
  email: string;
  relationship: ResponsibleRelationship;
  masonic?: MasonicDraft | null;
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

function parseMasonic(raw: unknown): MasonicDraft | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  const isStatus = (v: unknown): v is MasonicStatus =>
    typeof v === 'string' &&
    ['mason', 'mason_wife', 'demolay', 'job_daughter', 'none'].includes(v);
  if (!isStatus(m.status)) return null;
  return {
    status: m.status,
    isActive: m.isActive === true,
    cimbCode: typeof m.cimbCode === 'string' ? m.cimbCode : '',
    lodgeName: typeof m.lodgeName === 'string' ? m.lodgeName : '',
    chapterName: typeof m.chapterName === 'string' ? m.chapterName : '',
    spouseMasonName: typeof m.spouseMasonName === 'string' ? m.spouseMasonName : '',
    masonicConsent: m.masonicConsent === true,
  };
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
      return {
        name: parsed.name,
        email: parsed.email,
        relationship: parsed.relationship,
        masonic: parsed.masonic ? parseMasonic(parsed.masonic) : null,
      } as ResponsibleDraft;
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