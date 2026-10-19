'use client';

import React from 'react';
import { ShieldCheck, Gift, MessageCircle } from 'lucide-react';

export function AboutSection() {
  const pillars = [
    {
      icon: ShieldCheck,
      title: 'Empresas e profissionais',
      desc: 'Conheça negócios de irmãos, cunhadas, sobrinhos e demais participantes elegíveis, com vínculos sujeitos à verificação pela plataforma.',
    },
    {
      icon: Gift,
      title: 'Produtos, serviços e benefícios',
      desc: 'Encontre opções para diferentes necessidades do dia a dia e descubra vantagens oferecidas pelas empresas participantes.',
    },
    {
      icon: MessageCircle,
      title: 'Conexão direta',
      desc: 'Entre em contato com empresas e profissionais pelos canais disponibilizados em seus perfis, de forma prática e sem intermediação comercial da plataforma.',
    },
  ];

  return (
    <section
      id="sobre"
      aria-labelledby="sobre-title"
      className="scroll-mt-20 py-20 sm:py-28 bg-white border-y border-[#C9A227]/20"
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        {/* Eyebrow */}
        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-[#C9A227] block mb-3">
          Conheça a Plataforma
        </span>

        {/* Title */}
        <h2
          id="sobre-title"
          className="font-[family-name:var(--font-marcellus)] text-3xl sm:text-4xl md:text-5xl text-[#4B161B] font-normal tracking-tight mb-6"
        >
          Um guia que aproxima pessoas, empresas e oportunidades.
        </h2>

        {/* Text */}
        <div className="space-y-4 text-base sm:text-lg text-[#5A483E] font-light leading-relaxed max-w-3xl mx-auto mb-14 sm:mb-16">
          <p>
            Imagine encontrar, em um único lugar, empresas e profissionais ligados à família maçônica, sempre que precisar de um produto ou serviço.
          </p>
          <p>
            A Conexão Maçônica está chegando para facilitar essas descobertas, valorizar o trabalho de irmãos e familiares e criar novas possibilidades de relacionamento e negócios.
          </p>
          <p className="font-medium text-[#4B161B]">
            Uma iniciativa que une a tradição dos nossos laços às facilidades do mundo digital.
          </p>
        </div>

        {/* Three pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 text-left">
          {pillars.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="p-6 sm:p-7 rounded-2xl bg-[#FAF7F2] border border-[#C9A227]/25 hover:border-[#C9A227]/60 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col"
              >
                <div className="w-12 h-12 rounded-xl bg-[#4B161B]/10 border border-[#4B161B]/20 flex items-center justify-center text-[#4B161B] mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-[#4B161B] mb-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6B5B52] font-light leading-relaxed">
                  {item.desc}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

