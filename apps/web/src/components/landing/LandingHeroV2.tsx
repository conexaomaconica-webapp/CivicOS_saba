'use client';

import React from 'react';
import { Badge } from '@saas/ui';
import { CheckCircle2, Sparkles, Smartphone, Monitor } from 'lucide-react';

export function LandingHeroV2() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden" id="home">
      {/* Animated CSS Background */}
      <div className="absolute inset-0 overflow-hidden bg-[#140305] z-0">
        {/* Animated glowing blobs */}
        <div className="absolute -top-[30%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-[#4B161B] opacity-40 blur-[120px] animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[10%] -right-[20%] w-[60vw] h-[60vw] rounded-full bg-[#300d11] opacity-60 blur-[100px] animate-pulse" style={{ animationDuration: '12s' }}></div>
        <div className="absolute -bottom-[10%] left-[40%] w-[40vw] h-[40vw] rounded-full bg-[#C9A227] opacity-[0.03] blur-[120px] animate-pulse" style={{ animationDuration: '10s' }}></div>
        
        {/* Subtle grid pattern for depth */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
      </div>

      {/* Fade out gradient at the bottom blending into next section's background (#20080a) */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-64 bg-gradient-to-b from-transparent to-[#20080a]" />

      <div className="container mx-auto px-4 max-w-5xl relative z-[10] flex flex-col items-center text-center mt-16 space-y-8">
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#C9A227]/10 border border-[#C9A227]/30 text-[#C9A227] text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
          <Badge variant="warning">LANÇAMENTO 2026</Badge>
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>CONDIÇÕES ESPECIAIS PARA FUNDADORAS</span>
        </div>

        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] text-white max-w-4xl mx-auto drop-shadow-lg">
          Conexões que fortalecem negócios e{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#e8c045] via-[#C9A227] to-amber-500 pb-2 inline-block">
            aproximam a comunidade
          </span>
        </h1>

        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-normal leading-relaxed drop-shadow-md">
          O <strong>Conexão Maçônica</strong> é um guia criado para aproximar pessoas, profissionais, empresas e serviços em um ambiente organizado, confiável e pensado para gerar novas conexões.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6 w-full max-w-lg mx-auto">
          <button
            className="w-full sm:w-auto px-10 py-4 !bg-[#C9A227] hover:!bg-[#B89628] !text-[#4B161B] font-extrabold shadow-lg shadow-[#C9A227]/30 rounded-xl text-sm uppercase transition-all active:scale-95"
            onClick={() => scrollTo('captacao-lead')}
          >
            QUERO FAZER PARTE
          </button>

          <button
            className="w-full sm:w-auto border border-[#C9A227]/40 text-slate-100 hover:bg-white/10 hover:text-white px-10 py-4 rounded-xl text-sm font-semibold transition-all backdrop-blur-md"
            onClick={() => scrollTo('como-funciona')}
          >
            VEJA COMO VAI FUNCIONAR
          </button>
        </div>

        {/* Multiplatform Notice */}
        <div className="pt-8 flex items-center justify-center gap-3 text-slate-300 font-medium">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-[#300d11] border border-[#4B161B] flex items-center justify-center z-20 shadow-md">
              <Monitor className="w-4 h-4 text-[#C9A227]" />
            </div>
            <div className="w-8 h-8 rounded-full bg-[#300d11] border border-[#4B161B] flex items-center justify-center z-10 shadow-md">
              <Smartphone className="w-4 h-4 text-[#C9A227]" />
            </div>
          </div>
          <span className="text-[13px] md:text-sm drop-shadow-md">Experiência nativa em <strong className="text-[#C9A227] font-bold">Web, iOS e Android</strong></span>
        </div>

        <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-t border-[#C9A227]/20 w-full max-w-4xl mx-auto text-xs text-slate-300 uppercase tracking-widest font-semibold drop-shadow-sm">
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
            <span>Diretório Organizado</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
            <span>Perfis Estruturados</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
            <span>Eventos & Notícias</span>
          </div>
          <div className="flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#C9A227]" />
            <span>Rede de Apoio Comercial</span>
          </div>
        </div>
      </div>
    </section>
  );
}
