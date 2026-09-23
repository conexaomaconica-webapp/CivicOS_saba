'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck } from 'lucide-react';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
  title?: string;
  badge?: string;
  imageOnly?: boolean;
}

export function ImageZoomModal({
  isOpen,
  onClose,
  imageUrl,
  altText = 'Imagem ampliada',
  title = 'Visualização da Imagem',
  badge = 'Fotografia Autêntica',
  imageOnly = false,
}: ImageZoomModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in cursor-zoom-out"
      onClick={onClose}
    >
      <div
        className={`relative max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col items-center cursor-default ${imageOnly ? 'bg-white rounded-3xl' : 'bg-[#1C0D11] border border-[#C9A227]/40 rounded-3xl p-4 sm:p-6'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-stone-900/90 hover:bg-[#3B0B14] text-stone-300 hover:text-[#C9A227] flex items-center justify-center transition-all cursor-pointer shadow-lg border border-[#C9A227]/30"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Container da Imagem */}
        <div className={`w-full flex items-center justify-center overflow-hidden max-h-[85vh] ${imageOnly ? 'p-8' : 'rounded-2xl bg-stone-950/80 p-2 border border-stone-800'}`}>
          <img
            src={imageUrl}
            alt={altText}
            className={`max-w-full object-contain drop-shadow-2xl ${imageOnly ? 'max-h-[82vh]' : 'max-h-[72vh] rounded-xl shadow-xl'}`}
          />
        </div>

        {/* Rodapé Informativo */}
        {!imageOnly && <div className="mt-4 text-center space-y-1">
          {title && (
            <h4 className="font-serif font-bold text-base text-[#F3EEDD] tracking-tight">{title}</h4>
          )}
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#C9A227] font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#C9A227]" />
            <span>{badge} — Plataforma Conexão Maçônica</span>
          </div>
        </div>}
      </div>
    </div>,
    document.body,
  );
}
