'use client';

import React from 'react';
import Image from 'next/image';
import { Calendar, Clock, MapPin, ArrowDown, Sparkles } from 'lucide-react';
import { OFFICIAL_SLOGAN } from './constants';

export function HeroSection() {
  const handleScroll = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section aria-label="Apresentação Oficial Conexão Maçônica" className="relative w-full">
      {/* 1. TOP BANNER EM FUNDO BORDÔ OFICIAL (#4B161B) COM LOGO AMPLIADA */}
      <div className="w-full bg-gradient-to-b from-[#4B161B] via-[#431317] to-[#380E12] border-b border-[#C9A227]/40 py-8 sm:py-10 px-4 shadow-md relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Ambient gold glow */}
        <div
          aria-hidden="true"
          className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-36 bg-[#C9A227]/15 rounded-full blur-2xl pointer-events-none"
        />

        {/* Larger Official Logo */}
        <div className="relative h-20 w-64 sm:h-24 sm:w-80 md:h-28 md:w-96 mb-3 transition-transform">
          <Image
            src="/logoconexao_red_vert.png"
            alt="Conexão Maçônica"
            fill
            priority
            sizes="(max-width: 640px) 256px, (max-width: 768px) 320px, 384px"
            className="object-contain"
          />
        </div>

        {/* Brand Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#C9A227]/40 bg-[#F3EEDD]/10 backdrop-blur-sm shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-[#C9A227]" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#F3EEDD]">
            Iniciativa Institucional
          </span>
        </div>
      </div>

      {/* 2. HERO CONTENT IN CLEAR IVORY */}
      <div className="min-h-[75vh] flex flex-col justify-center items-center text-center pt-12 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6 md:px-12 max-w-5xl mx-auto">
        {/* Eyebrow */}
        <span className="text-xs sm:text-sm font-semibold tracking-[0.22em] uppercase text-[#C9A227] block mb-4">
          Conheça a Conexão Maçônica
        </span>

        {/* Main Title */}
        <h1 className="font-[family-name:var(--font-marcellus)] text-3xl sm:text-5xl md:text-6xl text-[#4B161B] font-normal tracking-tight leading-[1.15] max-w-4xl mb-6">
          Uma nova forma de nos conectarmos está chegando.
        </h1>

        {/* Subtitle */}
        <p className="max-w-3xl text-base sm:text-xl text-[#5A483E] font-light leading-relaxed mb-6">
          A Conexão Maçônica nasce para aproximar irmãos, valorizar empresas e profissionais e criar novas oportunidades por meio dos laços que nos unem.
        </p>

        {/* Complementary Core Hook */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#C9A227]/30 shadow-xs max-w-2xl mx-auto mb-6">
          <p className="text-sm sm:text-base md:text-lg font-medium text-[#4B161B] leading-snug">
            &ldquo;Se existe um irmão que oferece o que você procura, por que não conhecê-lo primeiro?&rdquo;
          </p>
        </div>

        {/* Official Slogan */}
        <p className="text-sm sm:text-base font-serif italic text-[#C9A227] font-semibold mb-8 tracking-wide">
          &ldquo;{OFFICIAL_SLOGAN}&rdquo;
        </p>

        {/* Event Info Line */}
        <div className="mb-10 text-center">
          <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-[#4B161B] block mb-2">
            Lançamento Oficial
          </span>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs sm:text-sm text-[#6B5B52] font-medium max-w-xl mx-auto">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#C9A227]" />
              24 de novembro de 2026
            </span>
            <span className="text-[#C9A227]/60">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#C9A227]" />
              19h30
            </span>
            <span className="text-[#C9A227]/60">·</span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#C9A227]" />
              Feira de Santana — BA
            </span>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          {/* Main CTA */}
          <a
            href="#lancamento"
            onClick={handleScroll('lancamento')}
            className="relative inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 rounded-full font-bold text-sm sm:text-base text-white bg-gradient-to-r from-[#4B161B] via-[#611D23] to-[#4B161B] hover:brightness-110 shadow-lg shadow-[#4B161B]/20 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <span>Quero participar do lançamento</span>
          </a>

          {/* Secondary CTA */}
          <a
            href="#sobre"
            onClick={handleScroll('sobre')}
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-4 rounded-full text-xs sm:text-sm font-semibold text-[#4B161B] hover:text-[#C9A227] hover:bg-[#F3EEDD]/60 border border-[#C9A227]/30 transition-all duration-200"
          >
            <span>Conheça a plataforma</span>
            <ArrowDown className="w-4 h-4 text-[#C9A227]" />
          </a>
        </div>
      </div>
    </section>
  );
}


