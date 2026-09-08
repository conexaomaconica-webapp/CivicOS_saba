'use client';

import React, { useState } from 'react';
import { Heart, Share2, Building2 } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';
import { getObjectPosition } from '@/lib/business/public-business-presentation';
import { InstitutionalBadges } from '../shared/InstitutionalBadges';
import { QuickActionBar } from '../shared/BusinessActionButtons';
import { BusinessAbout } from '../sections/BusinessAbout';
import { BusinessServices } from '../sections/BusinessServices';
import { BusinessGallery } from '../sections/BusinessGallery';
import { BusinessBenefits } from '../sections/BusinessBenefits';
import { BusinessEvents } from '../sections/BusinessEvents';
import { BusinessPosts } from '../sections/BusinessPosts';
import { BusinessOwnerCard } from '../sections/BusinessOwnerCard';
import { CompanyLogoWithZoom } from '../shared/CompanyLogoWithZoom';
import { BusinessLocationCard } from '../sections/BusinessLocationCard';
import { BusinessCommunityReviewsCard } from '../sections/BusinessCommunityReviewsCard';
import { BusinessHours } from '../sections/BusinessHours';
import { BusinessContacts } from '../sections/BusinessContacts';

type GoldBusinessProfileProps = {
  profile: PublicBusinessPresentation;
};

