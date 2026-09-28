'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { BusinessCard, type BusinessCardData } from './BusinessCard';

export type DirectorySponsoredItem = BusinessCardData;

type DirectorySponsoredProps = {
  items?: DirectorySponsoredItem[];
  displayMode?: 'cards' | 'logos';
};

export function DirectorySponsored({ items = [], displayMode = 'cards' }: DirectorySponsoredProps) {
  if (!items.length) return null;

  if (displayMode === 'logos') {
    // Fill array so there's enough items to loop seamlessly
    let marqueeItems = [...items];
    while (marqueeItems.length < 12 && marqueeItems.length > 0) {
      marqueeItems = [...marqueeItems, ...items];
    }
    const loopedItems = [...marqueeItems, ...marqueeItems];

    return (
      <section className="dh-container py-6" id="patrocinadas">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="dh-section-title text-stone-900">Empresas Patrocinadas</h2>
            <p className="text-xs text-stone-500 mt-1">Parceiros em destaque e empresas pilares da nossa rede.</p>
          </div>
          <span className="hidden sm:inline-flex text-[11px] font-semibold text-amber-900 bg-amber-100/80 px-2.5 py-1 rounded-full border border-amber-200">
            ♾️ Destaques da Rede
          </span>
        </div>

        {/* Outer Marquee Container with Fading Edges */}
        <div className="relative w-full overflow-hidden rounded-2xl bg-white/60 border border-stone-200/80 p-3 shadow-sm group">
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />

          {/* Marquee Track */}
          <div className="dh-logo-marquee-track">
            {loopedItems.map((biz, idx) => {
              const logoSrc = biz.logo_url || '/logoconexao_red_vert.png';
              return (
                <Link
                  key={`${biz.id}-${idx}`}
                  href={`/guia/${biz.slug}`}
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
