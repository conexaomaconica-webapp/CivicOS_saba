'use client';

import { ReactNode, useMemo } from 'react';
import { KernelProvider } from '@saas/app-sdk';
import { NextRuntime } from '../runtime/next-runtime';

export function Providers({ children }: { children: ReactNode }) {
  // We use useMemo to ensure the runtime is only created once per client
  const runtime = useMemo(() => new NextRuntime(), []);

  return (
    <KernelProvider runtime={runtime}>
      {children}
    </KernelProvider>
  );
}
