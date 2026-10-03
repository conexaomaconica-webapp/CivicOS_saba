'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BusinessCard, type BusinessCardData } from './BusinessCard';

export type DirectorySponsoredItem = BusinessCardData;

type DirectorySponsoredProps = {
  items?: DirectorySponsoredItem[];
  displayMode?: 'cards' | 'logos';
  speed?: number;
  logoStyle?: 'standard' | 'clean';
};

export function DirectorySponsored({
  items = [],
  displayMode = 'cards',
  speed = 45,
  logoStyle = 'standard',
}: DirectorySponsoredProps) {
  if (!items.length) return null;

  if (displayMode === 'logos') {
    // Fill array so there's enough items to loop seamlessly
    let marqueeItems = [...items];
    while (marqueeItems.length < 12 && marqueeItems.length > 0) {
      marqueeItems = [...marqueeItems, ...items];
    }
    const loopedItems = [...marqueeItems, ...marqueeItems];
    const isCleanMode = logoStyle === 'clean';

    return (
      <section className="dh-container py-6" id="patrocinadas">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="dh-section-title text-stone-900">Empresas Patrocinadas</h2>
            <p className="text-xs text-stone-500 mt-1">Parceiros em destaque e empresas pilares da nossa rede.</p>
          </div>
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">
            ♾️ Destaques da Plataforma
          </span>
        </div>

        {/* Outer Marquee Container with Fading Edges */}
        <div
          className={`relative w-full overflow-hidden rounded-2xl bg-white/70 border border-stone-200/80 shadow-sm group ${isCleanMode ? 'pt-16 pb-5 px-3' : 'p-3'
            }`}
        >
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

          {/* Marquee Track with Configurable Duration */}
          <div
            className="dh-logo-marquee-track"
            style={{ '--marquee-speed': `${Math.max(10, speed)}s` } as React.CSSProperties}
          >
            {loopedItems.map((biz, idx) => {
              const logoSrc = biz.logo_url || '/logoconexao_red_vert.png';
              const businessTitle = `${biz.name}${biz.category_name ? ` • ${biz.category_name}` : ''}`;

              if (isCleanMode) {
                // Modo Limpo: apenas a logomarca sem borda, sem nome e sem categoria fixos; hover exibe nome e categoria em tooltip
                return (
                  <Link
                    key={`${biz.id}-${idx}`}
                    href={`/guia/${biz.slug}`}
                    title={businessTitle}
                    className="relative group/logo flex items-center justify-center px-4 py-2 shrink-0 transition-transform duration-300 hover:scale-110"
                  >
                    {/* Tooltip flutuante exibida suavemente ao passar o mouse */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none z-30 opacity-0 group-hover/logo:opacity-100 translate-y-1 group-hover/logo:translate-y-0 transition-all duration-200 whitespace-nowrap drop-shadow-lg">
                      <div className="bg-stone-900/95 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg border border-stone-700/60 shadow-xl flex flex-col items-center text-center">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {biz.name}
                        </span>
                        {biz.category_name && (
                          <span className="text-[10px] text-amber-300 font-medium mt-0.5">
                            {biz.category_name}
                          </span>
                        )}
                      </div>
                      <div className="w-2 h-2 bg-stone-900/95 border-r border-b border-stone-700/60 rotate-45 mx-auto -mt-1" />
                    </div>

                    {/* Logomarca pura, sem borda e sem fundo */}
                    <div className="w-28 sm:w-32 h-12 sm:h-14 relative flex items-center justify-center">
                      <Image
                        src={logoSrc}
                        alt={biz.name || 'Logo da empresa parceira'}
                        fill
                        className="object-contain filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.06)] hover:drop-shadow-[0_4px_8px_rgba(0,0,0,0.14)] transition-all"
                        unoptimized
                      />
                    </div>
                  </Link>
                );
              }

              // Modo Standard: Card compacto com logo, borda, nome e categoria
              return (
                <Link
                  key={`${biz.id}-${idx}`}
                  href={`/guia/${biz.slug}`}
                  title={businessTitle}
                  className="flex items-center gap-3 bg-white border border-stone-200 hover:border-[#C9A227] shadow-sm hover:shadow-md rounded-xl px-3 py-2 transition-all shrink-0 group/card"
                >
                  <div className="w-11 h-11 relative bg-white rounded-lg border border-stone-100 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    <Image
                      src={logoSrc}
                      alt={biz.name || 'Logo da empresa'}
                      fill
                      className="object-contain p-0.5"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col max-w-[150px]">
                    <span className="text-xs font-bold text-stone-900 group-hover/card:text-[#3B0B14] truncate transition-colors">
                      {biz.name}
                    </span>
                    {biz.category_name && (
                      <span className="text-[10px] text-stone-500 truncate mt-0.5">
                        {biz.category_name}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dh-container py-4" id="patrocinadas">
      <div>
        <h2 className="dh-section-title">Empresas Patrocinadas</h2>
        <p className="text-xs text-gray-500 mt-1">Destaques comerciais e empresas pilares da nossa rede.</p>
      </div>

      {/* Grid de 3 colunas para Empresas Patrocinadas (Cards maiores e mais destacados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {items.map((biz) => (
          <BusinessCard key={biz.id} data={biz} variant="featured" />
        ))}
      </div>
    </section>
  );
}
