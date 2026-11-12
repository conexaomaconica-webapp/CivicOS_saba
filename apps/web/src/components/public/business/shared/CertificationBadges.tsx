'use client';

import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ImageZoomModal } from './ImageZoomModal';

type Certification = { id: string; url: string };

type CertificationBadgesProps = {
  certifications?: Certification[];
  businessName?: string;
  /** header: logos pequenas no cabeçalho (fundo escuro); card: cartão "Certificações" na lateral. */
  variant?: 'header' | 'card';
  className?: string;
};

/**
 * Certificações de mercado (ISO etc.) do Plano Acácia. São selos de terceiros,
 * separados dos reconhecimentos institucionais. Clique na logo para ampliar.
 */
export function CertificationBadges({ certifications, businessName, variant = 'header', className = '' }: CertificationBadgesProps) {
  const [zoomed, setZoomed] = useState<Certification | null>(null);
  const items = (certifications || []).filter((c) => c?.url);
  if (items.length === 0) return null;

  const alt = businessName ? `Certificação de ${businessName}` : 'Certificação da empresa';
  const isHeader = variant === 'header';

  const logos = (
    <div className={`flex flex-wrap items-center gap-2 ${isHeader ? '' : 'gap-3'}`}>
      {items.map((cert) => (
        <button
          key={cert.id}
          type="button"
          onClick={() => setZoomed(cert)}
          title="Clique para ampliar"
          aria-label={`Ampliar ${alt}`}
          className={`rounded-lg bg-white border border-stone-200 flex items-center justify-center cursor-zoom-in hover:border-[#C9A227] transition-colors shadow-xs ${
            isHeader ? 'h-9 w-9 p-1' : 'h-16 w-16 p-1.5'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cert.url} alt={alt} loading="lazy" className="max-h-full max-w-full object-contain" />
        </button>
      ))}
    </div>
  );

  return (
    <>
      {isHeader ? (
        <div className={className}>{logos}</div>
      ) : (
        <section className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-3 ${className}`}>
          <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
            <BadgeCheck className="w-5 h-5 text-[#C9A227]" />
            <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight">Certificações</h2>
          </div>
          {logos}
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
