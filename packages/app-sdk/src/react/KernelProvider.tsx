// ============================================================================
// Kernel Provider — CivicOS App SDK
// ============================================================================

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { CivicOSInstance, HostRuntime } from '@saas/core';

interface KernelContextValue {
  kernel: CivicOSInstance | null;
  error: Error | null;
  isLoading: boolean;
}

const KernelContext = createContext<KernelContextValue>({
  kernel: null,
  error: null,
  isLoading: true,
});

export interface KernelProviderProps {
  runtime: HostRuntime;
  children: ReactNode;
}

export function KernelProvider({ runtime, children }: KernelProviderProps) {
  const [state, setState] = useState<KernelContextValue>({
    kernel: null,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    async function initializeKernel() {
      try {
        const kernel = await runtime.getKernel();
        if (mounted) {
          setState({ kernel, error: null, isLoading: false });
        }
      } catch (err) {
        if (mounted) {
          setState({ kernel: null, error: err as Error, isLoading: false });
        }
      }
    }

    initializeKernel();

    return () => {
      mounted = false;
    };
  }, [runtime]);

  return (
    <KernelContext.Provider value={state}>
      {children}
    </KernelContext.Provider>
  );
}

/**
 * Hook to access the CivicOS Kernel instance.
 * Throws an error if used outside of KernelProvider or if Kernel is not loaded yet.
 * For safe access during loading, use `useKernelSafe`.
 */
export function useKernel(): CivicOSInstance {
  const context = useContext(KernelContext);
  if (context.isLoading) {
    throw new Error('CivicOS Kernel is still loading.');
  }
  if (context.error) {
    throw context.error;
  }
  if (!context.kernel) {
    throw new Error('useKernel must be used within a KernelProvider');
  }
  return context.kernel;
}

export function useKernelSafe(): KernelContextValue {
  return useContext(KernelContext);
}
