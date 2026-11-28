'use client';

import { useEffect, useState } from 'react';

export interface LiveViewCacheEntry {
  viewsCount: number;
  /** Timestamp oficial de confirmação (do servidor ou do instante da resposta HTTP). */
  serverTimestamp: number;
  /** Timestamp local em que o registro foi salvo no cache (para controle de TTL). */
  cachedAt: number;
}

const STORAGE_KEY = 'cm_live_views_store_v1';
/** Tempo de vida do cache local de sessão (10 minutos). */
export const LIVE_VIEWS_CACHE_TTL_MS = 10 * 60 * 1000;

const memoryStore = new Map<string, LiveViewCacheEntry>();
const subscribers = new Map<string, Set<(entry: LiveViewCacheEntry) => void>>();
let storageHydrated = false;
let pageshowListenerAttached = false;

function hydrateFromSessionStorage(): void {
  if (storageHydrated || typeof window === 'undefined') return;
  storageHydrated = true;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, LiveViewCacheEntry>;
    if (!parsed || typeof parsed !== 'object') return;
    const now = Date.now();
    for (const [bizId, entry] of Object.entries(parsed)) {
      if (
        entry &&
        typeof entry.viewsCount === 'number' &&
        Number.isFinite(entry.viewsCount) &&
        typeof entry.serverTimestamp === 'number' &&
        typeof entry.cachedAt === 'number' &&
        now - entry.cachedAt <= LIVE_VIEWS_CACHE_TTL_MS
      ) {
        memoryStore.set(bizId, {
          viewsCount: Math.max(0, Math.trunc(entry.viewsCount)),
          serverTimestamp: entry.serverTimestamp,
          cachedAt: entry.cachedAt,
        });
      }
    }
  } catch {
    // Ignora falha de sessionStorage (ex.: modo privado restrito)
  }
}

function persistToSessionStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    const now = Date.now();
    const serializable: Record<string, LiveViewCacheEntry> = {};
    for (const [bizId, entry] of memoryStore.entries()) {
      if (now - entry.cachedAt <= LIVE_VIEWS_CACHE_TTL_MS) {
        serializable[bizId] = entry;
      } else {
        memoryStore.delete(bizId);
      }
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignora falha de quota
  }
}

function attachGlobalPageshowListener(): void {
  if (pageshowListenerAttached || typeof window === 'undefined') return;
  pageshowListenerAttached = true;
  window.addEventListener('pageshow', () => {
    storageHydrated = false;
    hydrateFromSessionStorage();
    const now = Date.now();
    for (const [bizId, subs] of subscribers.entries()) {
      const entry = memoryStore.get(bizId);
      if (entry && now - entry.cachedAt <= LIVE_VIEWS_CACHE_TTL_MS) {
        for (const cb of subs) {
          cb(entry);
        }
      }
    }
  });
}

/**
 * Registra um valor oficial confirmado pelo backend (`POST /api/analytics/track`).
 *
 * Regras de integridade (Condicionantes 2.4 e 3.3):
 *   - NUNCA usa `Math.max(initialCount, cachedCount)`.
 *   - Controla ordenação temporal por `serverTimestamp`: respostas HTTP atrasadas (fora de ordem)
 *     com `serverTimestamp < existing.serverTimestamp` são descartadas.
 *   - Permite correções legítimas do contador para valores menores sempre que `serverTimestamp >= existing.serverTimestamp`.
 */
export function recordConfirmedServerViewsCount(
  businessId: string,
  viewsCount: number,
  serverTimestamp: number = Date.now()
): boolean {
  if (!businessId || typeof viewsCount !== 'number' || !Number.isFinite(viewsCount)) {
    return false;
  }

  hydrateFromSessionStorage();
  const now = Date.now();
  const existing = memoryStore.get(businessId);

  // Descarta respostas HTTP fora de ordem (mais antigas que a última confirmação válida)
  if (
    existing &&
    now - existing.cachedAt <= LIVE_VIEWS_CACHE_TTL_MS &&
    serverTimestamp < existing.serverTimestamp
  ) {
    return false;
  }

  const nextEntry: LiveViewCacheEntry = {
    viewsCount: Math.max(0, Math.trunc(viewsCount)),
    serverTimestamp,
    cachedAt: now,
  };

  memoryStore.set(businessId, nextEntry);
  persistToSessionStorage();

  const subs = subscribers.get(businessId);
  if (subs && subs.size > 0) {
    for (const cb of subs) {
      cb(nextEntry);
    }
  }

  return true;
}

/**
 * Obtém a entrada válida do cache para uma empresa, respeitando a expiração (TTL).
 */
export function getValidCachedViewsEntry(
  businessId: string | undefined | null,
  now: number = Date.now()
): LiveViewCacheEntry | null {
  if (!businessId) return null;
  hydrateFromSessionStorage();
  const entry = memoryStore.get(businessId);
  if (!entry) return null;
  if (now - entry.cachedAt > LIVE_VIEWS_CACHE_TTL_MS) {
    memoryStore.delete(businessId);
    persistToSessionStorage();
    return null;
  }
  return entry;
}

/**
 * Limpa todo o cache reativo (útil para testes automatizados).
 */
export function clearLiveViewsStoreForTesting(): void {
  memoryStore.clear();
  subscribers.clear();
  storageHydrated = false;
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

/**
 * Subscreve atualizações do contador de uma empresa específica sem criar listeners globais por card.
 */
export function subscribeToBusinessViews(
  businessId: string,
  callback: (entry: LiveViewCacheEntry) => void
): () => void {
  attachGlobalPageshowListener();
  let set = subscribers.get(businessId);
  if (!set) {
    set = new Set();
    subscribers.set(businessId, set);
  }
  set.add(callback);

  return () => {
    const currentSet = subscribers.get(businessId);
    if (currentSet) {
      currentSet.delete(callback);
      if (currentSet.size === 0) {
        subscribers.delete(businessId);
      }
    }
  };
}

/**
 * Retorna a contagem de listeners ativos (para verificação de ausência de memory leaks em testes).
 */
export function getActiveViewsSubscribersCountForTesting(): number {
  let total = 0;
  for (const s of subscribers.values()) {
    total += s.size;
  }
  return total;
}

/**
 * Hook React que sincroniza automaticamente o contador de visualizações de uma empresa
 * após confirmação do backend (`/api/analytics/track`) e ao voltar na navegação (botão Voltar / BFCache).
 */
export function useLiveBusinessViewsCount(
  businessId: string | undefined | null,
  initialCount: number | undefined | null
): number | undefined {
  const normalizedInitial =
    typeof initialCount === 'number' && Number.isFinite(initialCount)
      ? Math.max(0, Math.trunc(initialCount))
      : undefined;

  const [liveCount, setLiveCount] = useState<number | undefined>(() => {
    if (typeof window === 'undefined' || !businessId) return normalizedInitial;
    const cached = getValidCachedViewsEntry(businessId);
    return cached ? cached.viewsCount : normalizedInitial;
  });

  useEffect(() => {
    if (!businessId) {
      setLiveCount(normalizedInitial);
      return;
    }

    const cached = getValidCachedViewsEntry(businessId);
    if (cached) {
      setLiveCount(cached.viewsCount);
    } else {
      setLiveCount(normalizedInitial);
    }

    const unsubscribe = subscribeToBusinessViews(businessId, (entry) => {
      setLiveCount(entry.viewsCount);
    });

    return unsubscribe;
  }, [businessId, normalizedInitial]);

  return liveCount;
}

