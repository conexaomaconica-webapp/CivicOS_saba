'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, MapPin, Briefcase, Star, Crown, Award, ShieldCheck, Users } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';

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
  effective_plan_code?: string | null;
  rating_average?: number | null;
  reviews_count?: number;
  badge_custom_text?: string | null;
  badge_custom_icon_url?: string | null;
  // Geodesic Location
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
  // Dados de Vínculo Maçônico com Governança de Privacidade (LGPD)
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
};

// Formatação do Vínculo Maçônico (Respeitando os termos tradicionais)
function formatMasonicConnection(data: BusinessCardData): { title: string; lodge?: string } | null {
  // Guardrail de privacidade: SÓ exibe se for autorizado publicamente
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

  // Default: Irmão
  return {
    title: name ? `Empresa do Irmão ${name}` : 'Empresa de Irmão da Rede',
    lodge,
  };
}

export function BusinessCard({
  data,
  variant = 'compact',
  showRating = true,
}: BusinessCardProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [copiedShare, setCopiedShare] = useState(false);
  const favorited = isFavorite(data.slug);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(data.slug);
  };

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
        return;
      } catch {
        // Fallback to clipboard if user cancels share dialog
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    } catch {
      // Ignore
    }
  };

  // Resolucao do Selo Principal (Prioridades 1 a 6 estritas)
  const resolveMainBadge = () => {
    const plan = (data.effective_plan_code || '').toLowerCase();

    // Prioridade 1: Pedra Fundamental (Apenas 10 anunciantes exclusivos)
    if (data.is_pedra_fundamental || plan === 'pedra_fundamental') {
      return {
        label: 'Pedra Fundamental',
        bg: 'bg-gradient-to-r from-amber-100 to-amber-200 text-amber-950 border-amber-400 font-bold shadow-2xs',
        icon: Crown,
      };
    }

    // Prioridade 2: Coluna de Honra (is_founder - 100 clientes fundadores)
    if (data.is_founder || plan === 'coluna_honra') {
      return {
        label: 'Coluna de Honra',
        bg: 'bg-amber-50 text-amber-950 border-amber-300 font-semibold',
        icon: ShieldCheck,
      };
    }

    // Prioridade 3: Plano Ouro
    if (plan === 'ouro' || plan === 'gold') {
      return {
        label: 'Plano Ouro',
        bg: 'bg-[#fdf8eb] text-[#855e10] border-[#e8d7ad] font-semibold',
        icon: Crown,
      };
    }

    // Prioridade 4: Empresa Verificada
    if (data.is_verified) {
      return {
        label: 'Empresa Verificada',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold',
        icon: ShieldCheck,
      };
    }

    // Prioridade 5: Plano Prata
    if (plan === 'prata' || plan === 'silver') {
      return {
        label: 'Plano Prata',
        bg: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold',
        icon: Award,
      };
    }

    // Prioridade 6: Plano Bronze
    if (plan === 'bronze') {
      return {
        label: 'Plano Bronze',
        bg: 'bg-orange-50 text-amber-900 border-orange-200 font-semibold',
        icon: Award,
      };
    }

    // Custom do Admin se houver
    if (data.badge_custom_text) {
      return {
        label: data.badge_custom_text,
        bg: 'bg-amber-50 text-amber-900 border-amber-300',
        icon: ShieldCheck,
        customIconUrl: data.badge_custom_icon_url,
      };
    }

    // Fallback neutro
    return {
      label: 'Anunciante',
      bg: 'bg-amber-50/60 text-amber-900 border-amber-200',
      icon: ShieldCheck,
    };
  };

  const badge = resolveMainBadge();
  const locationStr = [data.city, data.state].filter(Boolean).join(', ');
  const hasRealRating = showRating && data.rating_average != null && data.reviews_count != null && data.reviews_count > 0;
  const isFeatured = variant === 'featured';

  // Resolucao de vinculo maconico (Exibido apenas em 'compact' / Todas as Empresas se for publico)
  const masonicConnection = formatMasonicConnection(data);

  return (
    <div className="bg-white border border-amber-900/15 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group relative">
      {/* 1. Capa (Com Acoes Discretas no Canto Superior) */}
      <div className={`relative w-full bg-stone-800 overflow-hidden ${isFeatured ? 'h-36' : 'h-28'}`}>
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
          {/* Favoritar */}
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

          {/* Compartilhar */}
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
          {/* Logo sobreposta */}
          <div className={`relative mb-2.5 flex items-end justify-between ${isFeatured ? '-mt-10' : '-mt-8'}`}>
            <div className={`rounded-2xl border-2 border-white bg-white shadow-md overflow-hidden shrink-0 ${isFeatured ? 'w-16 h-16' : 'w-14 h-14'}`}>
              {data.logo_url ? (
                <img src={data.logo_url} alt={data.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-[#3b0b14] text-amber-400 font-bold flex items-center justify-center text-sm">
                  {data.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          {/* Nome da Empresa */}
          <h3 className={`font-serif font-bold text-[#3b0b14] leading-snug line-clamp-1 group-hover:text-amber-900 transition-colors ${isFeatured ? 'text-base' : 'text-sm'}`}>
            {data.name}
          </h3>

          {/* Avaliação Real (Exibido SOMENTE se houver reviews reais) */}
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

          {/* Vínculo Maçônico Discreto (Exibido APENAS em 'compact' / Todas as Empresas se for público) */}
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

        {/* 3. Rodapé do Card (Um Único Selo Principal na Esquerda + Botão Ver Empresa na Direita) */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          {/* Selo Principal */}
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold shadow-2xs ${badge.bg}`}>
            {badge.customIconUrl ? (
              <img src={badge.customIconUrl} alt="" className="w-3.5 h-3.5 object-contain shrink-0" />
            ) : (
              <badge.icon className="w-3.5 h-3.5 shrink-0 text-amber-800" />
            )}
            <span className="truncate">{badge.label}</span>
          </div>

          {/* Botão Ver Empresa */}
          <Link
            href={`/guia/${data.slug}`}
            className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl border border-[#5d1523] text-[#5d1523] font-bold text-xs hover:bg-[#5d1523] hover:text-white transition-colors shrink-0"
          >
            Ver empresa
          </Link>
        </div>
      </div>
    </div>
  );
}
