'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Share2, Heart, Phone, Mail, MapPin, Globe } from 'lucide-react';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { getMediaFramingStyle } from '@/lib/business/public-business-presentation';
import { InstitutionalBadges } from '../shared/InstitutionalBadges';
import { trackEvent } from '@/lib/analytics/track-client';
import type { AllowedEventType } from '@/lib/analytics/analytics-service';

interface BusinessAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PublicBusinessPresentation;
  isFavorited: boolean;
  onToggleFavorite: () => void;
  onRefer: () => void;
}

export function BusinessAdModal({
  isOpen,
  onClose,
  profile,
  isFavorited,
  onToggleFavorite,
  onRefer,
}: BusinessAdModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { identity, recognition, location, contacts, media } = profile;
  const flyerUrl = media.cover?.url || media.gallery?.[0]?.url || '/capafallback.png';
  const logoUrl = identity.logo?.url || '/logofallback.png';
  const logoBgColor = identity.logoBgColor || identity.logo?.backgroundColor || '#ffffff';

  const track = (eventType: AllowedEventType) => {
    trackEvent({
      businessId: identity.id,
      eventType,
      source: 'business_profile',
      city: location?.city || undefined,
      state: location?.state || undefined,
    });
  };

  const whatsappDigits = contacts.whatsapp ? contacts.whatsapp.replace(/\D/g, '') : null;
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits.length <= 11 ? '55' + whatsappDigits : whatsappDigits}?text=${encodeURIComponent(
        `Olá! Vi o anúncio de ${identity.name} no Guia Conexão Maçônica.`
      )}`
    : null;

  const phoneDigits = contacts.phone ? contacts.phone.replace(/\D/g, '') : null;
  const phoneUrl = phoneDigits ? `tel:${phoneDigits}` : null;

  const mapsDestination = [identity.name, location?.address, location?.city, location?.state]
    .filter(Boolean)
    .join(', ');
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsDestination)}`;

  const getSocialUrl = (raw: string | undefined | null, defaultDomain: string): string | null => {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.includes('.') || (defaultDomain && trimmed.toLowerCase().includes(defaultDomain))) {
      return `https://${trimmed.replace(/^\/+/, '')}`;
    }
    const isYoutubeHandle = defaultDomain === 'youtube.com' && trimmed.startsWith('@');
    const clean = trimmed.replace(/^@/, '').replace(/^\/+/, '');
    return `https://${defaultDomain}/${isYoutubeHandle ? '@' : ''}${clean}`;
  };

  const websiteUrl = contacts.website
    ? /^https?:\/\//i.test(contacts.website)
      ? contacts.website
      : `https://${contacts.website}`
    : null;
  const instagramUrl = getSocialUrl(contacts.instagram, 'instagram.com');
  const facebookUrl = getSocialUrl(contacts.facebook, 'facebook.com');
  const linkedinUrl = getSocialUrl(contacts.linkedin, 'linkedin.com');
  const youtubeUrl = getSocialUrl(contacts.youtube, 'youtube.com');

  const hasSocialOrWeb = Boolean(instagramUrl || websiteUrl || facebookUrl || linkedinUrl || youtubeUrl);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={`Anúncio de ${identity.name}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-[520px] max-h-[90vh] bg-[#fffdfa] rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#e8dbcc]">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#e8dbcc] bg-[#fffdfa] shrink-0">
          <h3 className="font-serif font-bold text-lg text-[#4B161B] flex items-center gap-2 m-0">
            <span>🪧</span>
            <span>Anúncio da Empresa</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Fechar Anúncio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corpo Rolável do Anúncio */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Arte / Capa da Empresa */}
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-md border border-[#e3d5c5] bg-[#2b060d]"
            style={media.cover?.backgroundColor ? { backgroundColor: media.cover.backgroundColor } : undefined}
          >
            <img
              src={flyerUrl}
              alt={`Anúncio de ${identity.name}`}
              style={getMediaFramingStyle(media.cover, '50% 50%')}
              className={`w-full max-h-[260px] ${
                media.cover?.fitMode === 'contain' ? 'object-contain' : 'object-cover'
              } block`}
            />
          </div>

          {/* Resumo da Identidade */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#f8f4ee] border border-[#e6dace]">
            <div
              className="w-14 h-14 rounded-xl border border-[#dfcfbb] p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs"
              style={{ backgroundColor: logoBgColor }}
            >
              <img src={logoUrl} alt={identity.name} className="w-full h-full object-contain rounded-lg" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <h4 className="font-serif font-extrabold text-base text-[#4B161B] truncate m-0">
                {identity.name}
              </h4>
              <InstitutionalBadges
                recognition={recognition}
                catalog={recognition.catalog}
                commercialPlan={profile.plan.commercialPlan}
                variant="compact"
              />
            </div>
          </div>

          {/* Como Chegar */}
          <div className="space-y-2">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8c671d]">
              Como Chegar
            </span>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('directions_click')}
              className="flex items-center justify-center gap-2 w-full min-h-[46px] rounded-xl bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 text-white font-extrabold text-sm shadow-md transition-all"
            >
              <MapPin className="w-4 h-4 shrink-0" />
              <span>Traçar Rota no GPS</span>
            </a>
          </div>

          {/* Contatos Rápidos */}
          <div className="space-y-2.5">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8c671d]">
              Contatos Rápidos
            </span>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track('whatsapp_click')}
                className="flex items-center justify-center gap-2.5 w-full min-h-[48px] rounded-xl bg-gradient-to-r from-[#25d366] to-[#128c7e] text-white font-extrabold text-sm shadow-md transition-all"
              >
                <span>💬</span>
                <span>Falar no WhatsApp</span>
              </a>
            )}

            {/* Indicar e Favoritar em 2 colunas */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={onRefer}
                className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-br from-[#4B161B] to-[#2b060d] text-[#f3eedd] border border-[#c9a227] shadow-sm text-left cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-[#d4af37] shrink-0" />
                <div className="flex flex-col leading-tight min-w-0">
                  <strong className="text-xs font-extrabold text-[#f3eedd] truncate">Indicar Empresa</strong>
                  <small className="text-[10px] text-[#ebd9c8] truncate">Com seu nome</small>
                </div>
              </button>

              <button
                type="button"
                onClick={onToggleFavorite}
                className={`flex items-center gap-2.5 p-2.5 rounded-xl border shadow-sm text-left cursor-pointer transition-colors ${
                  isFavorited
                    ? 'bg-rose-50 border-rose-400 text-rose-800'
                    : 'bg-white border-[#ebd9c8] text-[#4B161B]'
                }`}
              >
                <Heart
                  className={`w-4 h-4 shrink-0 ${
                    isFavorited ? 'fill-rose-600 text-rose-600' : 'text-[#4B161B]'
                  }`}
                />
                <div className="flex flex-col leading-tight min-w-0">
                  <strong className="text-xs font-extrabold truncate">
                    {isFavorited ? 'Favoritada' : 'Favoritar'}
                  </strong>
                  <small className="text-[10px] text-stone-500 truncate">
                    {isFavorited ? 'Salva' : 'Salvar'}
                  </small>
                </div>
              </button>
            </div>

            {(phoneUrl || contacts.email) && (
              <div className="grid grid-cols-2 gap-2">
                {phoneUrl && (
                  <a
                    href={phoneUrl}
                    onClick={() => track('phone_click')}
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl border border-[#dfcfbb] bg-[#fffdfa] text-[#4B161B] text-xs font-bold hover:bg-amber-50 transition-colors"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#c9a227] shrink-0" />
                    <span>Ligar</span>
                  </a>
                )}
                {contacts.email && (
                  <a
                    href={`mailto:${contacts.email}`}
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl border border-[#dfcfbb] bg-[#fffdfa] text-[#4B161B] text-xs font-bold hover:bg-amber-50 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5 text-[#c9a227] shrink-0" />
                    <span>E-mail</span>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Redes Sociais & Web */}
          {hasSocialOrWeb && (
            <div className="space-y-2">
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#8c671d]">
                Redes Sociais & Web
              </span>
              <div className="grid grid-cols-2 gap-2">
                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl border border-[#dfcfbb] bg-[#fffdfa] text-[#4B161B] text-xs font-bold hover:bg-pink-50 transition-colors"
                  >
                    <span>📸</span>
                    <span>Instagram</span>
                  </a>
                )}
                {websiteUrl && (
                  <a
                    href={websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => track('website_click')}
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl border border-[#dfcfbb] bg-[#fffdfa] text-[#4B161B] text-xs font-bold hover:bg-blue-50 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>Site Oficial</span>
                  </a>
                )}
                {facebookUrl && (
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl border border-[#dfcfbb] bg-[#fffdfa] text-[#4B161B] text-xs font-bold hover:bg-blue-50 transition-colors"
                  >
                    <span>📘</span>
                    <span>Facebook</span>
                  </a>
                )}
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl border border-[#dfcfbb] bg-[#fffdfa] text-[#4B161B] text-xs font-bold hover:bg-sky-50 transition-colors"
                  >
                    <span>💼</span>
                    <span>LinkedIn</span>
                  </a>
                )}
                {youtubeUrl && (
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 min-h-[40px] px-3 py-2 rounded-xl border border-[#dfcfbb] bg-[#fffdfa] text-[#4B161B] text-xs font-bold hover:bg-rose-50 transition-colors"
                  >
                    <span>▶️</span>
                    <span>YouTube</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

