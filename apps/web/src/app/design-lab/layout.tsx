import React from 'react';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { DesignLabProvider } from './_providers/DesignLabProvider';
import { EnvironmentBanner } from './_components/EnvironmentBanner';
import { DesignLabHeader } from './_components/DesignLabHeader';
import { DesignLabSidebar } from './_components/DesignLabSidebar';

// Central Metadata Enforcement (AGENTS.md & 09-seo-geo-strategy.md)
export const metadata: Metadata = {
  title: 'Design Lab — CivicOS & Conexão Maçônica',
  description: 'Laboratório permanente de UX/UI, Design System e governança White Label.',
  robots: {
    index: false,
    follow: false,
    nocache: true
  }
};

// Strict Server-side Feature Flag Assert
function assertDesignLabEnabled(): void {
  const isProd = process.env.NODE_ENV === 'production';
  const enabled = isProd
    ? process.env.DESIGN_LAB_ENABLED === 'true'
    : process.env.DESIGN_LAB_ENABLED !== 'false';

  if (!enabled) {
    notFound();
  }
}

export default function DesignLabLayout({
  children
}: {
  children: React.ReactNode;
}) {
  // Validate feature flag on server-side before rendering
  assertDesignLabEnabled();

  return (
    <DesignLabProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
        {/* Environment Safety Watermark Banner */}
        <EnvironmentBanner />

        {/* Global Design Lab Header */}
        <DesignLabHeader />

        {/* Main Content Workspace Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Nav Sidebar (14 Routes) */}
          <DesignLabSidebar />

          {/* Main Viewport Content Area */}
          <main className="flex-1 overflow-y-auto p-6 bg-slate-950/60">
            {children}
          </main>
        </div>
      </div>
    </DesignLabProvider>
  );
}
