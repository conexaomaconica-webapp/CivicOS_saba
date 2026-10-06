'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, Star, Crown, Award, ShieldCheck, Users, Map } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import { trackDirectoryEventAction } from '@/lib/analytics/analytics-service';
import { useSearchImpression } from '@/lib/analytics/use-search-impression';
import { usePedraCardDisplay, usePedraHorizontalSeal, type PedraCardDisplay } from '@/lib/directory/pedra-card-display-context';
import {
  type BusinessCardData,
  PEDRA_FUNDAMENTAL_SEAL,
  PEDRA_FUNDAMENTAL_HORIZONTAL_SEAL,
} from './BusinessCard';

type BusinessListCardProps = {
  data: BusinessCardData;
  onViewOnMap?: (slug: string) => void;
  pedraCardDisplay?: PedraCardDisplay;
};

// Format Masonic Connection string
function formatMasonicConnection(data: BusinessCardData): { title: string; lodge?: string } | null {
  if (data.is_masonic_connection_public === false) return null;
  if (!data.masonic_member_name && !data.masonic_relationship_type) return null;

  const rel = (data.masonic_relationship_type || 'brother').toLowerCase();
  const name = data.masonic_member_name || '';
  const brotherName = data.masonic_brother_name || '';
  const lodge = data.masonic_lodge_name ? `Loja ${data.masonic_lodge_name}` : undefined;

  if (rel === 'representative' || rel === 'representante') {
    return {
      title: name ? `Representado pelo Irmão ${name}` : 'Representado por Irmão da Rede',
      lodge,
    };
  }
  if (rel === 'wife' || rel === 'cunhada') {
    const suffix = brotherName ? ` (${brotherName})` : '';
    return {
      title: name ? `Empresa da Cunhada ${name}${suffix}` : 'Empresa de Cunhada da Rede',
      lodge,
    };
  }
  if (rel === 'child' || rel === 'sobrinho') {
    const suffix = brotherName ? ` (${brotherName})` : '';
    return {
      title: name ? `Empresa do Sobrinho ${name}${suffix}` : 'Empresa de Sobrinho da Rede',
      lodge,
    };
  }

  return {
    title: name ? `Empresa do Irmão ${name}` : 'Empresa de Irmão da Rede',
    lodge,
  };
}

