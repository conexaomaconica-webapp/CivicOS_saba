'use client';

import React, { useState } from 'react';
import { Share2, Check } from 'lucide-react';

const SHARE_DATA = {
  title: 'Conexão Maçônica · Lançamento Oficial',
  text: 'Conheça a Conexão Maçônica. Uma nova forma de nos conectarmos está chegando. Lançamento oficial em 24 de novembro:',
  url: 'https://www.conexaomaconica.com.br/entrecolunas',
};

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(SHARE_DATA);
        return;
      } catch (err) {
        // User cancelled or share failed, fallback to WhatsApp
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    // Fallback: Open WhatsApp direct message with the link
    const waText = encodeURIComponent(`${SHARE_DATA.text}\n${SHARE_DATA.url}`);
    const waUrl = `https://wa.me/?text=${waText}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    // Also copy to clipboard as courtesy
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${SHARE_DATA.text}\n${SHARE_DATA.url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } catch {
        // Clipboard access denied
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      type="button"
      className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-xs font-semibold text-[#F3EEDD] bg-[#2A090D] hover:bg-[#3D0E13] border border-[#C9A227]/40 hover:border-[#C9A227] shadow-sm transition-all duration-200 active:scale-95 cursor-pointer"
      aria-label="Compartilhar com um irmão"
    >
      {copied ? (
        <>
          <Check className="w-4 h-4 text-[#C9A227]" />
          <span>Link copiado!</span>
        </>
      ) : (
        <>
          <Share2 className="w-4 h-4 text-[#C9A227]" />
          <span>Compartilhar com um irmão</span>
        </>
      )}
    </button>
  );
}
