'use client';

import React from 'react';
import { NavigationSnapshot } from '@saas/sdk';
import { AppShell } from '../shell/AppShell';
import { ContextHeader } from '../layout/Header';
import { usePathname } from 'next/navigation';

export interface NavigationRendererProps {
  navigation: NavigationSnapshot;
  contextHeader?: ContextHeader;
  children: React.ReactNode;
}

/**
 * NavigationRenderer receives the deterministic NavigationSnapshot from the Kernel.
 * It is completely unaware of plugins, capabilities, or permissions.
 * Its sole responsibility is to map the snapshot to the UI shell.
 */
export function NavigationRenderer({ navigation, contextHeader, children }: NavigationRendererProps) {
  const pathname = usePathname();

  return (
    <AppShell navigation={navigation} activePath={pathname} contextHeader={contextHeader}>
      {children}
    </AppShell>
  );
}
