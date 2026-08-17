'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { useBoot } from '@/app/Providers';
import { NavigationSnapshot } from '@saas/sdk';
import { NavigationRenderer } from '../navigation/NavigationRenderer';
import { ContextHeader } from '../layout/Header';

interface ShellWrapperProps {
  children: React.ReactNode;
}

export function ShellWrapper({ children }: ShellWrapperProps) {
  const pathname = usePathname();
  const isDesignLab = pathname?.startsWith('/design-lab');

  const boot = useBoot();
  const snapshot = boot?.defaultSnapshot ?? null;

  // If rendering inside Design Lab or without navigation snapshot, render children directly
  if (isDesignLab || !snapshot) {
    return <div className="min-h-screen bg-slate-50">{children}</div>;
  }

  if (boot?.error) {
    return (
      <div className="flex h-screen w-full items-center justify-center text-[var(--color-error-500)]">
        Error loading CivicOS: {boot.error}
      </div>
    );
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
  };

  return (
    <NavigationRenderer navigation={navSnapshot} contextHeader={contextHeader}>
      {children}
    </NavigationRenderer>
  );
}
