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
                className="group snap-start shrink-0 w-[270px] sm:w-[290px] md:w-[310px] flex flex-col justify-start text-left focus:outline-none transition-transform duration-200 hover:-translate-y-1"
              >
                {/* 1. Foto / Flyer com Proporção Ampla e Cantos Arredondados (como na imagem) */}
                <div className="relative w-full aspect-16/10 rounded-2xl overflow-hidden bg-gradient-to-br from-[#3b0b14] via-[#4b161b] to-stone-900 border border-stone-200/90 shadow-xs group-hover:shadow-md group-hover:border-[#c59b27]/60 transition-all">
                  {evt.cover_image_url ? (
                    <Image
                      src={evt.cover_image_url}
                      alt={`Imagem do evento ${evt.title}`}
                      fill
                      unoptimized
                      sizes="(max-width: 768px) 280px, 310px"
                      className="object-cover group-hover:scale-104 transition-transform duration-300"
                    />
                  ) : (
                    /* Fallback nobre com identidade Conexão Maçônica */
                    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-gradient-to-br from-[#4b161b] to-[#200508] text-white">
                      <div className="w-9 h-9 rounded-full bg-[#c59b27]/20 border border-[#c59b27]/50 flex items-center justify-center mb-2">
                        <Calendar className="w-4 h-4 text-[#c59b27]" />
                      </div>
                      <span className="font-serif font-bold text-sm text-amber-100 line-clamp-2">
                        {evt.title}
                      </span>
                      <span className="text-[10px] text-amber-200/80 mt-1 uppercase tracking-wider font-semibold">
                        Conexão Maçônica
                      </span>
                    </div>
                  )}

                  {/* Badge de Preço / Gratuito sobreposto discretamente no canto */}
                  {evt.price_info && (
                    <div className="absolute bottom-2.5 left-2.5 z-10">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#1f1914]/85 text-amber-200 backdrop-blur-xs border border-amber-300/30 shadow-xs">
                        <Tag className="w-2.5 h-2.5 text-[#c59b27]" />
                        <span>{evt.price_info}</span>
                      </span>
                    </div>
                  )}

                  {/* Badge de Modalidade / Tipo no topo direito */}
                  {evt.badge_text && (
                    <div className="absolute top-2.5 right-2.5 z-10">
                      <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 text-[#4b161b] shadow-xs backdrop-blur-xs border border-white/60">
                        {evt.badge_text}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Informações Textuais Abaixo da Imagem (Exatamente como o print) */}
                <div className="pt-2.5 px-0.5 space-y-1">
                  {/* Título do Evento em Negrito */}
                  <h3 className="font-bold text-sm md:text-base text-stone-900 group-hover:text-[#4b161b] transition-colors line-clamp-2 leading-snug">
                    {evt.title}
                  </h3>

                  {/* Localização (Cidade, UF ou Espaço) */}
                  <p className="text-xs text-stone-500 font-medium flex items-center gap-1 line-clamp-1">
                    <MapPin className="w-3 h-3 text-[#c59b27] shrink-0" />
                    <span>{evt.location_line}</span>
                  </p>

                  {/* Data e Hora Formatados */}
                  <p className="text-xs text-stone-600 font-semibold flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-stone-400 shrink-0" />
                    <span>{evt.event_date_formatted}</span>
                  </p>
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

