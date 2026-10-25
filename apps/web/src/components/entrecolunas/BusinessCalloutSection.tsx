'use client';

import React from 'react';
import { ArrowRight, ShieldCheck, Gem } from 'lucide-react';
import { COMMERCIAL_PLANS_URL } from './constants';

export function BusinessCalloutSection() {
  return (
    <section
      aria-labelledby="empresarios-title"
      className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 md:px-8"
    >
      <div className="rounded-3xl p-8 sm:p-12 bg-white border border-[#C9A227]/30 shadow-md text-center">
        {/* Eyebrow */}
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#C9A227] block mb-3">
          Seu Negócio Também Pode Fazer Parte
        </span>

        {/* Title */}
        <h2
          id="empresarios-title"
          className="font-[family-name:var(--font-marcellus)] text-2xl sm:text-3xl md:text-4xl text-[#4B161B] font-normal tracking-tight mb-4"
        >
          O que você faz merece ser conhecido.
        </h2>

        {/* Text */}
        <div className="space-y-3 text-sm sm:text-base md:text-lg text-[#5A483E] font-light leading-relaxed mb-8 max-w-2xl mx-auto">
          <p>
            A Conexão Maçônica também será um espaço para empresários e profissionais apresentarem seus negócios, produtos e serviços.
          </p>
          <p>
            Se você deseja ampliar a visibilidade do seu trabalho e conhecer as oportunidades de divulgação na plataforma, nossa equipe está pronta para apresentar as possibilidades de participação.
          </p>
        </div>

        {/* Modalidades Box */}
        <div className="p-6 rounded-2xl bg-[#FAF7F2] border border-[#C9A227]/30 max-w-xl mx-auto mb-8 text-center shadow-2xs">
          <p className="text-xs font-bold tracking-wider uppercase text-[#8B6D1B] mb-2 flex items-center justify-center gap-1.5">
            <Gem className="w-3.5 h-3.5 text-[#C9A227]" />
            Conheça nossas modalidades:
          </p>
          <p className="font-[family-name:var(--font-marcellus)] text-lg sm:text-xl text-[#4B161B] font-medium tracking-wide mb-2">
            Esquadro &nbsp;•&nbsp; Compasso &nbsp;•&nbsp; Acácia
          </p>
          <p className="text-xs text-[#6B5B52] font-light leading-relaxed">
            Com diferentes recursos de apresentação para atender às necessidades de cada negócio.
          </p>
        </div>

        {/* Button */}
        <div className="mb-6">
          <a
            href={COMMERCIAL_PLANS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-xs sm:text-sm text-[#4B161B] border-2 border-[#C9A227] hover:bg-[#F3EEDD]/60 transition-all duration-200 active:scale-95 shadow-2xs"
          >
            <span>Quero conhecer as possibilidades de divulgação</span>
            <ArrowRight className="w-4 h-4 text-[#C9A227]" />
          </a>
        </div>

        {/* Disclaimer */}
        <div className="flex items-center justify-center gap-2 text-xs text-[#6B5B52] font-light max-w-lg mx-auto leading-relaxed">
          <ShieldCheck className="w-4 h-4 text-[#C9A227] shrink-0" />
          <span>
            * A participação comercial está sujeita às regras de elegibilidade, conferência e aprovação da plataforma. O interesse inicial não representa compromisso de contratação.
          </span>
        </div>
      </div>
    </section>
  );
}
