'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

type GalleryImage = { id: string; url: string; alt?: string | null };

/**
 * Galeria da loja: miniaturas que ampliam ao clicar, com navegação para o lado (setas na tela,
 * teclado ← → e deslizar o dedo no celular). Esc ou clique fora fecham.
 */
export function LodgeGallery({ images, lodgeName }: { images: GalleryImage[]; lodgeName: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const total = images.length;
  const isOpen = index !== null;

  const go = useCallback(
    (step: number) => setIndex((current) => (current === null ? current : (current + step + total) % total)),
    [total],
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIndex(null);
      else if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'ArrowRight') go(1);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, go]);

  if (total === 0) return null;
  const current = index !== null ? images[index] : null;
  const altOf = (img: GalleryImage) => img.alt || `Foto da ${lodgeName}`;

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Ampliar foto ${i + 1} de ${total}`}
            className="group relative h-40 cursor-zoom-in overflow-hidden rounded-xl border border-stone-200 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt={altOf(img)} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              <ZoomIn className="h-6 w-6 text-white drop-shadow-md" aria-hidden="true" />
            </span>
          </button>
        ))}
      </div>

      {current &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Galeria de fotos — ${lodgeName}`}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/90 p-4 backdrop-blur-md"
            onClick={() => setIndex(null)}
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const start = touchStartX.current;
              const end = e.changedTouches[0]?.clientX;
              touchStartX.current = null;
              if (start == null || end == null || total < 2) return;
              if (Math.abs(end - start) > 50) go(end < start ? 1 : -1);
            }}
          >
            <button
              type="button"
              onClick={() => setIndex(null)}
              aria-label="Fechar"
              className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[#C9A227]/40 bg-stone-900/90 text-stone-200 hover:text-[#C9A227]"
            >
              <X className="h-5 w-5" />
            </button>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(-1); }}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#C9A227]/40 bg-stone-900/80 text-white hover:bg-[#3B0B14] sm:left-6"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); go(1); }}
                  aria-label="Próxima foto"
                  className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#C9A227]/40 bg-stone-900/80 text-white hover:bg-[#3B0B14] sm:right-6"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}

            <figure className="flex max-h-full max-w-5xl flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.url} alt={altOf(current)} className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-2xl" />
              <figcaption className="text-xs font-medium text-stone-300">
                {index! + 1} / {total}
                {current.alt ? ` — ${current.alt}` : ''}
              </figcaption>
            </figure>
          </div>,
          document.body,
        )}
    </>
  );
}
