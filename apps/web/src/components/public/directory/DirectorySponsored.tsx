'use client';

import React from 'react';
import Link from 'next/link';
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
  displayMode = 'logos',
  speed = 40,
}: DirectorySponsoredProps) {
  if (!items.length) return null;

  if (displayMode === 'logos') {
    // Garante itens suficientes para loop infinito fluido da esteira
    let marqueeItems = [...items];
    while (marqueeItems.length < 12 && marqueeItems.length > 0) {
      marqueeItems = [...marqueeItems, ...items];
    }
    const loopedItems = [...marqueeItems, ...marqueeItems];

    return (
      <section className="dh-container dh-mobile-visible-section py-4" id="patrocinadas">
        {/* Título Pequeno e Discreto: Empresas — Pedra Fundamental (substituindo o título grande) */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#4b161b]">
            Empresas — Pedra Fundamental
          </p>
        </div>

        {/* Esteira de Marcas Padronizada com o App (Com cantos sombreados suaves) */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-white/70 border border-stone-200/80 shadow-xs py-3.5 px-2 group">
          <div className="absolute left-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 sm:w-16 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

          {/* Marquee Track contínuo */}
          <div
            className="dh-logo-marquee-track items-start gap-4 sm:gap-5"
            style={{ '--marquee-speed': `${Math.max(10, speed)}s` } as React.CSSProperties}
          >
            {loopedItems.map((biz, idx) => {
              const businessTitle = `${biz.name}${biz.category_name ? ` • ${biz.category_name}` : ''}`;
              const bgColor = biz.logo_background_color || '#ffffff';

              return (
                <Link
                  key={`${biz.id}-${idx}`}
                  href={`/guia/${biz.slug}?src=featured_sponsored`}
                  title={businessTitle}
                  className="group/item flex flex-col items-center gap-1.5 shrink-0 transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none"
                  style={{ width: '92px' }}
                >
                  {/* Container da Logo com Tamanho Aumentado e Fundo Adaptativo */}
                  <div
                    className="relative w-20 h-20 rounded-[22px] border-2 border-[#e7dacd] group-hover/item:border-[#c9a227] shadow-xs group-hover/item:shadow-md flex items-center justify-center p-2 transition-all overflow-hidden"
                    style={{ backgroundColor: bgColor }}
                  >
                    {biz.logo_url ? (
                      <img
                        src={biz.logo_url}
                        alt={biz.name || 'Logo da empresa'}
                        loading="lazy"
                        className="w-full h-full object-contain transition-transform duration-300 group-hover/item:scale-105"
                      />
                    ) : (
                      <span className="font-serif font-bold text-2xl text-[#4b161b]">
                        {biz.name ? biz.name.charAt(0).toUpperCase() : 'M'}
                      </span>
                    )}
                  </div>

                  {/* Nome da Marca abaixo do ícone */}
                  <span className="text-[11px] font-bold text-[#4b161b] text-center w-full truncate px-0.5 group-hover/item:text-[#c9a227] transition-colors">
                    {biz.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="dh-container dh-mobile-visible-section py-4" id="patrocinadas">
      <div className="mb-3">
        <p className="text-xs font-bold uppercase tracking-wider text-[#4b161b]">
          Empresas — Pedra Fundamental
        </p>
      </div>

      {/* Grid de 3 colunas para Empresas Patrocinadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        {items.map((biz, idx) => (
          <BusinessCard key={biz.id} data={biz} variant="featured" discoverySource="featured_sponsored" priority={idx === 0} />
        ))}
      </div>
    </section>
  );
}
