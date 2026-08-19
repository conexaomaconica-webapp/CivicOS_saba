'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@saas/ui';

export function LandingHeader() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#4B161B]/95 backdrop-blur-md border-b border-[#C9A227]/40 text-white shadow-2xl">
      <div className="container mx-auto px-4 max-w-6xl h-24 flex items-center justify-between">
        {/* Prominent Vertical Brand Logo in Header */}
        <div className="flex items-center cursor-pointer py-1" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative w-36 h-16 md:w-48 md:h-20">
            <Image
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Smooth Scroll Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-200 uppercase tracking-wider">
          <button onClick={() => scrollTo('como-funciona')} className="hover:text-[#C9A227] transition-colors">
            Como Funciona
          </button>
          <button onClick={() => scrollTo('para-quem')} className="hover:text-[#C9A227] transition-colors">
            Para Quem É
          </button>
          <button onClick={() => scrollTo('planos')} className="hover:text-[#C9A227] transition-colors">
            Planos
          </button>
          <button onClick={() => scrollTo('oferta-fundador')} className="hover:text-[#C9A227] transition-colors text-[#C9A227] font-bold">
            Empresa Fundadora
          </button>
          <button onClick={() => scrollTo('faq')} className="hover:text-[#C9A227] transition-colors">
            Dúvidas
          </button>
        </nav>

        {/* Gold/Champagne CTA Button */}
        <div>
          <Button
            variant="primary"
            size="sm"
            className="bg-[#C9A227] hover:bg-[#B89628] text-[#4B161B] font-extrabold px-6 py-2.5 rounded-lg text-xs tracking-wider shadow-lg shadow-[#C9A227]/20 transition-transform active:scale-95"
            onClick={() => scrollTo('captacao-lead')}
          >
            QUERO FAZER PARTE
          </Button>
        </div>
      </div>
    </header>
  );
}
