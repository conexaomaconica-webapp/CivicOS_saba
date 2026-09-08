'use client';

import React from 'react';
import { X, ShieldCheck } from 'lucide-react';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText?: string;
  title?: string;
  badge?: string;
}

export function ImageZoomModal({
  isOpen,
  onClose,
  imageUrl,
  altText = 'Imagem ampliada',
  title = 'Visualização da Imagem',
  badge = 'Fotografia Autêntica',
}: ImageZoomModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/85 backdrop-blur-md p-4 transition-all duration-300 animate-in fade-in cursor-zoom-out"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-[#1C0D11] border border-[#C9A227]/40 rounded-3xl overflow-hidden shadow-2xl flex flex-col items-center p-4 sm:p-6 cursor-default"
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
        <div className="w-full flex items-center justify-center overflow-hidden rounded-2xl bg-stone-950/80 p-2 border border-stone-800 max-h-[75vh]">
          <img
            src={imageUrl}
            alt={altText}
            className="max-w-full max-h-[72vh] object-contain rounded-xl shadow-xl"
          />
        </div>

        {/* Rodapé Informativo */}
        <div className="mt-4 text-center space-y-1">
          {title && (
            <h4 className="font-serif font-bold text-base text-[#F3EEDD] tracking-tight">{title}</h4>
          )}
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#C9A227] font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#C9A227]" />
            <span>{badge} — Plataforma Conexão Maçônica</span>
          </div>
        </div>
      </div>
    </div>
  );
}
