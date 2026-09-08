'use client';

import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

type BusinessActionButtonsProps = {
  contacts: PublicBusinessPresentation['contacts'];
  location: PublicBusinessPresentation['location'];
  businessName: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  className?: string;
};

export function QuickActionBar({
  contacts,
  location,
  businessName,
  activeTab = 'visao-geral',
  onTabChange,
  className = '',
}: BusinessActionButtonsProps) {
  const whatsappDigits = contacts.whatsapp ? contacts.whatsapp.replace(/\D/g, '') : null;
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(`Olá! Vi o anúncio de ${businessName} no Guia Conexão Maçônica.`)}`
    : null;

  const phoneDigits = contacts.phone ? contacts.phone.replace(/\D/g, '') : null;
  const phoneUrl = phoneDigits ? `tel:${phoneDigits}` : null;

  const mapsUrl = location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${businessName}, ${location.address}`)}`
    : null;

  const instagramHandle = contacts.instagram ? contacts.instagram.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '') : null;
  const facebookHandle = contacts.facebook ? contacts.facebook.replace(/^https?:\/\/(www\.)?facebook\.com\//, '') : null;

  const tabs = [
    { id: 'visao-geral', label: 'Visão geral' },
    { id: 'servicos', label: 'Serviços' },
    { id: 'fotos-videos', label: 'Fotos e vídeos' },
    { id: 'beneficios', label: 'Benefícios' },
    { id: 'comentarios', label: 'Comentários' },
    { id: 'localizacao', label: 'Localização' },
  ];

  return (
    <div className={`bg-white border border-[#E8E5DF] rounded-2xl shadow-xs p-3 flex flex-wrap items-center justify-between gap-4 ${className}`}>
      
      {/* Botões de Ação Rápida (Icons Clean) */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-medium text-stone-700">
        
        {/* WhatsApp */}
        {whatsappUrl && (
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-emerald-50 text-stone-800 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.15 4.2 4.293-1.126z"/>
              </svg>
            </span>
            <span className="font-semibold text-stone-800">WhatsApp</span>
          </a>
        )}

        {/* Ligar */}
        {phoneUrl && (
          <a
            href={phoneUrl}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-amber-50 text-stone-800 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C9A227] shrink-0">
              <Phone className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-stone-800">Ligar</span>
          </a>
        )}

        {/* E-mail */}
        {contacts.email && (
          <a
            href={`mailto:${contacts.email}`}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-amber-50 text-stone-800 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C9A227] shrink-0">
              <Mail className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-stone-800">E-mail</span>
          </a>
        )}

        {/* Como chegar */}
        {mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-amber-50 text-stone-800 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-[#C9A227] shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </span>
            <span className="font-semibold text-stone-800">Como chegar</span>
          </a>
        )}

        {/* Instagram */}
        {instagramHandle && (
          <a
            href={`https://instagram.com/${instagramHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-pink-50 text-stone-800 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </span>
            <span className="font-semibold text-stone-800">Instagram</span>
          </a>
        )}

        {/* Facebook */}
        {facebookHandle && (
          <a
            href={`https://facebook.com/${facebookHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-blue-50 text-stone-800 transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </span>
            <span className="font-semibold text-stone-800">Facebook</span>
          </a>
        )}

      </div>

      {/* Abas de Navegação Interna do Perfil */}
      <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs font-semibold text-stone-600 border-l border-stone-200 pl-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (onTabChange) onTabChange(tab.id);
              const el = document.getElementById(tab.id);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#4B161B] text-white shadow-xs font-bold'
                : 'hover:bg-stone-100 text-stone-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

    </div>
  );
}

export function BusinessActionButtons(props: BusinessActionButtonsProps) {
  return <QuickActionBar {...props} />;
}
