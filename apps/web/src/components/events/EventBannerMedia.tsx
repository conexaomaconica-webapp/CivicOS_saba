'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Maximize2, X, Calendar, ZoomIn } from 'lucide-react';

interface EventBannerMediaProps {
  imageUrl?: string | null;
  title: string;
  appName?: string;
  priority?: boolean;
}

export function EventBannerMedia({
  imageUrl,
  title,
  appName = 'Conexão Maçônica',
  priority = true,
}: EventBannerMediaProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Fecha com tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!imageUrl) {
    return (
      <div className="w-full h-full min-h-[260px] sm:min-h-[320px] rounded-2xl overflow-hidden border border-[#E8E5DF] shadow-sm flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#4b161b] via-[#3b0b14] to-stone-950 text-white">
        <div className="w-16 h-16 rounded-full bg-[#c59b27]/20 border border-[#c59b27]/50 flex items-center justify-center mb-3">
          <Calendar className="w-8 h-8 text-[#c59b27]" />
        </div>
        <span className="font-serif font-bold text-xl text-amber-100 max-w-xs leading-snug">
          {title}
        </span>
        <span className="text-xs text-amber-200/80 mt-2 font-medium uppercase tracking-wider">
          {appName}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Container Principal do Banner com Proporção Automática e Limite de Altura */}
      <div
        onClick={() => setIsOpen(true)}
        className="group relative w-full rounded-2xl overflow-hidden border border-[#E8E5DF] shadow-sm bg-stone-950 flex items-center justify-center cursor-zoom-in transition-all duration-300 hover:shadow-md hover:border-[#c59b27]/60"
        style={{ minHeight: '260px', maxHeight: '520px' }}
      >
        {/* Fundo com efeito de luz ambiente e blur sutil da própria imagem */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-xl scale-110"
          />
        </div>

        {/* Imagem do Banner ajustada automaticamente (horizontal, vertical ou quadrada) */}
        <div className="relative w-full h-[280px] sm:h-[340px] lg:h-[420px] flex items-center justify-center p-2 sm:p-3">
          <Image
            src={imageUrl}
            alt={`Banner oficial do evento: ${title}`}
            fill
            sizes="(max-width: 1024px) 100vw, 45vw"
            priority={priority}
            unoptimized
            className="object-contain transition-transform duration-300 group-hover:scale-[1.01]"
          />
        </div>

        {/* Badge flutuante de Zoom no canto inferior */}
        <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900/85 hover:bg-[#3b0b14] text-white text-xs font-semibold backdrop-blur-md border border-white/20 shadow-lg group-hover:scale-105 transition-all">
            <ZoomIn className="w-3.5 h-3.5 text-[#c59b27]" />
            <span>Clique para ampliar</span>
          </span>
        </div>
      </div>

      {/* Lightbox / Modal de Imagem Ampliada em Tela Cheia */}
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Visualização ampliada do banner: ${title}`}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        >
          {/* Barra Superior do Lightbox */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between gap-4 pb-3 text-white border-b border-white/10 mb-2"
          >
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#c59b27]" />
              <h3 className="font-serif font-bold text-sm sm:text-base text-amber-100 line-clamp-1">
                {title}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Fechar visualização ampliada"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
            >
              <X className="w-5 h-5" />
              <span className="hidden sm:inline">Fechar (ESC)</span>
            </button>
          </div>

          {/* Área da Imagem em Alta Resolução */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-5xl flex-1 flex items-center justify-center overflow-hidden my-auto"
          >
            <img
              src={imageUrl}
              alt={title}
              className="max-w-full max-h-[82vh] object-contain rounded-xl shadow-2xl border border-white/10"
            />
          </div>

          {/* Rodapé informativo */}
          <p className="text-[11px] text-stone-400 text-center pt-2">
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px]">ESC</kbd> ou clique fora da imagem para fechar.
          </p>
        </div>
      )}
    </>
  );
}

