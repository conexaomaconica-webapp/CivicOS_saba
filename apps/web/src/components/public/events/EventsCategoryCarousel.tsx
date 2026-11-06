'use client';

import React, { useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Tag } from 'lucide-react';

export interface CarouselEventCardItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string | null;
  cover_image_url?: string | null;
  event_date_formatted: string;
  location_line: string;
  badge_text?: string | null;
  price_info?: string | null;
  organizer_name?: string | null;
  organizer_type?: string;
}

interface EventsCategoryCarouselProps {
  categoryTitle: string;
  categoryIcon?: string;
  seeAllHref?: string;
  events: CarouselEventCardItem[];
}

export function EventsCategoryCarousel({
  categoryTitle,
  categoryIcon,
  seeAllHref,
  events,
}: EventsCategoryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  if (!events || events.length === 0) return null;

  return (
    <section className="space-y-3.5 relative" aria-label={categoryTitle}>
      {/* Cabeçalho da Categoria com Título e "Ver tudo" (Igual ao modelo de referência) */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {categoryIcon && <span className="text-xl">{categoryIcon}</span>}
          <h2 className="text-lg md:text-xl font-bold font-serif text-[#1f1914] tracking-tight">
            {categoryTitle}
          </h2>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
            {events.length}
          </span>
        </div>

        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-xs md:text-sm font-semibold text-[#0284c7] hover:text-[#0369a1] hover:underline flex items-center gap-1 shrink-0 transition-colors"
          >
            <span>Ver tudo</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Container do Carrossel com Botões de Navegação Flutuantes */}
      <div className="relative group/carousel">
        {/* Botão Anterior (Scroll Left) */}
        <button
          type="button"
          onClick={scrollLeft}
          aria-label="Rolar eventos para a esquerda"
          className="absolute -left-3.5 top-1/3 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/95 text-stone-700 shadow-md border border-stone-200 flex items-center justify-center hover:bg-[#3b0b14] hover:text-[#c59b27] hover:border-[#c59b27] transition-all opacity-0 group-hover/carousel:opacity-100 focus:opacity-100 disabled:opacity-0 cursor-pointer hidden md:flex"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Linha Horizontal de Cards com Scroll-Snap Suave */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          aria-label={`Lista de eventos: ${categoryTitle}`}
          className="flex items-stretch gap-4 md:gap-5 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-none focus:ring-1 focus:ring-[#c59b27]/50 rounded-2xl"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {events.map((evt) => {
            const detailUrl = `/eventos/${evt.slug || evt.id}`;
            return (
              <Link
                key={evt.id}
                href={detailUrl}
                className="group snap-start shrink-0 w-[280px] sm:w-[305px] md:w-[325px] bg-white border border-[#E8E2D9] rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:border-[#c59b27]/60 transition-all duration-300 flex flex-col justify-between text-left focus:outline-none hover:-translate-y-1"
              >
                {/* 1. IMAGEM DO EVENTO */}
                <div className="relative w-full aspect-[16/10] bg-stone-900 overflow-hidden border-b border-stone-100">
                  {evt.cover_image_url ? (
                    <img
                      src={evt.cover_image_url}
                      alt={`Imagem do evento ${evt.title}`}
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#4b161b] via-[#3b0b14] to-stone-950 text-white">
                      <div className="w-9 h-9 rounded-full bg-[#c59b27]/20 border border-[#c59b27]/50 flex items-center justify-center mb-1.5">
                        <Calendar className="w-4 h-4 text-[#c59b27]" />
                      </div>
                      <span className="font-serif font-bold text-xs text-amber-100 line-clamp-2">
                        {evt.title}
                      </span>
                    </div>
                  )}

                  {/* Gradiente sutil inferior */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

                  {/* Badge da Categoria / Tipo no topo esquerdo */}
                  {evt.badge_text && (
                    <div className="absolute top-2.5 left-2.5 z-10">
                      <span className="inline-flex items-center text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/95 text-[#4b161b] shadow-xs backdrop-blur-xs border border-white/80">
                        {evt.badge_text}
                      </span>
                    </div>
                  )}

                  {/* Badge de Valores & Ingressos no topo direito */}
                  {evt.price_info && (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#1f1914]/90 text-[#c59b27] backdrop-blur-xs border border-[#c59b27]/40 shadow-xs">
                        <Tag className="w-2.5 h-2.5 text-[#c59b27]" />
                        <span>{evt.price_info}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* CONTEÚDO PRINCIPAL DO CARD */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-2">
                    {/* 2. TÍTULO */}
                    <h3 className="font-serif font-bold text-base text-stone-900 group-hover:text-[#4b161b] transition-colors line-clamp-2 leading-snug">
                      {evt.title}
                    </h3>

                    {/* 3. DATA E HORÁRIO */}
                    <div className="flex items-center gap-2 text-xs font-bold text-[#4b161b]">
                      <Calendar className="w-3.5 h-3.5 text-[#c59b27] shrink-0" />
                      <span className="line-clamp-1">{evt.event_date_formatted}</span>
                    </div>

                    {/* 4. LOCAL */}
                    <div className="flex items-center gap-2 text-xs text-stone-600 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-[#c59b27] shrink-0" />
                      <span className="line-clamp-1">{evt.location_line}</span>
                    </div>
                  </div>

                  {/* 5. REALIZAÇÃO (no final antes do botão) */}
                  <div className="pt-2 border-t border-stone-100 text-[11px] text-stone-500 font-semibold flex items-center gap-1.5">
                    <span className="uppercase tracking-wider text-stone-400">Realização:</span>
                    <strong className="text-stone-800 font-bold line-clamp-1">
                      {evt.organizer_name || 'Conexão Maçônica'}
                    </strong>
                  </div>
                </div>

                {/* 6. BOTÃO PARA CLICAR E ABRIR (Identidade Conexão Maçônica: Bordô e Dourado) */}
                <div className="p-3 bg-[#FAF8F5] border-t border-stone-100">
                  <div className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#3b0b14] to-[#4b161b] group-hover:from-[#4b161b] group-hover:to-[#3b0b14] text-[#c59b27] font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all border border-[#c59b27]/30">
                    <span>Conferir Evento &amp; RSVP</span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#c59b27] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Botão Próximo (Scroll Right - igual à setinha redonda do print) */}
        <button
          type="button"
          onClick={scrollRight}
          aria-label="Rolar eventos para a direita"
          className="absolute -right-3.5 top-1/3 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white text-stone-700 shadow-lg border border-stone-200 flex items-center justify-center hover:bg-[#3b0b14] hover:text-[#c59b27] hover:border-[#c59b27] transition-all cursor-pointer group-hover/carousel:scale-105"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

