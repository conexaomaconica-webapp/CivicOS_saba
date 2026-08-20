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
      className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-2xl hover:scale-110 transition-all duration-300"
      aria-label="Falar conosco no WhatsApp"
    >
      <MessageCircle className="w-7 h-7" />
    </a>
  );
}
