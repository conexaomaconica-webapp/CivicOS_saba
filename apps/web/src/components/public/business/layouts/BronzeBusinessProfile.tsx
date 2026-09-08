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

type BronzeBusinessProfileProps = {
  profile: PublicBusinessPresentation;
};

export function BronzeBusinessProfile({ profile }: BronzeBusinessProfileProps) {
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
      
      {/* HERO BANNER BRONZE - Composição Horizontal Split em 2 Colunas no Desktop */}
      <header className="relative w-full bg-white text-stone-900 border-b border-[#E8E5DF] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* COLUNA ESQUERDA: Identidade e Informações Resumidas da Empresa (7 cols: ~58%) */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div className="flex items-start gap-4 sm:gap-5">
                
                {/* Logo da Empresa com Ampliação em Lightbox */}
                <CompanyLogoWithZoom logo={identity.logo} businessName={identity.name} />

                <div className="space-y-1.5 flex-1 min-w-0">
                  <InstitutionalBadges recognition={recognition} catalog={recognition.catalog} commercialPlan={profile.plan.commercialPlan} variant="compact" />



                  <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[#4B161B] tracking-tight truncate mt-1">
                    {identity.name}
                  </h1>

                  <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">
                    {identity.category}
                  </p>

                  {/* Cidade e Estado */}
                  {location && (location.city || location.state) && (
                    <p className="text-xs text-stone-500 font-medium pt-0.5">
                      {[location.city, location.state].filter(Boolean).join(' • ')}
                    </p>
                  )}

                  {/* Nome do Responsável + Loja Maçônica no Subtítulo */}
                  {owner && (
                    <div className="text-xs text-stone-600 font-medium pt-1 space-y-0.5">
                      <p>
                        Responsável: <strong className="text-stone-900 font-bold">{owner.communityLabel ? `${owner.communityLabel} ` : ''}{owner.name}</strong>
                      </p>
                      {owner.organization && (
                        <p className="inline-flex items-center gap-1 text-[#4B161B] font-semibold">
                          <Building2 className="w-3.5 h-3.5 text-[#C9A227] shrink-0" />
                          <span>Loja: <strong>{owner.organization}</strong></span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* COLUNA DIREITA: Foto Corporativa da Empresa com Ações Sobrepostas (5 cols: ~42%) */}
            <div className="lg:col-span-5 relative w-full h-48 sm:h-56 lg:h-full min-h-[200px] rounded-2xl overflow-hidden border border-[#E8E5DF] shadow-xs group bg-stone-100">
              <img
                src={coverUrl}
                alt={`Foto corporativa de ${identity.name}`}
                style={{ objectPosition: getObjectPosition(media.cover) }}
                className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20 pointer-events-none" />

              {/* Botões Compartilhar e Favoritar Sobrepostos no Canto Superior Direito da Foto */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-2 text-xs font-medium">
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-stone-800 font-semibold border border-stone-200 transition-all shadow-xs cursor-pointer backdrop-blur-xs text-xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-stone-600" />
                  <span>{copiedShare ? 'Copiado!' : 'Compartilhar'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleFavorite(identity.slug)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all shadow-xs cursor-pointer backdrop-blur-xs text-xs ${
                    isFavorited
                      ? 'bg-rose-600 text-white border-rose-600 font-bold'
                      : 'bg-white/90 hover:bg-white text-stone-800 font-semibold border-stone-200'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-white text-white' : 'text-stone-600'}`} />
                  <span>{isFavorited ? 'Favoritado' : 'Favoritar'}</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (Fundo Marfim/Suave #F8F7F5) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

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
            
            {/* Card do Responsável com Foto, Vínculo Fraterno e Loja Maçônica */}
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
