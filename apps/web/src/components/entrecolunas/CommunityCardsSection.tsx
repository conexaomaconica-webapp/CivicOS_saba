'use client';

import React from 'react';
import { Search, Briefcase, Sparkles } from 'lucide-react';

export function CommunityCardsSection() {
  return (
    <section
      aria-labelledby="voce-faz-parte-title"
      className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 md:px-8"
    >
      {/* Title */}
      <div className="text-center mb-12 sm:mb-16">
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#C9A227] block mb-3">
          A Força das Nossas Conexões
        </span>
        <h2
          id="voce-faz-parte-title"
          className="font-[family-name:var(--font-marcellus)] text-3xl sm:text-4xl md:text-5xl text-[#4B161B] font-normal tracking-tight mb-4"
        >
          Tendo empresa ou não, esta conexão é sua.
        </h2>
        <div className="space-y-3 text-base sm:text-lg text-[#5A483E] max-w-2xl mx-auto font-light leading-relaxed">
          <p>
            A Conexão Maçônica nasce para aproximar quem procura de quem oferece, valorizando os laços que nos unem.
          </p>
          <p>
            Cada irmão que encontra o que precisa, cada empresa que apresenta seu trabalho e cada nova conexão fortalecem essa iniciativa, construída para todos nós.
          </p>
        </div>
      </div>

      {/* Two cards side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-12">
        {/* Card 1: Para você que procura */}
        <div className="relative p-7 sm:p-9 rounded-3xl bg-white border border-[#C9A227]/30 shadow-sm hover:shadow-md hover:border-[#C9A227]/60 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#4B161B]/10 border border-[#4B161B]/20 flex items-center justify-center text-[#4B161B] mb-6">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-[family-name:var(--font-marcellus)] text-2xl sm:text-3xl text-[#4B161B] mb-3">
              Para você que procura
            </h3>
            <p className="text-sm sm:text-base text-[#5A483E] font-light leading-relaxed mb-4">
              Seja você aposentado, servidor público, profissional, empresário ou familiar, a plataforma permitirá descobrir empresas, produtos e serviços de pessoas ligadas à Maçonaria.
            </p>
            <p className="text-sm sm:text-base text-[#5A483E] font-light leading-relaxed mb-4">
              Antes de buscar uma solução em outro lugar, você poderá conhecer as opções disponíveis entre irmãos e familiares.
            </p>
          </div>
          <div className="pt-5 mt-4 border-t border-[#C9A227]/20 flex items-center gap-2 text-xs text-[#8B6D1B] font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#C9A227] shrink-0" />
            <span>Encontre. Conheça. Conecte-se.</span>
          </div>
        </div>

        {/* Card 2: Para você que oferece */}
        <div className="relative p-7 sm:p-9 rounded-3xl bg-white border border-[#C9A227]/30 shadow-sm hover:shadow-md hover:border-[#C9A227]/60 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-[#4B161B]/10 border border-[#4B161B]/20 flex items-center justify-center text-[#4B161B] mb-6">
              <Briefcase className="w-6 h-6" />
            </div>
            <h3 className="font-[family-name:var(--font-marcellus)] text-2xl sm:text-3xl text-[#4B161B] mb-3">
              Para você que oferece
            </h3>
            <p className="text-sm sm:text-base text-[#5A483E] font-light leading-relaxed mb-4">
              Se você possui uma empresa ou atua como profissional, a Conexão Maçônica poderá ser um novo espaço para apresentar seu trabalho, ampliar sua visibilidade e estabelecer novas relações comerciais.
            </p>
            <p className="text-sm sm:text-base text-[#5A483E] font-light leading-relaxed mb-4">
              Uma oportunidade de mostrar o que você faz a pessoas que valorizam os laços que nos unem.
            </p>
          </div>
          <div className="pt-5 mt-4 border-t border-[#C9A227]/20 flex items-center gap-2 text-xs text-[#8B6D1B] font-semibold tracking-wide">
            <Sparkles className="w-4 h-4 text-[#C9A227] shrink-0" />
            <span>Apresente. Valorize. Conecte-se.</span>
          </div>
        </div>
      </div>

      {/* Frase de fechamento centralizada */}
      <div className="text-center p-5 sm:p-6 rounded-2xl bg-[#F3EEDD]/60 border border-[#C9A227]/30 max-w-2xl mx-auto shadow-2xs">
        <h3 className="font-[family-name:var(--font-marcellus)] text-lg sm:text-xl md:text-2xl text-[#4B161B] font-normal leading-snug">
          Porque uma conexão só faz sentido quando todos fazem parte.
        </h3>
      </div>
    </section>
  );
}