export function GoldBusinessProfile({ profile }: GoldBusinessProfileProps) {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [copiedShare, setCopiedShare] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const { identity, recognition, authority, location, contacts, owner, media } = profile;
  const isFavorited = isFavorite(identity.slug);

  const coverUrl = media.cover?.url || '/capafallback.png';

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: identity.name,
        text: identity.description || `Conheça ${identity.name} no Guia Conexão Maçônica`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F7F5] text-stone-900 font-sans pb-16">
      
      {/* 1. HERO HEADER INTERATIVO DO PLANO OURO (Altura equivalente ao Plano Prata) */}
      <section className="relative w-full bg-[#4B161B] text-white overflow-hidden shadow-xl border-b-2 border-[#C9A227] min-h-[380px] sm:min-h-[420px] lg:min-h-[440px] flex flex-col justify-center">
        {/* Imagem de Capa com Gradient Overlay Premium */}
        <div className="absolute inset-0 z-0">
          <img
            src={coverUrl}
            alt={identity.name}
            style={{ objectPosition: getObjectPosition(media.cover) }}
            className="w-full h-full object-cover opacity-35 filter brightness-90 contrast-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#3B0B14] via-[#4B161B]/95 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#3B0B14] via-transparent to-[#3B0B14]/60" />
          <div className="absolute inset-y-0 left-0 w-full lg:w-1/2 bg-[#4B161B]/95 pointer-events-none" />
        </div>

        {/* Linhas Douradas Geométricas Ornamentais no Fundo do Hero (Vetor Maçônico/Geométrico) */}
        <div className="absolute inset-y-0 left-0 w-[550px] opacity-40 pointer-events-none z-10 overflow-hidden">
          <svg className="w-full h-full text-[#C9A227]" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M-50 0L450 500M450 -50L-50 450M150 -50V550M-50 250H550M50 -50L350 550M350 -50L50 550" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 4" />
            <polygon points="150,50 350,250 150,450 -50,250" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="150" cy="250" r="180" stroke="currentColor" strokeWidth="1" />
            <circle cx="150" cy="250" r="120" stroke="currentColor" strokeWidth="0.8" strokeDasharray="6 3" />
          </svg>
        </div>

        {/* Glow e Efeito Dourado Radiante atrás da Logo e Título (Efeito Ouro Nobre) */}
        <div className="absolute top-1/2 left-20 -translate-y-1/2 w-96 h-96 bg-[#C9A227]/25 rounded-full blur-3xl pointer-events-none z-10" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#FFD700]/20 rounded-full blur-2xl pointer-events-none z-10" />

        {/* Botões de Ação Flutuantes (Canto Superior Direito) */}
        <div className="absolute top-4 right-4 sm:top-6 sm:right-8 z-20 flex items-center gap-2.5 text-xs font-medium">
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white font-semibold border border-white/20 transition-all shadow-xs cursor-pointer backdrop-blur-md"
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
            <span>{copiedShare ? 'Copiado!' : 'Compartilhar'}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleFavorite(identity.slug)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border transition-all shadow-xs cursor-pointer backdrop-blur-md ${
              isFavorited
                ? 'bg-rose-600 text-white border-rose-500 font-bold'
                : 'bg-black/40 hover:bg-black/60 text-white font-semibold border-white/20'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white text-white' : 'text-white'}`} />
            <span>{isFavorited ? 'Favoritado' : 'Favoritar'}</span>
          </button>
        </div>

        {/* Conteúdo Institucional do Hero Banner com Altura Ampliada */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 pb-20 sm:pb-28 w-full">
          
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
            
            {/* Logo da Empresa com Moldura Dourada Ornamentada, Brilho #C9A227 e Ampliação Lightbox */}
            <div className="relative group shrink-0">
              <div className="absolute -inset-1 bg-gradient-to-r from-[#C9A227] via-[#FFD700] to-[#C9A227] rounded-3xl blur-xs opacity-80 group-hover:opacity-100 transition duration-300 pointer-events-none" />
              <CompanyLogoWithZoom
                logo={identity.logo}
                businessName={identity.name}
                className="w-28 h-28 sm:w-36 sm:h-36 lg:w-40 lg:h-40 rounded-2xl bg-[#FBF8EF] border-2 border-[#C9A227] p-3 shrink-0 flex items-center justify-center shadow-2xl relative z-20 group cursor-pointer overflow-hidden"
              />
            </div>

            {/* Informações da Empresa */}
            <div className="space-y-2 min-w-0 flex-1 relative z-20">
              
              {/* Nome da Empresa */}
              <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-white tracking-tight leading-tight drop-shadow-sm">
                {identity.name}
              </h1>

              {/* Categoria */}
              {identity.category && (
                <p className="text-sm sm:text-base font-semibold text-[#C9A227] tracking-wide">
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

              {/* Cidade e Estado */}
              {location && (location.city || location.state) && (
                <p className="text-xs text-stone-300 font-medium">
                  {[location.city, location.state].filter(Boolean).join(' • ')}
                </p>
              )}

            </div>

          </div>

        </div>
      </section>

      {/* CONTEÚDO PRINCIPAL (#F8F7F5) - Menu Sobreposto Flutuante com -mt-10 sm:-mt-12 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-30 space-y-6">

        {/* BARRA DE AÇÕES RÁPIDAS COM NAVEGAÇÃO EM ABAS */}
        <QuickActionBar
          contacts={contacts}
          location={location}
          businessName={identity.name}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* GRID DE CONTEÚDO EM 3 COLUNAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* COLUNA ESQUERDA (Conteúdo Principal - 8 cols no desktop) */}
          <main className="lg:col-span-8 space-y-6">
            
            <div id="visao-geral">
              <BusinessAbout identity={identity} />
            </div>

            <div id="beneficios">
              <BusinessBenefits benefits={profile.benefits} />
            </div>

            <div id="servicos">
              <BusinessServices services={profile.services} />
            </div>

            <div id="fotos-videos">
              <BusinessGallery gallery={profile.media.gallery} />
            </div>

            <BusinessEvents events={profile.events} />
            <BusinessPosts posts={profile.posts} />

            <div id="comentarios">
              <BusinessCommunityReviewsCard reviews={profile.reviews} owner={owner} />
            </div>

          </main>

          {/* COLUNA DIREITA (Sidebar - 4 cols no desktop) */}
          <aside className="lg:col-span-4 space-y-6">
            
            {/* Card Destacado de Selos e Reconhecimentos Institucionais (Exclusivo Plano Ouro - Fundo Bordô #3B0B14, 32x32 sem texto) */}
            <InstitutionalBadges recognition={recognition} catalog={recognition.catalog} commercialPlan={profile.plan.commercialPlan} variant="gold-card" />



            {/* Card do Responsável visível no Plano Ouro */}
            <BusinessOwnerCard owner={owner} logo={identity.logo} businessName={identity.name} isVerified={authority?.isVerified || recognition?.verified} />

            {/* Card de Horário de Funcionamento */}
            <BusinessHours hours={profile.hours} />

            {/* Card de Endereço com Mapa Interativo Incorporado */}
            <BusinessLocationCard location={profile.location} businessName={identity.name} />

            {/* Card de Contatos Directos */}
            <div id="contato">
              <BusinessContacts contacts={profile.contacts} />
            </div>

          </aside>

        </div>

      </div>

    </div>
  );
}
