'use client';

import React, { useState } from 'react';
import { Landmark, ZoomIn } from 'lucide-react';
import { genericCrestForPotency } from '@/lib/lodges/generic-crest';
import { ImageZoomModal } from '@/components/public/business/shared/ImageZoomModal';

type LodgeLogoZoomProps = {
  logoUrl?: string | null;
  lodgeName: string;
  /** Classes do quadro do brasão (tamanho, borda, posição). */
  className?: string;
  /** Classes do ícone exibido quando a loja não tem brasão. */
  fallbackIconClassName?: string;
  /** Potência da loja: sem brasão próprio, mostra o brasão genérico dela (se houver). */
  potency?: string | null;
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
  potency,
}: LodgeLogoZoomProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [genericFailed, setGenericFailed] = useState(false);
  const genericSrc = !logoUrl && !genericFailed ? genericCrestForPotency(potency) : null;

  // Brasão próprio da loja ou, na falta dele, o genérico da potência: ambos ampliam ao clicar.
  const shownSrc = logoUrl || genericSrc;
  if (!shownSrc) {
    return (
      <div className={`${className} shrink-0 flex items-center justify-center overflow-hidden`}>
        <Landmark className={fallbackIconClassName} />
      </div>
    );
  }

  const altText = logoUrl ? `Brasão — ${lodgeName}` : `Brasão da potência (genérico) — ${lodgeName}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Ampliar o brasão — ${lodgeName}`}
        className={`${className} group/logo relative shrink-0 flex items-center justify-center overflow-hidden cursor-zoom-in origin-top-left transition-all duration-200 ease-out hover:scale-[1.3] hover:z-40 hover:shadow-2xl focus-visible:scale-[1.3] focus-visible:z-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500`}
      >
        <img
          src={shownSrc}
          alt={altText}
          loading="lazy"
          decoding="async"
          className="max-w-full max-h-full object-contain object-center"
          onError={logoUrl ? undefined : () => setGenericFailed(true)}
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-stone-900/35 opacity-0 transition-opacity group-hover/logo:opacity-100 group-focus-visible/logo:opacity-100">
          <ZoomIn className="w-5 h-5 text-white drop-shadow-md" aria-hidden="true" />
        </span>
      </button>

      <ImageZoomModal isOpen={isOpen} onClose={() => setIsOpen(false)} imageUrl={shownSrc} altText={altText} imageOnly />
    </>
  );
}
