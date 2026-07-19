// ============================================================================
// React Context Providers — Core Platform
// ============================================================================
// Provides DI Container, Event Bus, Plugin Registry, and Platform info
// to the React component tree.
// ============================================================================

'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { Container, EventBus, PluginRegistry, PlatformCapabilities } from '@saas/core';
import type { NavigationItem } from '@saas/core';

// ---------------------------------------------------------------------------
// Platform Context
// ---------------------------------------------------------------------------

interface PlatformContextValue {
  container: Container;
  eventBus: EventBus;
  registry: PluginRegistry;
  platform: PlatformCapabilities;
  navigationItems: NavigationItem[];
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function usePlatform(): PlatformContextValue {
  const ctx = useContext(PlatformContext);
  if (!ctx) {
    throw new Error('usePlatform must be used within a <PlatformProvider>.');
  }
  return ctx;
}

export function useContainer(): Container {
  return usePlatform().container;
}

export function useEventBus(): EventBus {
  return usePlatform().eventBus;
}

export function useRegistry(): PluginRegistry {
  return usePlatform().registry;
}

export function useNavigationItems(): NavigationItem[] {
  return usePlatform().navigationItems;
}

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

interface PlatformProviderProps {
  container: Container;
  eventBus: EventBus;
  registry: PluginRegistry;
  platform: PlatformCapabilities;
  children: React.ReactNode;
}

export function PlatformProvider({
  container,
  eventBus,
  registry,
  platform,
  children,
}: PlatformProviderProps) {
  const value = useMemo<PlatformContextValue>(
    () => ({
      container,
      eventBus,
      registry,
      platform,
      navigationItems: registry.collectNavigationItems(),
    }),
    [container, eventBus, registry, platform],
  );

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}
