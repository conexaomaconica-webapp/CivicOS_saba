'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export type DirectoryBannerItem = {
  id: string;
  title: string;
  subtitle?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  image_desktop_url: string;
};

type DirectoryCarouselProps = {
  banners?: DirectoryBannerItem[];
};

export function DirectoryCarousel({ banners = [] }: DirectoryCarouselProps) {
  if (!banners.length) return null;

  const current = banners[0];
  if (!current) return null;

  return (
    <section className="dh-container">
      <div className="dh-carousel-card">
        <div className="dh-carousel-card__content">
          {current.subtitle && <div className="dh-carousel-card__tag">{current.subtitle}</div>}
          <h2 className="dh-carousel-card__title">{current.title}</h2>
          {current.cta_text && (
            <Link href={current.cta_url || '/guia'} className="dh-carousel-card__cta">
              <span>{current.cta_text}</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div
          className="dh-carousel-card__media"
          style={{ backgroundImage: `url(${current.image_desktop_url})` }}
        />
      </div>
    </section>
  );
}
