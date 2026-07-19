'use client';

import React, { useMemo } from 'react';
import { usePresentationSnapshot } from '@saas/app-sdk';
import { NavigationRenderer } from '@/components/NavigationRenderer';
import type { PresentationContext } from '@saas/core';

export default function GuiaPage() {
  const context = useMemo<PresentationContext>(() => ({
    tenantId: 'demo-tenant',
    userId: 'user-1',
    locale: 'pt-BR',
    permissions: ['business.view', 'business.create'],
    capabilities: ['business.directory'],
    versions: {
      registryVersion: 1,
      capabilityVersion: 1,
      licenseVersion: 1,
      permissionVersion: 1,
      policyVersion: 1,
      layoutVersion: 1,
    }
  }), []);

  const snapshot = usePresentationSnapshot(context);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar with Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200">
        <div className="p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4">CivicOS Menu</h2>
          <NavigationRenderer items={snapshot.navigation} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Guia Comercial (Visual Prototype)</h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Presentation Snapshot Debugger</h2>
            <p className="text-sm text-gray-600 mb-4">
              This data comes directly from the Kernel's Presentation Engine, without any UI framework logic mixing.
            </p>
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto max-h-96">
              {JSON.stringify(snapshot, null, 2)}
            </pre>
          </div>
          
        </div>
      </main>
    </div>
  );
}
