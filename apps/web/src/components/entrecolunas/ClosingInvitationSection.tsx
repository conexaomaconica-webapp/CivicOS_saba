'use client';

import React from 'react';
import { Calendar, MapPin, Sparkles } from 'lucide-react';
import { ShareButton } from './ShareButton';
import { OFFICIAL_SLOGAN } from './constants';

export function ClosingInvitationSection() {
  const handleScrollToEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById('lancamento');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      aria-labelledby="encerramento-title"
      className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center"
    >
      <div className="rounded-3xl p-8 sm:p-14 bg-white border border-[#C9A227]/30 shadow-md">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C9A227]/40 bg-[#FAF7F2] text-[11px] font-semibold text-[#8B6D1B] uppercase tracking-wider mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          <span>Uma Nova Conexão Está Começando</span>
        </div>

        {/* Title */}
        <h2
          id="encerramento-title"
          className="font-[family-name:var(--font-marcellus)] text-3xl sm:text-4xl md:text-5xl text-[#4B161B] font-normal tracking-tight mb-6"
        >
          E queremos você fazendo parte dessa história.
        </h2>

        {/* Text */}
        <div className="space-y-2 text-base sm:text-lg text-[#5A483E] font-light leading-relaxed max-w-2xl mx-auto mb-8">
          <p>
            Seja para encontrar empresas e profissionais, conhecer benefícios, apresentar seu negócio ou fortalecer novas relações, existe um lugar para você na Conexão Maçônica.
          </p>
          <p className="font-medium text-[#4B161B]">
            Nosso encontro está marcado.
          </p>
        </div>

        {/* Date and Location Line */}
        <div className="inline-flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-5 py-2.5 rounded-full bg-[#FAF7F2] border border-[#C9A227]/30 text-xs sm:text-sm text-[#4B161B] font-medium mb-10 shadow-2xs">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#C9A227]" />
            24 de novembro de 2026
          </span>
          <span className="text-[#C9A227]">·</span>
          <span className="text-xs sm:text-sm font-semibold text-[#8B6D1B]">19h</span>
          <span className="text-[#C9A227]">·</span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-[#C9A227]" />
            Feira de Santana — BA
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          {/* Main button */}
          <a
            href="#lancamento"
            onClick={handleScrollToEvent}
            className="w-full sm:w-auto px-8 py-4 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-[#4B161B] via-[#611D23] to-[#4B161B] hover:brightness-110 shadow-lg shadow-[#4B161B]/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            Quero participar do lançamento
          </a>

          {/* Secondary button */}
          <ShareButton />
        </div>

        {/* Official Slogan */}
        <p className="font-serif italic text-sm sm:text-base text-[#C9A227] font-semibold tracking-wide">
          &ldquo;{OFFICIAL_SLOGAN}&rdquo;
        </p>
      </div>
    </section>
  );
}
