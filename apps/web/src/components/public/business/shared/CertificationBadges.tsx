'use client';

import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ImageZoomModal } from './ImageZoomModal';

type Certification = { id: string; url: string; zoom_percent?: number };

/** Fator de tamanho (1 a 3) a partir do zoom do cadastro (100–300%). */
export function certificationScale(zoom?: number | null): number {
  return Math.min(3, Math.max(1, (Number(zoom) || 100) / 100));
}

/**
 * Selo de certificação: a logo aparece SOLTA, sem caixa, sem fundo branco e sem moldura (como os demais selos do cabeçalho).
 * O zoom (100–300%) aumenta o TAMANHO do selo: a altura é a altura-base (definida por quem usa, em `className`, com `--z`) vezes o fator.
 * A largura acompanha a proporção da logo; nunca passa de 70% da largura da tela.
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
  /** Altura-base com o fator: ex. `h-[calc(3.5rem*var(--z))]`. */
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      draggable={false}
      style={{ '--z': certificationScale(zoom) } as React.CSSProperties}
      className={`block w-auto max-w-[70vw] object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${className}`}
    />
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
      className="shrink-0 cursor-zoom-in rounded-xl transition-transform duration-300 hover:scale-105"
    >
      <CertificationLogo
        url={cert.url}
        zoom={cert.zoom_percent}
        alt={alt}
        className={isInline ? 'h-[calc(3.5rem*var(--z))] sm:h-[calc(4rem*var(--z))]' : 'h-[calc(6rem*var(--z))] sm:h-[calc(7rem*var(--z))]'}
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
