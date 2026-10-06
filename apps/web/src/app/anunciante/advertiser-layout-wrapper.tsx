'use client';

import React, { useState } from 'react';
import { Menu, Eye } from 'lucide-react';
import Link from 'next/link';
import { AdvertiserSidebar } from '@/components/advertiser/AdvertiserSidebar';
import type { AdvertiserFeatures } from '@/lib/advertiser/advertiser-entitlements';
import { resolvePortalTheme, type PortalBrandInput } from '@/lib/tenant/portal-theme';

interface AdvertiserLayoutWrapperProps {
  children: React.ReactNode;
  businessName: string;
  businessSlug: string;
  features: AdvertiserFeatures | null;
  unreadCount: number;
  brand: PortalBrandInput;
}

export function AdvertiserLayoutWrapper({ children, businessName, businessSlug, features, unreadCount, brand }: AdvertiserLayoutWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const theme = resolvePortalTheme(brand);

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] font-sans text-[#1f1914] md:flex-row" style={theme.vars as React.CSSProperties}>
      <AdvertiserSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        businessName={businessName}
        businessSlug={businessSlug}
        unreadNotificationsCount={unreadCount}
        features={features}
        brandLogo={theme.logo}
        brandName={brand.name}
        brandOnDark={theme.onDark}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* CABEÇALHO DO CELULAR: logomarca do tenant + atalhos */}
        <header
          className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#C9A227]/30 px-4 py-2.5 text-stone-100 md:hidden"
          style={{ background: 'var(--member-primary)' }}
        >
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={isMobileMenuOpen}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[#F9F6F0] hover:bg-white/10"
            >
              <Menu className="h-5 w-5" />
            </button>
            {theme.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={theme.logo} alt={`Logomarca ${brand.name}`} className="h-8 w-auto max-w-[9rem] object-contain object-left" />
            ) : (
              <span className="truncate font-serif text-sm font-bold text-[#F9F6F0]">{brand.name}</span>
            )}
          </div>

          <Link
            href={`/guia/${businessSlug}`}
            target="_blank"
            className="flex min-h-10 shrink-0 items-center gap-1 rounded-lg border border-[#C9A227]/50 bg-black/20 px-3 text-xs font-bold text-[#C9A227]"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Meu anúncio</span>
          </Link>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 p-4 sm:p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
