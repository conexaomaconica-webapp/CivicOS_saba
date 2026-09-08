'use client';

import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PublicMediaAsset } from '@/lib/business/public-business-presentation';

type BusinessGalleryProps = {
  gallery: PublicMediaAsset[];
  className?: string;
};

export function BusinessGallery({
  gallery,
  className = '',
}: BusinessGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (selectedIndex === null) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev !== null ? (prev === 0 ? gallery.length - 1 : prev - 1) : null));
      } else if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev !== null ? (prev === gallery.length - 1 ? 0 : prev + 1) : null));
      } else if (e.key === 'Escape') {
        setSelectedIndex(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, gallery.length]);

  if (!gallery || gallery.length === 0) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev !== null ? (prev === 0 ? gallery.length - 1 : prev - 1) : null));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIndex((prev) => (prev !== null ? (prev === gallery.length - 1 ? 0 : prev + 1) : null));
  };

  const selectedImage = selectedIndex !== null ? gallery[selectedIndex] : null;

  return (
    <section className={`p-5 rounded-2xl bg-white border border-[#E8E5DF] shadow-xs space-y-4 ${className}`}>
      <div className="flex items-center gap-2 border-b border-stone-100 pb-2.5">
        <ImageIcon className="w-5 h-5 text-[#C9A227]" />
        <h2 className="text-base font-serif font-bold text-[#4B161B] tracking-tight">
          Fotos e Vídeos
        </h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {gallery.map((asset, index) => (
          <button
            key={index}
            type="button"
            onClick={() => setSelectedIndex(index)}
            className="group relative aspect-4/3 rounded-xl overflow-hidden bg-[#FDFBF7] border border-[#E8E5DF] hover:border-[#C9A227]/60 transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
          >
            <img
              src={asset.url}
              alt={asset.alt || `Foto ${index + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-[#4B161B]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-xs font-bold text-[#F3EEDD] bg-[#4B161B]/80 px-2.5 py-1 rounded-full border border-[#C9A227]/40 shadow-xs">
                Ampliar
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Modal de ampliação de imagem com navegação anterior / próximo */}
      {selectedImage && selectedIndex !== null && (
        <div
          className="fixed inset-0 z-50 bg-stone-950/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Botão Anteriores */}
          {gallery.length > 1 && (
            <button
              type="button"
              onClick={handlePrev}
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-[#4B161B]/90 hover:bg-[#C9A227] text-[#F3EEDD] hover:text-stone-950 transition-all cursor-pointer shadow-xl border border-[#C9A227]/40"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Botão Próximo */}
          {gallery.length > 1 && (
            <button
              type="button"
              onClick={handleNext}
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-[#4B161B]/90 hover:bg-[#C9A227] text-[#F3EEDD] hover:text-stone-950 transition-all cursor-pointer shadow-xl border border-[#C9A227]/40"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-stone-950 border-2 border-[#C9A227]/60 shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Botão Fechar */}
            <button
              type="button"
              onClick={() => setSelectedIndex(null)}
              className="absolute top-3 right-3 z-50 p-2 rounded-full bg-[#4B161B] text-[#F3EEDD] hover:bg-[#C9A227] hover:text-stone-950 transition-all cursor-pointer shadow-md border border-[#C9A227]/40"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="relative flex-1 min-h-[300px] flex items-center justify-center p-2 bg-black">
              <img
                src={selectedImage.url}
                alt={selectedImage.alt || `Foto ${selectedIndex + 1}`}
                className="max-w-full max-h-[75vh] object-contain mx-auto rounded-lg"
              />
            </div>

            {/* Rodapé do Modal com Contador e Descrição */}
            <div className="p-3 bg-[#4B161B] border-t border-[#C9A227]/40 flex items-center justify-between text-xs text-[#F3EEDD]">
              <span className="font-semibold">
                {selectedImage.alt || `Foto de ${gallery.length > 0 ? 'galeria' : ''}`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-black/40 border border-[#C9A227]/40 text-[#C9A227] font-bold">
                {selectedIndex + 1} / {gallery.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
