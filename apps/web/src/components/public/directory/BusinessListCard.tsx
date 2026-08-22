'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Heart, Share2, Star, Crown, Award, ShieldCheck, Users, Map } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import type { BusinessCardData } from './BusinessCard';

type BusinessListCardProps = {
  data: BusinessCardData;
  onViewOnMap?: (slug: string) => void;
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

export function BusinessListCard({ data, onViewOnMap }: BusinessListCardProps) {
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
        // Fallback
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

  // Badge priority
  const resolveBadge = () => {
    const plan = (data.effective_plan_code || '').toLowerCase();
    if (data.is_pedra_fundamental || plan === 'pedra_fundamental') {
      return { label: 'Pedra Fundamental', bg: 'bg-amber-100 text-amber-950 border-amber-400 font-bold', icon: Crown };
    }
    if (data.is_founder || plan === 'coluna_honra') {
      return { label: 'Coluna de Honra', bg: 'bg-amber-50 text-amber-950 border-amber-300 font-semibold', icon: ShieldCheck };
    }
    if (plan === 'ouro' || plan === 'gold') {
      return { label: 'Plano Ouro', bg: 'bg-[#fdf8eb] text-[#855e10] border-[#e8d7ad] font-semibold', icon: Crown };
    }
    if (data.is_verified) {
      return { label: 'Verificada', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold', icon: ShieldCheck };
    }
    if (plan === 'prata' || plan === 'silver') {
      return { label: 'Plano Prata', bg: 'bg-slate-100 text-slate-800 border-slate-300 font-semibold', icon: Award };
    }
    if (plan === 'bronze') {
      return { label: 'Plano Bronze', bg: 'bg-orange-50 text-amber-900 border-orange-200 font-semibold', icon: Award };
    }
    return { label: 'Anunciante', bg: 'bg-amber-50/60 text-amber-900 border-amber-200', icon: ShieldCheck };
  };

  const badge = resolveBadge();
  const locationStr = [data.city, data.state].filter(Boolean).join(', ');
  const hasRealRating = data.rating_average != null && data.reviews_count != null && data.reviews_count > 0;
  const masonicConnection = formatMasonicConnection(data);

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row gap-5 items-start md:items-center justify-between group">
      {/* Esquerda: Logo e Imagem */}
      <div className="flex items-center gap-4 shrink-0 w-full md:w-auto">
        <div className="relative w-16 h-16 rounded-2xl border border-stone-200 bg-amber-950 text-amber-400 font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
          {data.logo_url ? (
            <img src={data.logo_url} alt={data.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-base">{data.name.slice(0, 2).toUpperCase()}</span>
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
