'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MapPin, Navigation, ExternalLink, X } from 'lucide-react';
import { BusinessListCard } from './BusinessListCard';
import type { BusinessCardData } from './BusinessCard';

type BusinessMapViewProps = {
  items: BusinessCardData[];
};

export function BusinessMapView({ items }: BusinessMapViewProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(items[0]?.slug || null);

  const selectedBiz = items.find((b) => b.slug === selectedSlug) || items[0];

  const handleOpenRoute = (biz: BusinessCardData) => {
    if (biz.latitude && biz.longitude) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}`, '_blank');
    } else if (biz.city) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.name} ${biz.city}`)}`, '_blank');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start my-6 min-h-[600px]">
      {/* Coluna Esquerda: Lista de Resultados (5 colunas no desktop) */}
      <div className="lg:col-span-6 space-y-4 max-h-[720px] overflow-y-auto pr-1">
        {items.map((biz) => (
          <div
            key={biz.id}
            onClick={() => setSelectedSlug(biz.slug)}
            className={`cursor-pointer transition-all ${
              selectedSlug === biz.slug ? 'ring-2 ring-amber-800 rounded-2xl' : ''
            }`}
          >
            <BusinessListCard
              data={biz}
              onViewOnMap={(slug) => setSelectedSlug(slug)}
            />
          </div>
        ))}
      </div>

      {/* Coluna Direita: Mapa Interativo Split-Screen (6 colunas no desktop) */}
      <div className="lg:col-span-6 bg-stone-900 rounded-2xl overflow-hidden border border-stone-300 shadow-md h-[550px] lg:h-[720px] relative sticky top-24">
        {/* Placeholder Canvas do Mapa com Pins */}
        <div className="w-full h-full bg-[#e5e3df] relative flex items-center justify-center p-6 text-center">
          {/* Fundo Simulado do Mapa */}
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/40 via-stone-200 to-amber-100/30 opacity-80" />

          {/* Renderização de Pins Interativos no Mapa */}
          <div className="absolute inset-0 p-8 flex flex-wrap items-center justify-around z-10">
            {items.map((biz) => {
              const isSelected = selectedBiz?.id === biz.id;

              return (
                <button
                  key={biz.id}
                  onClick={() => setSelectedSlug(biz.slug)}
                  className={`relative p-2 rounded-full transition-transform duration-300 transform hover:scale-125 ${
                    isSelected
                      ? 'bg-[#5d1523] text-white shadow-xl scale-125 z-20 ring-4 ring-amber-400'
                      : 'bg-white text-amber-950 shadow-md hover:bg-amber-100 z-10'
                  }`}
                  title={biz.name}
                >
                  <MapPin className="w-5 h-5" />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-amber-950 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-xs">
                    {biz.name.slice(0, 14)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Popup Card sobre o Mapa */}
          {selectedBiz && (
            <div className="absolute bottom-6 left-6 right-6 bg-white rounded-2xl p-4 border border-stone-300 shadow-2xl z-30 animate-in slide-in-from-bottom duration-300 text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border bg-amber-950 text-amber-400 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                    {selectedBiz.logo_url ? (
                      <img src={selectedBiz.logo_url} alt={selectedBiz.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedBiz.name.slice(0, 2).toUpperCase()
                    )}
                  </div>

                  <div>
                    <h4 className="font-serif font-bold text-gray-900 text-sm line-clamp-1">
                      {selectedBiz.name}
                    </h4>
                    <p className="text-xs text-stone-500 line-clamp-1">
                      {selectedBiz.category_name || 'Serviços'} · {selectedBiz.city || 'Feira de Santana'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedSlug(null)}
                  className="text-stone-400 hover:text-stone-700 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Botões de Ação do Mapa */}
              <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleOpenRoute(selectedBiz)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-50 text-amber-950 border border-amber-900/20 px-3 py-2 rounded-xl text-xs font-bold hover:bg-amber-100 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-800" />
                  <span>Traçar rota</span>
                </button>

                <Link
                  href={`/guia/${selectedBiz.slug}`}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-[#3b0b14] text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#5d1523] transition-colors"
                >
                  <span>Ver empresa</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
