'use client';

import React from 'react';
import { useBoot } from '@/app/Providers';
import { webComponentRegistry } from '../../runtime/web-component-registry';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export function PluginRouteRenderer({ pathname }: { pathname: string }) {
  const boot = useBoot();
  const snapshot = boot?.defaultSnapshot ?? null;
  if (!snapshot && !boot?.error) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (boot?.error) {
    notFound();
  }

  if (!snapshot) {
    notFound();
  }

  const routeInfo = snapshot.routes.find((route) => route.path === pathname);

  if (!routeInfo?.componentId) {
    notFound();
  }

  const Component = webComponentRegistry[routeInfo.componentId];
  if (!Component) {
    return (
      <div className="p-4 rounded-md bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border border-[var(--status-danger-border)]">
        Componente não suportado ou não registrado: {routeInfo.componentId}
      </div>
    );
  }

  return <Component {...(routeInfo.props || {})} />;
}
