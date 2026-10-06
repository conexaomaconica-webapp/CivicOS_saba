'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export type DirectoryBannerItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  image_desktop_url: string;
  image_mobile_url?: string | null;
};

type DirectoryCarouselProps = {
  banners?: DirectoryBannerItem[];
};

// O otimizador do Next só serve hospedagens liberadas em next.config (Supabase Storage); URLs externas ficam como estão.
const SUPABASE_HOST = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname;
  } catch {
    return '';
  }
})();
const canOptimize = (url: string) => {
  try {
    return Boolean(SUPABASE_HOST) && new URL(url).hostname === SUPABASE_HOST;
  } catch {
    return false;
  }
};

export function DirectoryCarousel({ banners = [] }: DirectoryCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (activeIndex >= banners.length) setActiveIndex(0);
  }, [activeIndex, banners.length]);

  useEffect(() => {
    if (paused || banners.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [banners.length, paused]);

  if (!banners.length) return null;
  const current = banners[activeIndex];
  if (!current) return null;

  const imageOnly = !current.title?.trim() && !current.subtitle?.trim() && !current.cta_text?.trim();
  const goToPrevious = () => setActiveIndex((currentIndex) => (currentIndex - 1 + banners.length) % banners.length);
  const goToNext = () => setActiveIndex((currentIndex) => (currentIndex + 1) % banners.length);

  const alt = current.title || 'Banner institucional';
  const fit = `object-cover ${imageOnly ? 'object-center' : ''}`;
  const desktopOptimizable = canOptimize(current.image_desktop_url);
  const mobileOptimizable = Boolean(current.image_mobile_url) && canOptimize(current.image_mobile_url as string);

  const image =
    desktopOptimizable && (!current.image_mobile_url || mobileOptimizable) ? (
      // Imagens do Supabase passam pelo otimizador: tamanho certo para a tela, em WebP/AVIF, com carregamento sob demanda.
      <div className={imageOnly ? 'absolute inset-0' : 'relative block h-full w-full'}>
        <Image
          src={current.image_desktop_url}
          alt={alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 100vw, 1280px"
          quality={72}
          priority={activeIndex === 0 && !current.image_mobile_url}
          className={`${fit} ${current.image_mobile_url ? 'max-sm:hidden' : ''}`}
        />
        {current.image_mobile_url && (
          <Image
            src={current.image_mobile_url}
            alt={alt}
            fill
            sizes="100vw"
            quality={72}
            className={`${fit} sm:hidden`}
          />
        )}
      </div>
    ) : (
      <picture className={imageOnly ? 'absolute inset-0' : 'block h-full'}>
        {current.image_mobile_url && <source media="(max-width: 640px)" srcSet={current.image_mobile_url} />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.image_desktop_url} alt={alt} loading="lazy" className={`h-full w-full ${fit}`} />
      </picture>
    );

  return (
    <section
      className="dh-container dh-mobile-visible-section py-4"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className={`dh-carousel-card transition-opacity duration-300 ${imageOnly ? '!block min-h-[280px]' : ''}`}>
        {imageOnly ? (
          current.cta_url ? <Link href={current.cta_url} className="absolute inset-0">{image}</Link> : image
        ) : (
          <>
            <div className="dh-carousel-card__content">
              {current.subtitle && <div className="dh-carousel-card__tag">{current.subtitle}</div>}
              <h2 className="dh-carousel-card__title">{current.title}</h2>
              {current.cta_text && (
                <Link href={current.cta_url || '/guia'} className="dh-carousel-card__cta">
                  <span>{current.cta_text}</span>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            <div className="dh-carousel-card__media">{image}</div>
          </>
        )}

        {banners.length > 1 && (
          <>
            <button type="button" onClick={goToPrevious} aria-label="Banner anterior" className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button type="button" onClick={goToNext} aria-label="Próximo banner" className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70">
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2" role="tablist" aria-label="Selecionar banner">
              {banners.map((banner, index) => (
                <button
                  key={banner.id}
                  type="button"
                  role="tab"
                  aria-selected={index === activeIndex}
                  aria-label={`Exibir banner ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full border border-white/80 transition-all ${index === activeIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/75'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
