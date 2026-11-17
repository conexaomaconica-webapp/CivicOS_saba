'use client';

import React, { useState } from 'react';
import { Check, Link2, MessageCircle } from 'lucide-react';

type Props = {
  /** URL absoluta oficial da página da conexão. */
  url: string;
  /** Link já montado do WhatsApp (texto contextual + URL). */
  whatsappHref: string;
};

/** Compartilhar no WhatsApp e copiar o link, com aviso para leitores de tela. */
export function ConnectionShareButtons({ url, whatsappHref }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Reserva para navegadores sem a API de área de transferência (ex.: contexto não seguro).
      const area = document.createElement('textarea');
      area.value = url;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try { document.execCommand('copy'); } catch { /* sem suporte: o link continua visível na página */ }
      document.body.removeChild(area);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Compartilhar esta conexão">
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-bold text-white shadow-xs transition hover:bg-[#1ebe5b] focus:outline-none focus:ring-2 focus:ring-[#25D366]/60"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        Compartilhar no WhatsApp
      </a>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-[#4B161B] transition hover:border-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/50"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        {copied ? 'Link copiado' : 'Copiar link'}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{copied ? 'Link copiado para a área de transferência' : ''}</span>
    </div>
  );
}
