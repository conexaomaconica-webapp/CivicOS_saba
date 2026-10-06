'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, MapPin, Briefcase, Star, Crown, Award, ShieldCheck, Users } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import { usePedraCardDisplay, usePedraHorizontalSeal, type PedraCardDisplay } from '@/lib/directory/pedra-card-display-context';
import { trackDirectoryEventAction } from '@/lib/analytics/analytics-service';
import { useSearchImpression } from '@/lib/analytics/use-search-impression';

export type BusinessCardData = {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  category_name?: string | null;
  city?: string | null;
  state?: string | null;
  is_verified?: boolean;
  is_founder?: boolean;
  is_pedra_fundamental?: boolean;
  pedra_fundamental_card_display?: PedraCardDisplay | null;
  effective_plan_code?: string | null;
  rating_average?: number | null;
  reviews_count?: number;
  badge_custom_text?: string | null;
  badge_custom_icon_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  masonic_relationship_type?: 'brother' | 'wife' | 'child' | 'representative' | string | null;
  masonic_member_name?: string | null;
  masonic_brother_name?: string | null;
  masonic_lodge_name?: string | null;
  is_masonic_connection_public?: boolean;
};

type BusinessCardProps = {
  data: BusinessCardData;
  variant?: 'featured' | 'compact';
  showRating?: boolean;
  pedraCardDisplay?: PedraCardDisplay;
};

// Assets Oficiais de Selos Horizontais dos Planos Comerciais
const PLAN_HORIZONTAL_SEALS: Record<'acacia' | 'compasso' | 'esquadro', { primary: string; fallback: string; alt: string }> = {
  acacia: {
    primary: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/recognitions/seal-selo_ouro-horizontal-1790199484765.webp',
    fallback: '/selos/plano-ouro.svg',
    alt: 'Plano Acácia',
  },
  compasso: {
    primary: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/recognitions/seal-selo_prata-horizontal-1790199516679.webp',
    fallback: '/selos/plano-prata.svg',
    alt: 'Plano Compasso',
  },
  esquadro: {
    primary: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/recognitions/seal-selo_bronze-horizontal-1790199576949.webp',
    fallback: '/selos/plano-bronze.svg',
    alt: 'Plano Esquadro',
  },
};

// Asset Oficial do Selo Circular da Pedra Fundamental (Reconhecimento Institucional)
export const PEDRA_FUNDAMENTAL_CIRCULAR_SEAL = {
  primary: 'https://rwvztwsjcjljphqttiws.supabase.co/storage/v1/object/public/business-assets/recognitions/seal-pedra_fundamental-seal-1790036016665.png',
  fallback: '/selos/pedra-fundamental-circular.svg',
  alt: 'Pedra Fundamental (Selo Circular)',
};

// Asset Oficial do Selo Horizontal da Pedra Fundamental
export const PEDRA_FUNDAMENTAL_HORIZONTAL_SEAL = {
  primary: '/selos/pedra-fundamental.svg',
  fallback: '/selos/pedra-fundamental.svg',
  alt: 'Pedra Fundamental (Selo Horizontal)',
};

export const PEDRA_FUNDAMENTAL_SEAL = PEDRA_FUNDAMENTAL_CIRCULAR_SEAL;

// Formatação do Vínculo Maçônico (Respeitando os termos tradicionais e LGPD)
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

