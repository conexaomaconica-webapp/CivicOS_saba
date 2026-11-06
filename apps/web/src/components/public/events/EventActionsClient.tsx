'use client';

import React, { useState } from 'react';
import { Share2, Heart, MessageCircle, ExternalLink, MapPin } from 'lucide-react';

interface EventActionsClientProps {
  title: string;
  slug: string;
  dateDisplay: string;
  locationLine: string;
  whatsappUrl?: string | null;
  mapsUrl?: string | null;
  registrationEnabled?: boolean;
  externalTicketUrl?: string | null;
}

export function EventActionsClient({
  title,
  slug,
  dateDisplay,
  locationLine,
  whatsappUrl,
  mapsUrl,
  registrationEnabled,
  externalTicketUrl,
}: EventActionsClientProps) {
  const [copied, setCopied] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : `https://conexaomaconica.com.br/eventos/${slug}`;
    const shareText = `Confira o evento "${title}" na Conexão Maçônica! Data: ${dateDisplay} em ${locationLine}.\n${url}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          text: shareText,
          url,
        });
        return;
      } catch {
        // Fallback para cópia
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {}
  };

  const handleFavorite = () => {
    setIsFavorited(!isFavorited);
  };

  const handleScrollToRsvp = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById('rsvp-form');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => {
        const input = document.getElementById('rsvp-fullname');
        if (input) input.focus();
      }, 500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Botões de Ação Rápida no Topo / Barra de Ação */}
      <div className="flex flex-wrap items-center gap-2.5 pt-2">
        {/* Botão de RSVP / Inscrição ou Ingressos */}
        {registrationEnabled ? (
          <a
            href="#rsvp-form"
            onClick={handleScrollToRsvp}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#3b0b14] to-[#5a111f] hover:from-[#4b161b] hover:to-[#3b0b14] text-[#c59b27] hover:text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all cursor-pointer border border-[#c59b27]/30"
          >
            <span>✍️ Confirmar Presença (Preencher Formulário)</span>
          </a>
        ) : externalTicketUrl ? (
          <a
            href={externalTicketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3b0b14] hover:bg-[#c59b27] text-white hover:text-[#1f1914] font-bold text-xs shadow-md transition-all"
          >
            <span>Mais Informações / Ingressos</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : null}

        {/* Botão do WhatsApp do Organizador se disponível */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Falar no WhatsApp</span>
          </a>
        )}

        {/* Botão Como Chegar / Maps */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-semibold text-xs shadow-xs transition-all"
          >
            <MapPin className="w-3.5 h-3.5 text-[#c59b27]" />
            <span>Como Chegar</span>
          </a>
        )}

        {/* Botão Compartilhar */}
        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 font-semibold text-xs shadow-xs transition-all cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-stone-600" />
          <span>{copied ? 'Link Copiado!' : 'Compartilhar'}</span>
        </button>

        {/* Botão Favoritar */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={isFavorited ? 'Remover dos favoritos' : 'Favoritar evento'}
          className={`inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold shadow-xs transition-all cursor-pointer ${
            isFavorited
              ? 'bg-rose-50 border-rose-200 text-rose-700 font-bold'
              : 'bg-white hover:bg-stone-100 border-stone-300 text-stone-700'
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-rose-600 text-rose-600' : 'text-stone-500'}`} />
          <span className="hidden sm:inline">{isFavorited ? 'Salvo' : 'Salvar'}</span>
        </button>
      </div>
    </div>
  );
}

