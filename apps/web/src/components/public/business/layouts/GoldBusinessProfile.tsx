'use client';

import React, { useState } from 'react';
import { Heart, Share2, Building2, Eye } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { getObjectPosition } from '@/lib/business/public-business-presentation';
import { ReferBusinessModal } from '../sections/ReferBusinessModal';
import { InstitutionalBadges } from '../shared/InstitutionalBadges';
import { QuickActionBar } from '../shared/BusinessActionButtons';
import { CompanyLogoWithZoom } from '../shared/CompanyLogoWithZoom';
import { ProfileContentGrid } from '../sections/ProfileContentGrid';

type GoldBusinessProfileProps = {
  profile: PublicBusinessPresentation;
};

export function GoldBusinessProfile({ profile }: GoldBusinessProfileProps) {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [referOpen, setReferOpen] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const { identity, recognition, location, contacts, owner, media } = profile;
  const isFavorited = isFavorite(identity.slug);

  const hasCover = Boolean(media.cover?.url);
  const coverUrl = media.cover?.url || '/capafallback.png';

  // "Indicar esta empresa": link de indicação rastreável (membro logado) ou link comum com convite para entrar.
  const handleShare = () => setReferOpen(true);

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F8F7F5] pb-16 font-sans text-stone-900">

      {/* 1. HERO HEADER INTERATIVO DO PLANO ACÁCIA (Fundo Bordô Nobre Canônico #3B0B14) */}
      <section className="relative w-full bg-[#3B0B14] text-white overflow-hidden shadow-xl border-b-2 border-[#C9A227] min-h-[380px] sm:min-h-[420px] lg:min-h-[440px] flex flex-col justify-center">
        {/* Imagem de Capa Nítida: 100% fotográfica, sem véu translúcido lavando as pessoas e o banner */}
        <div className="absolute inset-0 z-0">
          <img
            src={coverUrl}
            alt={identity.name}
            fetchPriority="high"
            decoding="async"
            style={{ objectPosition: getObjectPosition(media.cover) ?? '50% 35%' }}
            className={`h-full w-full object-cover brightness-[1.15] saturate-[1.08] contrast-[1.03] ${hasCover ? 'opacity-100' : 'opacity-25'}`}
          />
          {hasCover ? (
            <>
              {/* Celular: escurecimento suave para legibilidade das informações sobrepostas */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#25050C]/85 via-[#25050C]/40 to-transparent md:hidden" />

              {/* Tablet/Desktop: Fundo Bordô Nobre Canônico suave apenas sob a coluna de informações (0-22%), liberando total claridade e nitidez da foto do centro para a direita */}
              <div className="absolute inset-0 hidden md:block bg-gradient-to-r from-[#3B0B14]/90 from-0% via-[#3B0B14]/75 via-22% via-[#3B0B14]/20 via-34% to-transparent to-44%" />
            </>
          ) : (
            /* Sem imagem de capa: Cabeçalho 100% Bordô Nobre Canônico do Plano Acácia */
            <div className="absolute inset-0 bg-gradient-to-br from-[#4B161B] via-[#3B0B14] to-[#25050C]" />
          )}
        </div>

          {/* Botões de Ação Flutuantes (Canto Superior Direito) */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2.5 text-xs font-medium sm:top-6 sm:right-8">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/20 bg-black/40 px-2.5 font-semibold text-white shadow-xs backdrop-blur-md transition-all hover:bg-black/60 sm:h-auto sm:px-3.5 sm:py-1.5"
            >
              <Share2 className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">Indicar</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFavorite(identity.slug)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-2.5 shadow-xs backdrop-blur-md transition-all sm:h-auto sm:px-3.5 sm:py-1.5 ${isFavorited
                ? 'bg-rose-600 text-white border-rose-500 font-bold'
                : 'bg-black/40 hover:bg-black/60 text-white font-semibold border-white/20'
                }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white text-white' : 'text-white'}`} />
              <span className="hidden sm:inline">{isFavorited ? 'Favoritado' : 'Favoritar'}</span>
            </button>
          </div>

          {/* Conteúdo Institucional do Hero Banner com Altura Ampliada */}
          <div className="relative z-20 mx-auto w-full max-w-7xl px-4 pb-16 pt-20 sm:px-6 sm:py-20 sm:pb-28 lg:px-8">

            <div className="flex flex-col items-center gap-6 text-center sm:gap-7 md:flex-row md:items-start md:text-left">

              {/* Logo da Empresa com Moldura Dourada Ornamentada, Brilho #C9A227 e Ampliação Lightbox (Fundo Branco Padrão, exceto cor customizada) */}
              <div className="relative group shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#C9A227] via-[#FFD700] to-[#C9A227] rounded-3xl blur-xs opacity-80 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                <CompanyLogoWithZoom
                  logo={identity.logo}
                  businessName={identity.name}
                  backgroundColor={identity.logoBgColor || '#ffffff'}
                  className="w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-2xl border-2 border-[#C9A227] p-1.5 shrink-0 flex items-center justify-center shadow-2xl relative z-20 group cursor-pointer overflow-hidden bg-white"
                  imgClassName="w-full h-full object-contain rounded-xl transition-transform group-hover:scale-105"
                />
              </div>

              {/* Informações da Empresa - Alinhado no topo da logo e com largura estritamente controlada para preservar fotos e rostos de capa */}
              <div className="relative z-20 min-w-0 flex-1 max-w-sm sm:max-w-md md:max-w-[380px] lg:max-w-[430px] xl:max-w-[460px] space-y-2 md:pt-1">

                {/* Nome da Empresa - Linha 1 em destaque principal serifado alinhado ao topo da logo */}
                <h1 className="font-serif text-xl sm:text-2xl lg:text-[1.8rem] font-bold leading-snug tracking-tight text-white drop-shadow-md text-balance line-clamp-2">
                  {identity.name}
                </h1>

                {/* Descrição Curta / Subtítulo do Cabeçalho - Linha 2 de complemento elegante */}
                {identity.shortDescription && (
                  <p className="text-sm sm:text-base lg:text-[1.05rem] font-serif italic text-amber-100/90 leading-snug tracking-wide -mt-0.5">
                    {identity.shortDescription}
                  </p>
                )}

                {/* Categoria */}
                {identity.category && (
                  <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#C9A227]">
                    {identity.category}
                  </p>
                )}

                {/* Selos Institucionais Ativos no Hero (Selo Pedra Fundamental, Coluna de Honra, Fundador, Verificada) */}
                <div className="pt-1">
                  <InstitutionalBadges recognition={recognition} catalog={recognition.catalog} commercialPlan={profile.plan.commercialPlan} variant="compact" />
                </div>

                {/* Responsável + Loja Maçônica no Subtítulo */}
                {owner && (
                  <div className="text-xs sm:text-sm text-stone-200 font-medium pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Responsável: <strong className="text-white font-bold">{owner.communityLabel ? `${owner.communityLabel} ` : ''}{owner.name}</strong>
                    </span>
                    {owner.organization && (
                      <span className="inline-flex items-center gap-1 text-[#F3EEDD] font-semibold">
                        <Building2 className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                        <span>Loja: <strong>{owner.organization}</strong></span>
                      </span>
                    )}
                  </div>
                )}

                {/* Cidade, Estado e Visualizações */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-300 font-medium">
                  {location && (location.city || location.state) && (
                    <p>
                      {[location.city, location.state].filter(Boolean).join(' • ')}
                    </p>
                  )}
                  {profile.metrics?.views != null && (
                    <div className="inline-flex items-center gap-1.5 text-amber-200/90 font-medium" title="Visualizações da página da empresa">
                      {location && (location.city || location.state) && <span className="text-amber-200/40">·</span>}
                      <Eye className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                      <span>{profile.metrics.views.toLocaleString('pt-BR')} {profile.metrics.views === 1 ? 'visualização' : 'visualizações'}</span>
                    </div>
                  )}
                </div>

              </div>

            </div>

          </div>
      </section>

      {/* CONTEÚDO PRINCIPAL (#F8F7F5) - Menu Sobreposto Flutuante com -mt-10 sm:-mt-12 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-30 space-y-6">

        {/* BARRA DE AÇÕES RÁPIDAS COM NAVEGAÇÃO EM ABAS */}
        <QuickActionBar
          businessId={identity.id}
          contacts={contacts}
          location={location}
          businessName={identity.name}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* CORPO DO PERFIL: lateral sempre começa com o card do plano e o do responsável */}
        <ProfileContentGrid profile={profile} />

      </div>


      {referOpen && (
        <ReferBusinessModal businessName={identity.name} businessSlug={identity.slug} onClose={() => setReferOpen(false)} />
      )}
    </div>
  );
}
