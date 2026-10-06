'use client';

import { useCallback, useEffect, useRef } from 'react';
import { trackSearchImpressionsAction } from '@/lib/analytics/analytics-service';

const SEEN_KEY = 'cm_seen_impressions_v1';
const FLUSH_MS = 2000;

const seen = new Set<string>();
let queue: string[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let loaded = false;

function loadSeen() {
  if (loaded) return;
  loaded = true;
  try {
    const raw = window.sessionStorage.getItem(SEEN_KEY);
    if (raw) (JSON.parse(raw) as string[]).forEach((id) => seen.add(id));
  } catch {
    // sessionStorage indisponível: deduplica só em memória
  }
}

function persistSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(seen).slice(-500)));
  } catch {
    // ignore
  }
}

function flush() {
  timer = null;
  const batch = queue;
  queue = [];
  if (batch.length > 0) void trackSearchImpressionsAction(batch);
}

function enqueue(businessId: string) {
  loadSeen();
  if (seen.has(businessId)) return;
  seen.add(businessId);
  persistSeen();
  queue.push(businessId);
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

/** Registra uma aparição por empresa por sessão, quando ao menos metade do card fica visível. */
export function useSearchImpression<T extends HTMLElement>(businessId: string) {
  const elRef = useRef<T | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const ref = useCallback(
    (node: T | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      elRef.current = node;
      if (!node || typeof IntersectionObserver === 'undefined') return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            enqueue(businessId);
            observer.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    [businessId]
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return ref;
}
