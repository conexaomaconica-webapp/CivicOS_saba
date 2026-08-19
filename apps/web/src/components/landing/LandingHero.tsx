'use client';

import React from 'react';
import Image from 'next/image';
import { Button, Badge } from '@saas/ui';

export function LandingHero() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative py-20 md:py-28 overflow-hidden bg-gradient-to-b from-[#4B161B] via-slate-900 to-slate-950 text-white">
      <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#C9A227_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />
      
      <div className="container mx-auto px-4 max-w-6xl relative z-10 text-center space-y-8">
        {/* Official Vertical Logo Display */}
        <div className="flex justify-center mb-2">
          <div className="relative w-40 h-28 md:w-52 md:h-36 filter drop-shadow-lg">
            <Image
              src="/logoconexao_red_vert.png"
              alt="Conexão Maçônica"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] text-xs font-semibold uppercase tracking-wider">
          <Badge variant="warning">LANÇAMENTO 2026</Badge>
          <span>CONDIÇÕES ESPECIAIS PARA EMPRESAS FUNDADORAS</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight text-white max-w-4xl mx-auto">
          Conexões que fortalecem negócios e{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#C9A227] via-amber-300 to-yellow-500">
            aproximam a comunidade
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed">
          O <strong>Conexão Maçônica</strong> é um guia criado para aproximar pessoas, profissionais, empresas e serviços em um ambiente organizado, confiável e pensado para gerar novas conexões.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            variant="primary"
            size="lg"
            className="w-full sm:w-auto px-8 py-4 bg-[#C9A227] hover:bg-[#B89628] text-[#4B161B] font-extrabold shadow-lg shadow-[#C9A227]/20 rounded-lg text-base"
            onClick={() => scrollTo('captacao-lead')}
          >
            QUERO FAZER PARTE
          </Button>

          <Button
            variant="outline"
            size="lg"
            className="w-full sm:w-auto border-[#C9A227]/40 text-slate-200 hover:bg-slate-800 hover:text-white px-8 py-4 rounded-lg text-base"
            onClick={() => scrollTo('como-funciona')}
          >
            VEJA COMO VAI FUNCIONAR
          </Button>
        </div>

        <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-t border-slate-800/80 max-w-4xl mx-auto text-xs text-slate-400 uppercase tracking-widest font-semibold">
          <div>✓ Diretório Organizado</div>
          <div>✓ Perfis Estruturados</div>
          <div>✓ Eventos & Notícias</div>
          <div>✓ Rede de Apoio Comercial</div>
        </div>
      </div>
    </section>
  );
}
