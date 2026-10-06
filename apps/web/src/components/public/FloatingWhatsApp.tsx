'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mail, MessageCircle, X } from 'lucide-react';
import { DEFAULT_SUPPORT_WHATSAPP } from '@/lib/directory/support-contact';

type Props = {
  /** WhatsApp do suporte (só dígitos, com código do país). Vem de /admin/guia/geral. */
  whatsapp?: string;
  /** E-mail do suporte. Com e-mail configurado, o botão abre um pequeno menu (WhatsApp ou e-mail). */
  email?: string;
};

const MESSAGE = 'Olá! Gostaria de falar com o atendimento do Conexão Maçônica.';

export function FloatingWhatsApp({ whatsapp = DEFAULT_SUPPORT_WHATSAPP, email = '' }: Props) {
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const whatsappUrl = `https://wa.me/${whatsapp}?text=${encodeURIComponent(MESSAGE)}`;
  const mailUrl = email ? `mailto:${email}?subject=${encodeURIComponent('Atendimento Conexão Maçônica')}` : '';

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const buttonClass =
    'fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl transition-all duration-300 hover:bg-green-600 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 sm:hover:scale-110 print:hidden';

  // Sem e-mail configurado: comportamento de sempre (abre o WhatsApp direto).
  if (!mailUrl) {
    return (
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass} aria-label="Falar conosco no WhatsApp">
        <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
      </a>
    );
  }

  return (
    <div ref={boxRef} className="print:hidden">
      {open && (
        <div
          role="menu"
          className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-40 w-64 rounded-2xl border border-stone-200 bg-white p-2 shadow-2xl sm:bottom-24 sm:right-6"
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-bold uppercase tracking-wider text-stone-500">Fale com o atendimento</p>
          <a
            role="menuitem"
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-800 hover:bg-green-50"
          >
            <MessageCircle className="h-5 w-5 text-green-600" aria-hidden /> WhatsApp
          </a>
          <a
            role="menuitem"
            href={mailUrl}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-800 hover:bg-amber-50"
          >
            <Mail className="h-5 w-5 text-[#5d1523]" aria-hidden />
            <span className="min-w-0 truncate">{email}</span>
          </a>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Fechar opções de atendimento' : 'Abrir opções de atendimento'}
        className={buttonClass}
      >
        {open ? <X className="h-6 w-6 sm:h-7 sm:w-7" /> : <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />}
      </button>
    </div>
  );
}
