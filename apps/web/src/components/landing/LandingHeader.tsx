'use client';

import React from 'react';
import Image from 'next/image';
import { Button } from '@saas/ui';

export function LandingHeader() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 bg-[#4B161B]/95 backdrop-blur-md border-b border-[#C9A227]/30 text-white shadow-lg">
      <div className="container mx-auto px-4 max-w-6xl h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div className="relative w-36 h-12 md:w-44 md:h-14">
            <Image
              src="/logoconexao_red.png"
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
          <button onClick={() => scrollTo('oferta-fundador')} className="hover:text-[#C9A227] transition-colors text-[#C9A227]">
            Empresa Fundadora
          </button>
          <button onClick={() => scrollTo('faq')} className="hover:text-[#C9A227] transition-colors">
            Dúvidas
          </button>
        </nav>

        {/* CTA */}
        <div>
          <Button
            variant="primary"
            size="sm"
            className="bg-[#C9A227] hover:bg-[#b08c1e] text-[#4B161B] font-extrabold px-5 py-2.5 rounded-lg text-xs tracking-wider shadow-md"
            onClick={() => scrollTo('captacao-lead')}
          >
            QUERO FAZER PARTE
          </Button>
        </div>
      </div>
    </header>
  );
}