export function BusinessCard({
  data,
  variant = 'compact',
  showRating = true,
  pedraCardDisplay,
}: BusinessCardProps) {
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

  // Normalização do Plano Comercial
  const rawPlan = (data.effective_plan_code || '').toLowerCase().trim();
  let normalizedPlan: 'acacia' | 'compasso' | 'esquadro' | null = null;
  if (rawPlan === 'acacia' || rawPlan === 'ouro' || rawPlan === 'gold' || rawPlan === 'ouro_founder') {
    normalizedPlan = 'acacia';
  } else if (rawPlan === 'compasso' || rawPlan === 'prata' || rawPlan === 'silver') {
    normalizedPlan = 'compasso';
  } else if (rawPlan === 'esquadro' || rawPlan === 'bronze') {
    normalizedPlan = 'esquadro';
  }

  // Estado do Selo Horizontal do Plano (com suporte a fallback em duas etapas: CDN -> Local -> Badge Textual)
  const [planSealSrc, setPlanSealSrc] = useState<string | null>(
    normalizedPlan ? PLAN_HORIZONTAL_SEALS[normalizedPlan].primary : null
  );
  const [planSealFailed, setPlanSealFailed] = useState(false);

  const handlePlanSealError = () => {
    if (normalizedPlan && planSealSrc === PLAN_HORIZONTAL_SEALS[normalizedPlan].primary) {
      setPlanSealSrc(PLAN_HORIZONTAL_SEALS[normalizedPlan].fallback);
    } else {
      setPlanSealFailed(true);
    }
  };

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

  // Estado do Selo Circular Pedra Fundamental (com suporte a fallback: CDN -> Local -> Ocultar sem texto)
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
        void trackDirectoryEventAction({ businessId: data.id, eventType: 'share', source: 'directory_card' });
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      void trackDirectoryEventAction({ businessId: data.id, eventType: 'share', source: 'directory_card' });
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // Ignore
    }
  };

  // Badge Textual de Fallback para o Plano Comercial no Rodapé
  const resolveCommercialBadge = () => {
    if (normalizedPlan === 'acacia') {
      return {
        label: 'Plano Acácia',
        bg: 'bg-[#fdf8eb] text-[#855e10] border-[#e8d7ad] font-semibold',
        icon: Crown,
      };
    }

    if (normalizedPlan === 'compasso') {
      return {
        label: 'Plano Compasso',
        bg: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
        icon: Award,
      };
    }

    if (normalizedPlan === 'esquadro') {
      return {
        label: 'Plano Esquadro',
        bg: 'bg-orange-50 text-amber-900 border-orange-200 font-semibold',
        icon: Award,
      };
    }

    if (data.is_verified) {
      return {
        label: 'Empresa Verificada',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
        icon: ShieldCheck,
      };
    }

    if (data.badge_custom_text) {
      return {
        label: data.badge_custom_text,
        bg: 'bg-amber-50 text-amber-900 border-amber-300',
        icon: ShieldCheck,
        customIconUrl: data.badge_custom_icon_url,
      };
    }

    return {
      label: 'Plano Esquadro',
      bg: 'bg-amber-50/60 text-amber-900 border-amber-200',
      icon: ShieldCheck,
    };
  };

  const badge = resolveCommercialBadge();
  const locationStr = [data.city, data.state].filter(Boolean).join(', ');
  const hasRealRating = showRating && data.rating_average != null && data.reviews_count != null && data.reviews_count > 0;
  const isFeatured = variant === 'featured';
  const masonicConnection = formatMasonicConnection(data);

  return (
    <div ref={impressionRef} className="bg-white border border-amber-900/15 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group relative">
      {/* 1. Capa (Com Ações de Favoritar e Compartilhar) */}
      <div className={`relative w-full bg-stone-800 overflow-hidden ${isFeatured ? 'h-40' : 'h-32'}`}>
        {data.cover_url ? (
          <img
            src={data.cover_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-[#2b060d] to-[#5d1523] opacity-90" />
        )}

        {/* Ações Flutuantes Discretas */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
          <button
            onClick={handleToggleFavorite}
            title={favorited ? 'Remover dos favoritos' : 'Favoritar'}
            className="w-7 h-7 rounded-full bg-white/85 backdrop-blur-xs border border-white/40 flex items-center justify-center shadow-xs hover:bg-white transition-all active:scale-90"
          >
            <Heart
              className={`w-3.5 h-3.5 transition-colors ${
                favorited ? 'fill-red-600 text-red-600' : 'text-[#3b0b14]'
              }`}
            />
          </button>

          <button
            onClick={handleShare}
            title="Compartilhar empresa"
            className="w-7 h-7 rounded-full bg-white/85 backdrop-blur-xs border border-white/40 flex items-center justify-center shadow-xs hover:bg-white transition-all active:scale-90 relative"
          >
            <Share2 className="w-3.5 h-3.5 text-[#3b0b14]" />
            {copiedShare && (
              <span className="absolute -bottom-7 right-0 text-[10px] font-bold bg-amber-950 text-white px-2 py-0.5 rounded shadow-sm whitespace-nowrap">
                Link copiado!
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 2. Conteúdo do Card */}
      <div className={`pt-0 flex-1 flex flex-col justify-between ${isFeatured ? 'p-4' : 'p-3.5'}`}>
        <div>
          {/* Transição da capa para o conteúdo: [ LOGO DA EMPRESA ] ... [ PEDRA FUNDAMENTAL ] */}
          <div className={`relative mb-3 flex items-end justify-between ${isFeatured ? '-mt-13 sm:-mt-14' : '-mt-11 sm:-mt-12'}`}>
            {/* Logo da Empresa */}
            <div
              className={`rounded-2xl border-2 sm:border-3 border-white bg-white shadow-md overflow-hidden shrink-0 flex items-center justify-center p-1.5 transition-all duration-300 ease-out group-hover:scale-105 hover:!scale-115 hover:shadow-xl hover:z-20 cursor-pointer ${
                isFeatured ? 'w-22 h-22 sm:w-24 sm:h-24' : 'w-20 h-20 sm:w-22 sm:h-22'
              }`}
            >
              {data.logo_url ? (
                <img
                  src={data.logo_url}
                  alt={data.name}
                  className="max-w-full max-h-full object-contain object-center p-0.5 transition-transform duration-300 ease-out group-hover:scale-105 hover:scale-110"
                />
              ) : (
                <div className="w-full h-full bg-[#3b0b14] text-amber-400 font-bold flex items-center justify-center text-lg sm:text-xl">
                  {data.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Exibição Conforme Opção Escolhida no Admin da Pedra Fundamental */}
            {isPedraFundamental && (
              <>
                {/* Opção 1: Selo Normal (Circular) */}
                {effectivePedraDisplay === 'circular_seal' && !pedraSealFailed && pedraSealSrc && (
                  <div
                    className={`shrink-0 flex items-center justify-center transition-all duration-300 ease-out group-hover:scale-110 hover:!scale-125 hover:z-20 cursor-pointer ${
                      isFeatured ? 'w-22 h-22 sm:w-24 sm:h-24' : 'w-20 h-20 sm:w-22 sm:h-22'
                    }`}
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

                {/* Opção 2: Selo Horizontal */}
                {effectivePedraDisplay === 'horizontal_seal' && (
                  <div
                    className="shrink-0 flex items-center justify-end pb-1 transition-all duration-300 ease-out group-hover:scale-105 hover:!scale-110 hover:z-20 cursor-pointer"
                    title="Empresa com condecoração histórica de Pedra Fundamental"
                  >
                    <img
                      src={pedraHorizontalSealUrl || PEDRA_FUNDAMENTAL_HORIZONTAL_SEAL.fallback}
                      alt="Pedra Fundamental"
                      onError={(event) => {
                        event.currentTarget.src = PEDRA_FUNDAMENTAL_HORIZONTAL_SEAL.fallback;
                      }}
                      className={`object-contain drop-shadow-sm hover:drop-shadow-md transition-all duration-300 ${
                        isFeatured ? 'h-8 sm:h-9 max-w-[130px] sm:max-w-[150px]' : 'h-7 sm:h-8 max-w-[115px] sm:max-w-[130px]'
                      }`}
                    />
                  </div>
                )}

                {/* Opção 3: Badge em Formato de Texto */}
                {effectivePedraDisplay === 'badge_text' && (
                  <div
                    className="shrink-0 flex items-center justify-end pb-1.5 transition-all duration-300 ease-out group-hover:scale-105"
                    title="Empresa com condecoração histórica de Pedra Fundamental"
                  >
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-400 bg-amber-100 text-amber-950 font-bold text-[11px] sm:text-xs shadow-2xs hover:bg-amber-200 transition-colors">
                      <Crown className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                      Pedra Fundamental
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Nome da Empresa */}
          <h3
            className={`font-serif font-bold text-[#3b0b14] leading-snug line-clamp-1 group-hover:text-amber-900 transition-colors ${
              isFeatured ? 'text-base' : 'text-sm'
            }`}
          >
            {data.name}
          </h3>

          {/* Avaliação Real */}
          {hasRealRating && (
            <div className="flex items-center gap-1 text-xs text-stone-600 font-semibold mt-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
              <span>{data.rating_average}</span>
              <span className="text-stone-400 font-normal">({data.reviews_count})</span>
            </div>
          )}

          {/* Localização (Cidade, UF) */}
          {locationStr && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1.5">
              <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="line-clamp-1">{locationStr}</span>
            </div>
          )}

          {/* Categoria */}
          {data.category_name && (
            <div className="flex items-center gap-1.5 text-xs text-stone-600 mt-1">
              <Briefcase className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <span className="line-clamp-1">{data.category_name}</span>
            </div>
          )}

          {/* Vínculo Maçônico Discreto */}
          {!isFeatured && masonicConnection && (
            <div className="mt-2 pt-2 border-t border-amber-900/10 text-[11px] text-amber-950 font-medium leading-tight">
              <div className="flex items-center gap-1 font-semibold text-[#5d1523]">
                <Users className="w-3 h-3 shrink-0 text-amber-700" />
                <span className="line-clamp-1">{masonicConnection.title}</span>
              </div>
              {masonicConnection.lodge && (
                <span className="text-[10px] text-stone-500 block line-clamp-1 pl-4 mt-0.5">
                  {masonicConnection.lodge}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3. Rodapé do Card: [ SELO HORIZONTAL DO PLANO ] ... [ Ver empresa > ] */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          {/* Selo Horizontal do Plano Comercial */}
          {normalizedPlan && !planSealFailed && planSealSrc ? (
            <div className="h-8 sm:h-9 flex items-center shrink-0">
              <img
                src={planSealSrc}
                alt={PLAN_HORIZONTAL_SEALS[normalizedPlan].alt}
                onError={handlePlanSealError}
                className="max-w-[125px] sm:max-w-[135px] h-8 sm:h-9 object-contain"
              />
            </div>
          ) : (
            /* Fallback Garantido: Badge Textual do Plano */
            <div
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold shadow-2xs ${badge.bg}`}
            >
              {badge.customIconUrl ? (
                <img src={badge.customIconUrl} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
              ) : (
                <badge.icon className="w-3.5 h-3.5 shrink-0 text-amber-800" />
              )}
              <span className="truncate">{badge.label}</span>
            </div>
          )}

          {/* Botão Ver Empresa */}
          <Link
            href={`/guia/${data.slug}`}
            onClick={() => void trackDirectoryEventAction({ businessId: data.id, eventType: 'view', source: 'directory_card' })}
            className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-xl border border-[#5d1523] text-[#5d1523] font-bold text-xs hover:bg-[#5d1523] hover:text-white transition-colors shrink-0"
          >
            Ver empresa
          </Link>
        </div>
      </div>
    </div>
  );
}
