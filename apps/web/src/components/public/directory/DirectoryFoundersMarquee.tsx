'use client';

import React from 'react';
import Link from 'next/link';
import type { DirectorySponsoredItem } from './DirectorySponsored';

type DirectoryFoundersMarqueeProps = {
  items?: DirectorySponsoredItem[];
  speed?: number;
};

export function DirectoryFoundersMarquee({
  items = [],
  speed = 40,
}: DirectoryFoundersMarqueeProps) {
  if (!items.length) return null;

  // Garante itens suficientes para loop infinito fluido da esteira
  let marqueeItems = [...items];
  while (marqueeItems.length < 12 && marqueeItems.length > 0) {
    marqueeItems = [...marqueeItems, ...items];
  }
  const loopedItems = [...marqueeItems, ...marqueeItems];

  return (
    <section className="dh-container dh-mobile-visible-section py-4" id="pedra-fundamental">
      {/* Título Institucional Nobre: Empresas Fundadoras — Pedra Fundamental */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C9A227]" />
          <p className="text-xs font-bold uppercase tracking-wider text-[#4b161b]">
            Empresas Fundadoras — Pedra Fundamental
          </p>
        </div>
      </div>

      {/* Esteira de Marcas Padronizada com o App (Com cantos sombreados suaves) */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-white/70 border border-[#C9A227]/30 shadow-xs py-3.5 px-2 group">
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
                href={`/guia/${biz.slug}?src=founders_pedra_fundamental`}
                title={businessTitle}
                className="group/item flex flex-col items-center gap-1.5 shrink-0 transition-transform duration-200 hover:-translate-y-0.5 focus:outline-none"
                style={{ width: '92px' }}
              >
                {/* Container da Logo com Borda Dourada Nobre */}
                <div
                  className="relative w-20 h-20 rounded-[22px] border-2 border-[#e7dacd] group-hover/item:border-[#C9A227] shadow-xs group-hover/item:shadow-md flex items-center justify-center p-2 transition-all overflow-hidden"
                  style={{ backgroundColor: bgColor }}
                >
                  {biz.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={biz.logo_url}
                      alt={biz.name || 'Logo da empresa fundadora'}
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
                <span className="text-[11px] font-bold text-[#4b161b] text-center w-full truncate px-0.5 group-hover/item:text-[#C9A227] transition-colors">
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

