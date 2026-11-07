'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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

  const hasOverlayText = Boolean(current.subtitle?.trim() || current.cta_text?.trim());
  const goToPrevious = () => setActiveIndex((currentIndex) => (currentIndex - 1 + banners.length) % banners.length);
  const goToNext = () => setActiveIndex((currentIndex) => (currentIndex + 1) % banners.length);

  const alt = current.title || 'Banner institucional';

  const renderBannerMedia = () => (
    <picture className="w-full h-full block">
      {current.image_mobile_url ? (
        <source media="(max-width: 639px)" srcSet={current.image_mobile_url} />
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={current.image_desktop_url}
        alt={alt}
        loading={activeIndex === 0 ? 'eager' : 'lazy'}
        fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
        decoding="async"
        className={`w-full h-full block rounded-xl md:rounded-2xl ${
          current.image_mobile_url
            ? 'object-cover object-center'
            : 'object-cover object-center'
        }`}
        onError={(e) => {
          if (current.image_mobile_url && e.currentTarget.src !== current.image_desktop_url) {
            e.currentTarget.src = current.image_desktop_url;
          }
        }}
      />
    </picture>
  );

  return (
    <section
      className="dh-container dh-mobile-visible-section py-2 md:py-4"
      aria-roledescription="carrossel"
      aria-label="Destaques"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {!hasOverlayText ? (
        <div
          className={`relative w-full overflow-hidden rounded-xl md:rounded-2xl shadow-xs transition-opacity duration-300 bg-neutral-900/5 ${
            current.image_mobile_url
              ? 'aspect-[16/9] sm:aspect-[801/240] md:aspect-[801/207]'
              : 'aspect-[2.35/1] sm:aspect-[801/240] md:aspect-[801/207] min-h-[120px]'
          }`}
        >
          {current.cta_url ? (
            <Link href={current.cta_url} className="block w-full h-full cursor-pointer">
              {renderBannerMedia()}
            </Link>
          ) : (
            renderBannerMedia()
          )}

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Banner anterior"
                className="absolute left-2.5 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-1.5 md:p-2 text-white backdrop-blur-sm transition hover:bg-black/70 cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Próximo banner"
                className="absolute right-2.5 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-1.5 md:p-2 text-white backdrop-blur-sm transition hover:bg-black/70 cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
              </button>
              <div
                className="absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 gap-1.5"
                role="tablist"
                aria-label="Selecionar banner"
              >
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={`Exibir banner ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-1.5 md:h-2 rounded-full border border-white/80 transition-all ${
                      index === activeIndex ? 'w-5 md:w-7 bg-white' : 'w-1.5 md:w-2 bg-white/45 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="dh-carousel-card transition-opacity duration-300">
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
          <div className="dh-carousel-card__media">
            <picture className="block h-full">
              {current.image_mobile_url && <source media="(max-width: 640px)" srcSet={current.image_mobile_url} />}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={current.image_desktop_url}
                alt={alt}
                loading={activeIndex === 0 ? 'eager' : 'lazy'}
                fetchPriority={activeIndex === 0 ? 'high' : 'auto'}
                decoding="async"
                className="h-full w-full object-cover object-center"
              />
            </picture>
          </div>

          {banners.length > 1 && (
            <>
              <button
                type="button"
                onClick={goToPrevious}
                aria-label="Banner anterior"
                className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={goToNext}
                aria-label="Próximo banner"
                className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70 cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <div
                className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2"
                role="tablist"
                aria-label="Selecionar banner"
              >
                {banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={`Exibir banner ${index + 1}`}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full border border-white/80 transition-all ${
                      index === activeIndex ? 'w-7 bg-white' : 'w-2.5 bg-white/45 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