export function BusinessListCard({ data, onViewOnMap, pedraCardDisplay }: BusinessListCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const contextPedraDisplay = usePedraCardDisplay();
  const pedraHorizontalSealUrl = usePedraHorizontalSeal();
  const [copiedShare, setCopiedShare] = useState(false);
  const favorited = isFavorite(data.slug);

  const effectivePedraDisplay =
    data.pedra_fundamental_card_display ||
    pedraCardDisplay ||
    contextPedraDisplay ||
    'circular_seal';

  // Verificação da Condecoração Histórica Pedra Fundamental
  const isPedraFundamental = Boolean(
    data.is_pedra_fundamental ||
    (data as any).isPedraFundamental ||
    (data as any).recognitions?.some?.(
      (r: any) =>
        r === 'pedra_fundamental' ||
        r?.key === 'pedra_fundamental' ||
        r?.recognition_key === 'pedra_fundamental'
    )
  );

  const [pedraSealSrc, setPedraSealSrc] = useState<string | null>(
    isPedraFundamental ? PEDRA_FUNDAMENTAL_SEAL.primary : null
  );
  const [pedraSealFailed, setPedraSealFailed] = useState(false);

  const handlePedraSealError = () => {
    if (pedraSealSrc === PEDRA_FUNDAMENTAL_SEAL.primary) {
      setPedraSealSrc(PEDRA_FUNDAMENTAL_SEAL.fallback);
    } else {
      setPedraSealFailed(true);
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(data.slug);
  };

  const impressionRef = useSearchImpression<HTMLDivElement>(data.id);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/guia/${data.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: data.name,
          text: `Confira ${data.name} no Guia Conexão Maçônica`,
          url: shareUrl,
        });
        void trackDirectoryEventAction({ businessId: data.id, eventType: 'share', source: 'directory_list' });
        return;
      } catch {
        // Fallback
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      void trackDirectoryEventAction({ businessId: data.id, eventType: 'share', source: 'directory_list' });
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // Ignore
    }
  };

  // Badge priority
  const resolveBadge = () => {
    const plan = (data.effective_plan_code || '').toLowerCase().trim();
    if (data.is_pedra_fundamental || plan === 'pedra_fundamental') {
      return { label: 'Pedra Fundamental', bg: 'bg-amber-100 text-amber-950 border-amber-400 font-bold', icon: Crown };
    }
    if (data.is_founder) {
      return { label: 'Empresa Fundadora', bg: 'bg-amber-50 text-amber-950 border-amber-300 font-semibold', icon: ShieldCheck };
    }
    if (plan === 'ouro' || plan === 'gold' || plan === 'ouro_founder') {
      return { label: 'Acácia', bg: 'bg-[#fdf8eb] text-[#855e10] border-[#e8d7ad] font-semibold', icon: Crown };
    }
    if (plan === 'prata' || plan === 'silver') {
      return { label: 'Compasso', bg: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold', icon: Award };
    }
    if (plan === 'bronze') {
      return { label: 'Esquadro', bg: 'bg-orange-50 text-amber-900 border-orange-200 font-semibold', icon: Award };
    }
    if (data.is_verified) {
      return { label: 'Verificada', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold', icon: ShieldCheck };
    }
    return { label: 'Esquadro', bg: 'bg-amber-50/60 text-amber-900 border-amber-200', icon: ShieldCheck };
  };

  const badge = resolveBadge();
  const locationStr = [data.city, data.state].filter(Boolean).join(', ');
  const hasRealRating = data.rating_average != null && data.reviews_count != null && data.reviews_count > 0;
  const masonicConnection = formatMasonicConnection(data);

  return (
    <div ref={impressionRef} className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row gap-5 items-start md:items-center justify-between group">
      {/* Esquerda: Logo e Imagem */}
      <div className="flex items-center gap-4.5 shrink-0 w-full md:w-auto">
        <div
          className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-stone-200/90 bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs p-2 transition-all duration-300 ease-out group-hover:scale-105 hover:!scale-115 hover:shadow-xl hover:border-amber-400 cursor-pointer ${
            data.logo_url ? 'bg-white' : 'bg-amber-950 text-amber-400 font-bold'
          }`}
        >
          {data.logo_url ? (
            <img
              src={data.logo_url}
              alt={data.name}
              className="max-w-full max-h-full object-contain object-center bg-white transition-transform duration-300 ease-out group-hover:scale-105 hover:scale-110"
            />
          ) : (
            <span className="text-xl sm:text-2xl font-bold">{data.name.slice(0, 2).toUpperCase()}</span>
          )}
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif font-bold text-gray-900 text-base group-hover:text-amber-900 transition-colors">
              {data.name}
            </h3>
            
            {/* Selo Principal */}
            <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-semibold ${badge.bg}`}>
              <badge.icon className="w-3 h-3 shrink-0 text-amber-800" />
              <span>{badge.label}</span>
            </div>
          </div>

          <p className="text-xs text-stone-500 flex items-center gap-2 mt-1 flex-wrap">
            {data.category_name && <span className="font-semibold text-amber-900">{data.category_name}</span>}
            {locationStr && <span>· {locationStr}</span>}
            {hasRealRating && (
              <span className="flex items-center gap-1 font-semibold text-stone-700">
                · <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {data.rating_average} ({data.reviews_count})
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Meio: Vínculo Maçônico */}
      {masonicConnection && (
        <div className="bg-amber-50/60 border border-amber-900/10 rounded-xl p-2.5 px-3.5 text-xs text-stone-800 shrink-0 w-full md:w-auto">
          <div className="flex items-center gap-1.5 font-bold text-[#5d1523]">
            <Users className="w-3.5 h-3.5 text-amber-700 shrink-0" />
            <span>{masonicConnection.title}</span>
          </div>
          {masonicConnection.lodge && (
            <div className="text-[11px] text-stone-500 pl-5 mt-0.5 font-medium">
              {masonicConnection.lodge}
            </div>
          )}
        </div>
      )}

      {/* Reconhecimento Pedra Fundamental no Modo Lista Conforme Opção do Admin */}
      {isPedraFundamental && (
        <>
          {effectivePedraDisplay === 'circular_seal' && !pedraSealFailed && pedraSealSrc && (
            <div
              className="shrink-0 flex items-center justify-center w-18 h-18 sm:w-20 sm:h-20 transition-all duration-300 ease-out group-hover:scale-110 hover:!scale-125 cursor-pointer"
              title="Empresa com condecoração histórica de Pedra Fundamental"
            >
              <img
                src={pedraSealSrc}
                alt="Pedra Fundamental"
                onError={handlePedraSealError}
                className="max-w-full max-h-full object-contain drop-shadow-md hover:drop-shadow-2xl transition-all duration-300 ease-out"
              />
            </div>
          )}

          {effectivePedraDisplay === 'horizontal_seal' && (
            <div
              className="shrink-0 flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-105 hover:!scale-110 cursor-pointer"
              title="Empresa com condecoração histórica de Pedra Fundamental"
            >
              <img
                src={pedraHorizontalSealUrl || PEDRA_FUNDAMENTAL_HORIZONTAL_SEAL.fallback}
                alt="Pedra Fundamental"
                onError={(event) => {
                  event.currentTarget.src = PEDRA_FUNDAMENTAL_HORIZONTAL_SEAL.fallback;
                }}
                className="h-8 sm:h-9 max-w-[140px] sm:max-w-[160px] object-contain drop-shadow-xs"
              />
            </div>
          )}

          {effectivePedraDisplay === 'badge_text' && (
            <div
              className="shrink-0 flex items-center justify-center transition-all duration-300 ease-out"
              title="Empresa com condecoração histórica de Pedra Fundamental"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-400 bg-amber-100 text-amber-950 font-bold text-xs shadow-2xs hover:bg-amber-200 transition-colors">
                <Crown className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                Pedra Fundamental
              </span>
            </div>
          )}
        </>
      )}

      {/* Direita: Ações e Botões */}
      <div className="flex items-center gap-2 self-end md:self-center shrink-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0">
        <div className="flex items-center gap-1.5">
          {/* Favoritar */}
          <button
            onClick={handleToggleFavorite}
            title={favorited ? 'Remover dos favoritos' : 'Favoritar'}
            className="p-2 rounded-xl text-stone-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <Heart className={`w-4 h-4 ${favorited ? 'fill-red-600 text-red-600' : ''}`} />
          </button>

          {/* Compartilhar */}
          <button
            onClick={handleShare}
            title="Compartilhar"
            className="p-2 rounded-xl text-stone-500 hover:text-amber-900 hover:bg-amber-50 transition-colors relative"
          >
            <Share2 className="w-4 h-4" />
            {copiedShare && (
              <span className="absolute -top-7 right-0 text-[10px] font-bold bg-amber-950 text-white px-2 py-0.5 rounded shadow-xs">
                Copiado!
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onViewOnMap && (
            <button
              onClick={() => onViewOnMap(data.slug)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-stone-300 text-stone-700 font-semibold text-xs hover:bg-stone-100 transition-colors"
            >
              <Map className="w-3.5 h-3.5 text-stone-500" />
              <span>Ver no mapa</span>
            </button>
          )}

          <Link
            href={`/guia/${data.slug}`}
            className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl border border-[#5d1523] text-[#5d1523] font-bold text-xs hover:bg-[#5d1523] hover:text-white transition-colors"
          >
            Ver empresa
          </Link>
        </div>
      </div>
    </div>
  );
}
