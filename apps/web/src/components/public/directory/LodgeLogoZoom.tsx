'use client';

import React, { useState } from 'react';
import { Landmark, ZoomIn } from 'lucide-react';
import { ImageZoomModal } from '@/components/public/business/shared/ImageZoomModal';

type LodgeLogoZoomProps = {
  logoUrl?: string | null;
  lodgeName: string;
  /** Classes do quadro do brasão (tamanho, borda, posição). */
  className?: string;
  /** Classes do ícone exibido quando a loja não tem brasão. */
  fallbackIconClassName?: string;
};

/**
 * Brasão da loja que amplia ao clicar. A lupa só aparece ao passar o mouse (ou ao focar pelo teclado);
 * em repouso mostra apenas o brasão. Sem brasão cadastrado, mostra o ícone padrão e não amplia.
 */
export function LodgeLogoZoom({
  logoUrl,
  lodgeName,
  className = 'w-16 h-16 rounded-xl bg-white border border-stone-200 shadow-2xs p-1',
  fallbackIconClassName = 'w-8 h-8 text-[#3b0b14]',
}: LodgeLogoZoomProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!logoUrl) {
    return (
      <div className={`${className} shrink-0 flex items-center justify-center overflow-hidden`}>
        <Landmark className={fallbackIconClassName} />
      </div>
    );
  }

  const altText = `Brasão — ${lodgeName}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Ampliar o brasão — ${lodgeName}`}
        className={`${className} group/logo relative shrink-0 flex items-center justify-center overflow-hidden cursor-zoom-in focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={altText} className="max-w-full max-h-full object-contain object-center" />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/45 opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100">
          <ZoomIn className="w-5 h-5 text-white drop-shadow-md" aria-hidden="true" />
        </span>
      </button>

      <ImageZoomModal isOpen={isOpen} onClose={() => setIsOpen(false)} imageUrl={logoUrl} altText={altText} imageOnly />
    </>
  );
}
