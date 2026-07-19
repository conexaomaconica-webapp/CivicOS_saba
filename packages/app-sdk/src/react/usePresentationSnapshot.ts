import { useMemo } from 'react';
import type { PresentationContext, PresentationSnapshot } from '@saas/core';
import { useKernel } from './KernelProvider';

/**
 * Hook to retrieve the current Presentation Snapshot based on a given context.
 * Useful for rendering dynamic navigation, routes, widgets, etc.
 * 
 * Note: `useKernel` will throw if Kernel is not yet loaded. Ensure this hook is 
 * used within a component tree that is suspended/fallback while loading.
 */
export function usePresentationSnapshot(context: PresentationContext): PresentationSnapshot {
  const kernel = useKernel();
  
  // Memoize the snapshot to avoid re-evaluating on every render if context hasn't changed deeply
  // Since context is an object, consumers should useMemo on it, or we JSON.stringify it for stable deps
  const snapshot = useMemo(() => {
    return kernel.presentation().snapshot(context);
  }, [
    kernel, 
    context.tenantId, 
    context.userId, 
    context.locale, 
    // Safely memoize array contents (assuming small, stable arrays)
    context.permissions?.join(','), 
    context.capabilities?.join(',')
  ]);

  return snapshot;
}
