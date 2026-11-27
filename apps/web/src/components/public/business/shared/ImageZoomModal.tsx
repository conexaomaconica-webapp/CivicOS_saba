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
  backgroundColor?: string;
}

export function ImageZoomModal({
  isOpen,
  onClose,
  imageUrl,
  altText = 'Imagem ampliada',
  title = 'Visualização da Imagem',
  badge = 'Fotografia Autêntica',
  imageOnly = false,
  backgroundColor,
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
        className={`relative max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col items-center cursor-default ${imageOnly ? 'bg-white rounded-3xl border border-[#C9A227]/30' : 'bg-[#1C0D11] border border-[#C9A227]/40 rounded-3xl p-4 sm:p-6'}`}
        style={imageOnly && backgroundColor ? { backgroundColor } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Botão Fechar X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#3B0B14] hover:bg-[#C9A227] text-[#F3EEDD] hover:text-stone-950 font-bold text-xs transition-all cursor-pointer shadow-xl border border-[#C9A227]/60"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
          <span>Fechar</span>
        </button>

        {/* Container da Imagem */}
        <div
          className={`w-full flex items-center justify-center overflow-hidden max-h-[85vh] ${imageOnly ? 'p-8' : 'rounded-2xl bg-stone-950/80 p-2 border border-stone-800'}`}
          style={!imageOnly && backgroundColor ? { backgroundColor } : undefined}
        >
          <img
            src={imageUrl}
            alt={altText}
            className={`max-w-full object-contain drop-shadow-2xl ${imageOnly ? 'max-h-[82vh]' : 'max-h-[72vh] rounded-xl shadow-xl'}`}
          />
        </div>

        {/* Rodapé Informativo */}
        {!imageOnly && (
          <div className="mt-4 w-full flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-center sm:text-left space-y-0.5">
              {title && (
                <h4 className="font-serif font-bold text-base text-[#F3EEDD] tracking-tight">{title}</h4>
              )}
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-[#C9A227] font-medium">
                <ShieldCheck className="w-4 h-4 shrink-0 text-[#C9A227]" />
                <span>{badge} — Plataforma Conexão Maçônica</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-[#F3EEDD] border border-[#C9A227]/40 font-bold text-xs cursor-pointer transition-colors shrink-0"
            >
              Fechar visualização
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
