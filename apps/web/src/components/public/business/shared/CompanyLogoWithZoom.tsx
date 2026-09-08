'use client';

import React, { useState } from 'react';
import { ZoomIn } from 'lucide-react';
import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';
import { ImageZoomModal } from './ImageZoomModal';

interface CompanyLogoWithZoomProps {
  logo?: PublicMediaAsset | null;
  businessName: string;
  className?: string;
  imgClassName?: string;
  fallbackText?: string;
}

export function CompanyLogoWithZoom({
  logo,
  businessName,
  className = 'w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white border border-[#E8E5DF] p-2 shrink-0 flex items-center justify-center shadow-xs relative group cursor-pointer overflow-hidden',
  imgClassName = 'max-w-full max-h-full object-contain rounded-xl transition-transform group-hover:scale-105',
}: CompanyLogoWithZoomProps) {
  const [isOpen, setIsOpen] = useState(false);

  const logoUrl = logo?.url || '/logofallback.png';
  const altText = logo?.alt || `Logomarca Oficial — ${businessName}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Clique para ampliar a logomarca da empresa"
        className={`${className} transition-all hover:scale-[1.03] hover:border-[#C9A227]`}
      >
        <img src={logoUrl} alt={altText} className={imgClassName} />
        
        {/* Overlay do ícone de Zoom no hover */}
        <div className="absolute inset-0 bg-stone-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl backdrop-blur-2xs">
          <ZoomIn className="w-5 h-5 text-white drop-shadow-md" />
        </div>
      </button>

      {/* Lightbox Zoom Modal */}
      <ImageZoomModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        imageUrl={logoUrl}
        altText={altText}
        title={`Logomarca Oficial — ${businessName}`}
        badge="Identidade Visual da Empresa"
      />
    </>
  );
}
