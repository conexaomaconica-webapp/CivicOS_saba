'use client';

import React, { useEffect, useState } from 'react';
import { Expand, X } from 'lucide-react';

type ConnectionPhotoPreviewProps = {
  src: string;
  alt: string;
  containerClassName?: string;
  imgClassName?: string;
};

/**
 * Exibe a foto da conexão sem cortes (`object-contain`) e permite clicar para ampliar em lightbox.
 */
export function ConnectionPhotoPreview({
  src,
  alt,
  containerClassName = 'relative w-full overflow-hidden bg-stone-100',
  imgClassName = 'h-48 w-full object-contain',
}: ConnectionPhotoPreviewProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group block cursor-zoom-in text-left ${containerClassName}`}
        aria-label={`Ampliar foto: ${alt}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={imgClassName} loading="lazy" />
        <span className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white opacity-90 transition group-hover:opacity-100">
          <Expand className="h-3 w-3" aria-hidden="true" />
          Ampliar
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar foto ampliada"
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[94vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
}

