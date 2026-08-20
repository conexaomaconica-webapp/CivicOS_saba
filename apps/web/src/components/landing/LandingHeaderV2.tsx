'use client';

import React from 'react';
import Image from 'next/image';

export function LandingHeaderV2() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="fixed inset-x-0 top-6 z-50 flex justify-center px-4">
      <nav className="w-full max-w-6xl rounded-2xl bg-[#20080a]/80 backdrop-blur-md shadow-2xl border border-[#C9A227]/30 transition-all duration-500 ease-in-out">
        <div className="flex items-center justify-between gap-6 py-2 px-6">
          <div className="flex items-center cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="relative w-28 h-12 md:w-36 md:h-14">
              <Image
                src="/logoconexao_red_vert.png"
                alt="Conexão Maçônica"
                fill
                sizes="120px"
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <button onClick={() => scrollTo('como-funciona')} className="rounded-xl text-sm font-semibold text-slate-200 hover:text-[#C9A227] hover:bg-white/5 px-4 py-2 transition-all">Como Funciona</button>
            <button onClick={() => scrollTo('para-quem')} className="rounded-xl text-sm font-semibold text-slate-200 hover:text-[#C9A227] hover:bg-white/5 px-4 py-2 transition-all">Para Quem É</button>
            <button onClick={() => scrollTo('planos')} className="rounded-xl text-sm font-semibold text-slate-200 hover:text-[#C9A227] hover:bg-white/5 px-4 py-2 transition-all">Planos</button>
            <button onClick={() => scrollTo('oferta-fundador')} className="rounded-xl text-sm font-bold text-[#C9A227] hover:text-[#e8c045] hover:bg-white/5 px-4 py-2 transition-all">Empresa Fundadora</button>
            <button onClick={() => scrollTo('faq')} className="rounded-xl text-sm font-semibold text-slate-200 hover:text-[#C9A227] hover:bg-white/5 px-4 py-2 transition-all">Dúvidas</button>
          </div>

          <div className="flex items-center">
            <button
              onClick={() => scrollTo('captacao-lead')}
              className="group relative inline-flex items-center justify-center rounded-xl p-[1px] bg-gradient-to-r from-[#C9A227] via-amber-200 to-[#C9A227] overflow-hidden transition-transform active:scale-95 shadow-lg shadow-[#C9A227]/20"
            >
              <span className="w-full rounded-[11px] !bg-[#C9A227] hover:!bg-transparent px-6 py-2.5 text-center text-[13px] font-extrabold uppercase tracking-wider !text-[#4B161B] transition-colors duration-300">
                Quero Fazer Parte
              </span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
