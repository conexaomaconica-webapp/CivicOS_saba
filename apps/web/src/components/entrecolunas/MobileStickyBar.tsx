'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle } from 'lucide-react';
import { EVENT_CONFIRMATION_URL, EVENT_WHATSAPP_URL } from './constants';

export function MobileStickyBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky bar only after scrolling past 300px (past hero)
      if (window.scrollY > 300) {
        setShow(true);
      } else {
        setShow(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!show) return null;

  return (
    <aside
      aria-label="Ação rápida de confirmação de presença"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] bg-[#FAF7F2]/95 backdrop-blur-md border-t border-[#C9A227]/30 shadow-lg transition-transform duration-300"
    >
      <div className="max-w-md mx-auto flex items-center gap-2">
        {/* Main Confirmation Button */}
        <a
          href={EVENT_CONFIRMATION_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#4B161B] via-[#611D23] to-[#4B161B] hover:brightness-110 shadow-md shadow-[#4B161B]/30 active:scale-[0.98] transition-all"
        >
          <CheckCircle2 className="w-4 h-4 text-[#C9A227] shrink-0" />
          <span>Confirmar Presença (24/11)</span>
        </a>

        {/* Quick WhatsApp Support */}
        <a
          href={EVENT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Dúvidas no WhatsApp"
          className="w-11 h-11 rounded-full bg-[#25D366] hover:bg-[#20bd5a] flex items-center justify-center text-white shrink-0 shadow-md shadow-[#25D366]/25 transition-transform active:scale-95"
        >
          <MessageCircle className="w-5 h-5 fill-white text-transparent" />
        </a>
      </div>
    </aside>
  );
}
