'use client';

import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ImageZoomModal } from './ImageZoomModal';

type Certification = { id: string; url: string; zoom_percent?: number };

/**
 * Logo de certificação dentro de um quadro fixo. O zoom (100–300%) amplia a arte dentro do quadro,
 * útil quando a logo enviada tem muita margem em volta.
 */
export function CertificationLogo({
  url,
  zoom = 100,
  alt,
  className = '',
}: {
  url: string;
  zoom?: number;
  alt: string;
  className?: string;
}) {
  const scale = Math.min(3, Math.max(1, (zoom || 100) / 100));
  return (
    <div className={`overflow-hidden bg-white flex items-center justify-center ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        draggable={false}
        style={{ transform: `scale(${scale})` }}
        className="max-h-full max-w-full object-contain"
      />
    </div>
  );
}

type CertificationBadgesProps = {
  certifications?: Certification[];
  businessName?: string;
  /** inline: itens para a MESMA linha dos selos do cabeçalho; card: card lateral igual ao de reconhecimentos. */
  variant?: 'inline' | 'card';
  className?: string;
};

/**
 * Certificações de mercado (ISO etc.) do Plano Acácia. São selos de terceiros,
 * separados dos reconhecimentos institucionais. Clique na logo para ampliar.
 */
export function CertificationBadges({ certifications, businessName, variant = 'inline', className = '' }: CertificationBadgesProps) {
  const [zoomed, setZoomed] = useState<Certification | null>(null);
  const items = (certifications || []).filter((c) => c?.url);
  if (items.length === 0) return null;

  const alt = businessName ? `Certificação de ${businessName}` : 'Certificação da empresa';
  const isInline = variant === 'inline';

  const buttons = items.map((cert) => (
    <button
      key={cert.id}
      type="button"
      onClick={() => setZoomed(cert)}
      title="Clique para ampliar"
      aria-label={`Ampliar ${alt}`}
      className={`shrink-0 cursor-zoom-in transition-transform duration-300 hover:scale-105 ${
        isInline ? 'rounded-xl' : 'rounded-2xl shadow-lg'
      }`}
    >
      <CertificationLogo
        url={cert.url}
        zoom={cert.zoom_percent}
        alt={alt}
        className={
          isInline
            ? 'h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-[#C9A227]/50 shadow-md'
            : 'h-28 w-28 sm:h-32 sm:w-32 rounded-2xl border border-[#C9A227]/40'
        }
      />
    </button>
  ));

  return (
    <>
      {isInline ? (
        buttons
      ) : (
        <section className={`bg-[#3B0B14] border border-[#C9A227]/40 rounded-2xl p-6 shadow-xl space-y-4 ${className}`}>
          <div className="flex items-center justify-center gap-2 text-[#C9A227]">
            <BadgeCheck className="w-4 h-4" />
            <h2 className="text-xs font-serif font-bold uppercase tracking-wider">Certificações</h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6">{buttons}</div>
        </section>
      )}
      <ImageZoomModal
        isOpen={Boolean(zoomed)}
        onClose={() => setZoomed(null)}
        imageUrl={zoomed?.url || ''}
        altText={alt}
        title="Certificação"
        badge="Certificação de mercado"
        imageOnly
      />
    </>
  );
}
