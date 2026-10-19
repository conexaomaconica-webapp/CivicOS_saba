'use client';

import React from 'react';
import { Search, Compass, MessageCircle, Sparkles } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      number: '01',
      title: 'Pesquise',
      description: 'Procure empresas, profissionais, produtos e serviços por cidade ou categoria.',
      icon: Search,
    },
    {
      number: '02',
      title: 'Descubra',
      description: 'Conheça as empresas participantes, suas atividades e as informações disponibilizadas em seus perfis.',
      icon: Compass,
    },
    {
      number: '03',
      title: 'Conecte-se',
      description: 'Entre em contato diretamente com o negócio escolhido e conheça seus produtos, serviços e benefícios.',
      icon: MessageCircle,
    },
  ];

  return (
    <section
      aria-labelledby="como-funciona-title"
      className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6 md:px-8"
    >
      {/* Title */}
      <div className="text-center mb-16 sm:mb-20">
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#C9A227] block mb-3">
          Simples, Prático e Perto de Você
        </span>
        <h2
          id="como-funciona-title"
          className="font-[family-name:var(--font-marcellus)] text-3xl sm:text-4xl md:text-5xl text-[#4B161B] font-normal tracking-tight mb-4"
        >
          Encontrar o que você precisa será mais fácil.
        </h2>
      </div>

      {/* Steps container */}
      <div className="relative mb-12">
        {/* Golden connecting line (desktop) */}
        <div
          aria-hidden="true"
          className="hidden md:block absolute top-7 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-[#C9A227]/20 via-[#C9A227] to-[#C9A227]/20 z-0"
        />

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-6 relative z-10">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="flex flex-col items-center text-center px-4 group"
              >
                {/* Step circle */}
                <div className="relative w-14 h-14 rounded-full bg-white border-2 border-[#C9A227] shadow-md flex items-center justify-center text-[#4B161B] font-serif font-bold text-base mb-6 group-hover:scale-105 transition-transform">
                  <span>{step.number}</span>
                  <div className="absolute -inset-1 rounded-full bg-[#C9A227]/10 blur-sm pointer-events-none" />
                </div>

                {/* Icon badge */}
                <div className="w-9 h-9 rounded-xl bg-[#4B161B]/10 border border-[#4B161B]/20 flex items-center justify-center text-[#4B161B] mb-3">
                  <Icon className="w-4 h-4" />
                </div>

                {/* Title */}
                <h3 className="text-base sm:text-lg font-semibold text-[#4B161B] mb-2 leading-snug">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-xs sm:text-sm text-[#5A483E] font-light leading-relaxed max-w-xs">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Closing sentence */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FAF7F2] border border-[#C9A227]/30 text-xs sm:text-sm text-[#8B6D1B] font-medium shadow-2xs">
          <Sparkles className="w-4 h-4 text-[#C9A227]" />
          <span>Em breve, tudo isso em um único lugar, pelo celular ou computador.</span>
        </div>
      </div>
    </section>
  );
}


