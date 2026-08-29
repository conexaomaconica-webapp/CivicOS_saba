'use client';

import React, { useState } from 'react';
import { Menu, Eye } from 'lucide-react';
import Link from 'next/link';
import { AdvertiserSidebar } from '@/components/advertiser/AdvertiserSidebar';

interface AdvertiserLayoutWrapperProps {
  children: React.ReactNode;
  businessName?: string;
  businessSlug?: string;
}

export function AdvertiserLayoutWrapper({
  children,
  businessName = 'Minha Empresa',
  businessSlug = '',
}: AdvertiserLayoutWrapperProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1f1914] flex flex-col md:flex-row font-sans">
      {/* SIDEBAR DO ANUNCIANTE */}
      <AdvertiserSidebar
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
        businessName={businessName}
        businessSlug={businessSlug}
      />

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER MOBILE (390px) */}
        <header className="md:hidden bg-[#1A1612] text-stone-100 px-4 py-3 border-b border-[#C9A227]/30 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="p-2 text-stone-300 hover:text-white rounded-lg hover:bg-stone-800"
            >
              <Menu className="w-5 h-5 text-[#C9A227]" />
            </button>
            <span className="font-serif font-bold text-sm text-[#F9F6F0] truncate max-w-[180px]">
              Portal do Anunciante
            </span>
          </div>

          <Link
            href={`/guia/${businessSlug}`}
            target="_blank"
            className="p-1.5 bg-[#3B0B14] text-[#C9A227] rounded-lg border border-[#C9A227]/40 text-xs font-bold flex items-center gap-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="text-[11px]">Guia</span>
          </Link>
        </header>

        {/* CONTEÚDO DA PÁGINA */}
        <main className="flex-1 p-4 md:p-8 max-w-6xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
