'use client';

import React, { useState } from 'react';
import { Briefcase, CheckCircle2, ZoomIn } from 'lucide-react';
import type { PublicBusinessService } from '@/lib/business/public-business-presentation';
import { FormattedText } from '@/components/ui/formatted-text';
import { ImageZoomModal } from '../shared/ImageZoomModal';

type BusinessServicesProps = {
  services: PublicBusinessService[];
  className?: string;
};

export function BusinessServices({
  services,
  className = '',
}: BusinessServicesProps) {
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  if (!services || services.length === 0) return null;

  return (
    <section className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
        <Briefcase className="w-5 h-5 text-[#C9A227]" />
        <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight">
          Principais Serviços
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {services.map((service, index) => (
          <div
            key={service.id || index}
            className="p-3.5 rounded-xl bg-[#FDFBF7] border border-[#E8E5DF] hover:border-[#C9A227]/60 transition-all flex flex-col gap-3 shadow-xs"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-[#4B161B]/5 border border-[#C9A227]/30 text-[#C9A227] shrink-0 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-[#4B161B]" />
              </div>

              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-stone-900 text-sm truncate">
                    {service.name}
                  </h3>
                  {service.priceInfo && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#4B161B]/5 text-[#4B161B] border border-[#4B161B]/15 shrink-0">
                      {service.priceInfo}
                    </span>
                  )}
                </div>

                {service.description && (
                  <FormattedText
                    content={service.description}
                    className="text-xs text-stone-600 leading-relaxed"
                    collapsible
                    maxCollapsedLength={180}
                  />
                )}
              </div>
            </div>

            {service.imageUrl && (
              <button
                type="button"
                onClick={() => setPreviewImage({ url: service.imageUrl!, title: service.name })}
                className="group relative w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-50 cursor-pointer flex items-center justify-center p-1"
                title="Clique para ampliar a imagem do serviço"
              >
                <img
                  src={service.imageUrl}
                  alt={service.name}
                  loading="lazy"
                  className="w-full h-auto max-h-96 object-contain rounded-lg transition-transform duration-300 group-hover:scale-[1.01]"
                />
                <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg bg-black/70 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm opacity-90 group-hover:opacity-100">
                  <ZoomIn className="w-3 h-3" /> Ampliar
                </span>
              </button>
            )}
          </div>
        ))}
      </div>

      <ImageZoomModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage?.url || ''}
        altText={previewImage?.title || 'Imagem do serviço'}
        title={previewImage?.title || 'Serviço'}
        badge="Banner / Imagem do Serviço"
      />
    </section>
  );
}

