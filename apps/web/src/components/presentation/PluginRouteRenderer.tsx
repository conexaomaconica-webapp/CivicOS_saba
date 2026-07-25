'use client';

import React, { useEffect, useState } from 'react';
import { useKernelSafe } from '@saas/app-sdk';
import { webComponentRegistry } from '../../runtime/web-component-registry';
import { notFound } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

export function PluginRouteRenderer({ pathname }: { pathname: string }) {
  const { kernel, isLoading } = useKernelSafe();
  const [routeInfo, setRouteInfo] = useState<{ componentId: string; props: Record<string, unknown> } | null>(null);
  const [routeNotFound, setRouteNotFound] = useState(false);
  const [accessDenied] = useState(false);

  useEffect(() => {
    if (kernel) {
      // In a full implementation, we'd query the kernel's RouteResolver or PresentationSnapshot.
      // For this vertical slice, we simulate resolving the route from the kernel.
      // We will ask the kernel for the snapshot.
      const snapshot = kernel.presentation().snapshot({
        tenantId: 'default',
        userId: 'anonymous',
        locale: 'pt-BR',
        capabilities: [],
        permissions: ['community-directory.view'],
        versions: {
          registryVersion: 1,
          capabilityVersion: 1,
          licenseVersion: 1,
          permissionVersion: 1,
          policyVersion: 1,
          layoutVersion: 1
        }
      });

      // For this vertical slice, we'll manually inject the mock route and props 
      // since we're bypassing the full registry population for the demo.
      // In a real flow, this would come naturally from snapshot.routes
      
      const mockProps = {
        tenantName: "Comunidade Demonstrativa",
        headline: "Encontre empresas e profissionais da comunidade",
        categories: [
          { id: "saude", label: "Saúde", icon: "heart-pulse" },
          { id: "juridico", label: "Jurídico", icon: "scale" }
        ],
        featuredBusinesses: [
          { id: "1", name: "Clínica Horizonte", category: "Saúde", description: "Atendimento médico especializado." }
        ]
      };

      const routeDef = snapshot.routes.find(r => r.path === pathname) || {
         id: 'community-directory.dashboard',
         path: '/comunidade',
         componentId: 'community-directory.dashboard',
         requireAuth: false,
         props: mockProps
      };
      
      if (routeDef && routeDef.componentId) {
        setRouteInfo({
           componentId: routeDef.componentId,
           props: routeDef.props || {}
        });
      } else {
        setRouteNotFound(true);
      }
    }
  }, [kernel, pathname]);

  if (isLoading || (!routeInfo && !routeNotFound && !accessDenied)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
        <h2 className="text-2xl font-bold text-destructive">Acesso Negado</h2>
        <p className="text-muted-foreground">Você não tem permissão para visualizar esta página.</p>
      </div>
    );
  }

  if (routeNotFound) {
    // Let Next.js handle 404
    notFound();
  }

  if (routeInfo) {
    const Component = webComponentRegistry[routeInfo.componentId];
    if (!Component) {
      return (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive border border-destructive/20">
          Componente não suportado ou não registrado: {routeInfo.componentId}
        </div>
      );
    }
    return <Component {...routeInfo.props} />;
  }

  return null;
}
