'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useKernelSafe } from '@saas/app-sdk';
import { PresentationSnapshot, NavigationSnapshot } from '@saas/sdk';
import { NavigationRenderer } from '../navigation/NavigationRenderer';
import { ContextHeader } from '../layout/Header';
import { Skeleton } from '@/components/ui/skeleton';

interface ShellWrapperProps {
  children: React.ReactNode;
}

export function ShellWrapper({ children }: ShellWrapperProps) {
  const pathname = usePathname();
  const isDesignLab = pathname?.startsWith('/design-lab');

  const { kernel, isLoading, error } = useKernelSafe();
  const [snapshot, setSnapshot] = useState<PresentationSnapshot | null>(null);

  // If rendering inside Design Lab, bypass product shell completely
  if (isDesignLab) {
    return <>{children}</>;
  }

  useEffect(() => {
    if (kernel) {
      // Create a default session/permissions context using core presentation API
      const defaultSnapshot = kernel.presentation().snapshot({
        tenantId: 'default',
        userId: 'anonymous',
        locale: 'pt-BR',
        capabilities: [],
        permissions: [],
        versions: {
          registryVersion: 1,
          capabilityVersion: 1,
          licenseVersion: 1,
          permissionVersion: 1,
          policyVersion: 1,
          layoutVersion: 1
        }
      });
      setSnapshot(defaultSnapshot);
    }
  }, [kernel]);

  if (isLoading || (!snapshot && !error)) {
    return (
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        {/* Fake Sidebar (Desktop) */}
        <aside className="hidden w-64 flex-col border-r border-border bg-card p-4 md:flex shrink-0">
          <div className="flex h-12 items-center px-2 mb-6 gap-2 border-b border-border/40 pb-4">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-3 w-16 ml-2 mb-3" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 ml-2 mb-3" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          </div>
        </aside>

        {/* Fake Main View */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Fake Header */}
          <header className="flex h-16 w-full items-center justify-between border-b border-border px-4 md:px-6">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="h-6 w-px bg-border mx-1" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </header>
          
          {/* Fake Main Content */}
          <main className="flex-1 overflow-auto p-4 md:p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-[280px] md:col-span-2 rounded-xl" />
              <Skeleton className="h-[280px] rounded-xl" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-destructive">
        Error loading CivicOS: {error.message}
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  // Mapeia do PresentationSnapshot (Core, com .route) para NavigationSnapshot (SDK/Web, com .path e groups)
  const mappedItems = snapshot.navigation.map(item => ({
    id: item.id,
    label: item.label,
    path: item.route || '',
    capability: item.capability,
    permissions: item.permission ? [item.permission] : [],
    icon: item.icon,
    placement: item.placement,
    order: item.order,
    children: item.children?.map(child => ({
      id: child.id,
      label: child.label,
      path: child.route || '',
      capability: child.capability,
      permissions: child.permission ? [child.permission] : [],
      icon: child.icon,
      placement: child.placement,
      order: child.order,
    }))
  }));

  const navSnapshot: NavigationSnapshot = {
    groups: [
      {
        id: 'main',
        label: 'Navegação',
        items: mappedItems
      }
    ]
  };

  // Placeholder context until we have page-specific contexts
  const contextHeader: ContextHeader = {
    title: 'CivicOS',
    community: 'Comunidade Default'
  };

  return (
    <NavigationRenderer navigation={navSnapshot} contextHeader={contextHeader}>
      {children}
    </NavigationRenderer>
  );
}
