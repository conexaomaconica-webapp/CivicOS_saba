'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { resolveCategoryIcon } from '@/lib/directory/category-icons';

export type DirectoryCategoryItem = {
  id: string;
  slug: string;
  name: string;
  icon_name?: string | null;
};

type DirectoryCategoriesProps = {
  categories?: DirectoryCategoryItem[];
  onCategorySelect?: (slug: string) => void;
};

export function DirectoryCategories({ categories = [], onCategorySelect }: DirectoryCategoriesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Carrossel: as setas só aparecem quando há mais categorias do que cabem na largura.
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateArrows();
    el.addEventListener('scroll', updateArrows, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateArrows) : null;
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      observer?.disconnect();
    };
  }, [updateArrows, categories.length]);

  if (!categories.length) return null;

  const scrollPage = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' });
  };

  const handleCategoryClick = (catSlug: string) => {
    if (onCategorySelect) {
      onCategorySelect(catSlug);
      return;
    }
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('cat', catSlug);
    params.set('page', '1');
    const targetPath = pathname === '/guia' || pathname === '/guia/' ? '/guia/empresas' : pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  return (
    <section className="dh-container dh-mobile-visible-section py-4" id="categorias-destaque">
      {/* Botão 'Ver todas' alinhado à direita */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="dh-section-title">Explore por Categoria</h2>
        <Link
          href="/guia/empresas"
          className="text-xs font-bold text-amber-900 flex items-center gap-1 hover:underline bg-white/60 px-3 py-1.5 rounded-full border border-amber-900/10 shadow-2xs"
        >
          <span>Ver todas</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Carrossel de categorias principais (arraste no celular; setas no computador quando há muitas) */}
      <div className="dh-categories-carousel-wrap">
        {canPrev && (
          <button type="button" onClick={() => scrollPage(-1)} aria-label="Ver categorias anteriores" className="dh-categories-arrow dh-categories-arrow--prev">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <div ref={trackRef} className="dh-categories-carousel" role="list" aria-label="Categorias principais">
          {categories.map((cat) => {
            const rawIcon = (cat.icon_name || '').toLowerCase().trim();
            // Dynamic icon resolution with elegant fallback if icon is not mapped or missing
            const IconComp = resolveCategoryIcon(rawIcon);

            return (
              <button
                key={cat.id}
                type="button"
                role="listitem"
                onClick={() => handleCategoryClick(cat.slug)}
                className="dh-category-card dh-category-card--slide"
                title={`Filtrar por ${cat.name}`}
              >
                <div className="dh-category-card__icon">
                  <IconComp className="w-5 h-5" />
                </div>
                <span className="dh-category-card__name">{cat.name}</span>
              </button>
            );
          })}
        </div>
        {canNext && (
          <button type="button" onClick={() => scrollPage(1)} aria-label="Ver mais categorias" className="dh-categories-arrow dh-categories-arrow--next">
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </section>
  );
}
