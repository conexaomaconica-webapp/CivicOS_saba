import React from 'react';
import { MessageCircle } from 'lucide-react';

export function FloatingWhatsApp() {
  // Número oficial de WhatsApp do Conexão Maçônica
  const OFFICIAL_WHATSAPP_NUMBER = '5575981272323';
  const whatsappUrl = `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de falar com o atendimento do Conexão Maçônica.')}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] right-3 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-green-500 text-white shadow-2xl transition-all duration-300 hover:bg-green-600 sm:bottom-6 sm:right-6 sm:h-14 sm:w-14 sm:hover:scale-110 print:hidden"
      aria-label="Falar conosco no WhatsApp"
    >
      <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" />
    </a>
  );
}
