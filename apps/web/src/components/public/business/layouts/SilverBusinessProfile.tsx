'use client';

import React, { useState } from 'react';
import { Heart, Share2, Building2 } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import type { PublicBusinessPresentation, PublicMediaAsset } from '@/lib/business/public-business-presentation';
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

type SilverBusinessProfileProps = {
  profile: PublicBusinessPresentation;
};

export function SilverBusinessProfile({ profile }: SilverBusinessProfileProps) {
  const [activeTab, setActiveTab] = useState('visao-geral');
  const [copiedShare, setCopiedShare] = useState(false);
  const { isFavorite, toggleFavorite } = useFavorites();

  const { identity, recognition, authority, location, contacts, owner, media } = profile;
  const isFavorited = isFavorite(identity.slug);

  // 1. Filtrar lista de mídias eliminando duplicatas entre cover e gallery
  const rawMediaList = [media.cover, ...(media.gallery || [])].filter(Boolean) as PublicMediaAsset[];
  const heroImages = rawMediaList.filter((item, index, self) =>
    index === self.findIndex((t) => t.url === item.url)
  );

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

  const renderActionOverlay = () => (
    <div className="absolute top-3 right-3 z-20 flex items-center gap-2 text-xs font-medium">
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
  );

  // 2. Renderizador Adaptativo Compacto do Mosaico Fotográfico com Altura Limitada (320px–360px no Desktop)
  const renderAdaptiveMosaic = (images: PublicMediaAsset[]) => {
    if (images.length === 0) return null;

    // COM 4 OU MAIS FOTOS: 1 foto principal no topo (~65%) + 3 secundárias na base (~35%)
    if (images.length >= 4) {
      const imgMain = images[0]!;
      const subImages = [images[1]!, images[2]!, images[3]!];
      return (
        <div className="relative w-full h-[320px] sm:h-[340px] xl:h-[360px] rounded-2xl overflow-hidden border border-[#E8E5DF] shadow-xs bg-stone-100 flex flex-col gap-1.5 p-1.5">
          {renderActionOverlay()}

          {/* Foto Principal (~65% da altura) */}
          <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden group">
            <img
              src={imgMain.url}
              alt={imgMain.alt || `Ambiente principal de ${identity.name}`}
              style={{ objectPosition: getObjectPosition(imgMain) }}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
          </div>

          {/* 3 Fotos Secundárias na Base (~35% da altura: 95px a 110px) */}
          <div className="grid grid-cols-3 gap-1.5 h-[95px] sm:h-[110px] shrink-0">
            {subImages.map((img, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden group h-full">
                <img
                  src={img.url}
                  alt={img.alt || `Foto ${idx + 2} de ${identity.name}`}
                  style={{ objectPosition: getObjectPosition(img) }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // COM EXATAMENTE 3 FOTOS: 1 foto principal no topo + 2 fotos na base
    if (images.length === 3) {
      const imgMain = images[0]!;
      const subImages = [images[1]!, images[2]!];
      return (
        <div className="relative w-full h-[320px] sm:h-[340px] xl:h-[360px] rounded-2xl overflow-hidden border border-[#E8E5DF] shadow-xs bg-stone-100 flex flex-col gap-1.5 p-1.5">
          {renderActionOverlay()}

          <div className="relative flex-1 min-h-0 rounded-xl overflow-hidden group">
            <img
              src={imgMain.url}
              alt={imgMain.alt || `Foto principal de ${identity.name}`}
              style={{ objectPosition: getObjectPosition(imgMain) }}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-black/10 pointer-events-none" />
          </div>

          <div className="grid grid-cols-2 gap-1.5 h-[95px] sm:h-[110px] shrink-0">
            {subImages.map((img, idx) => (
              <div key={idx} className="relative rounded-xl overflow-hidden group h-full">
                <img
                  src={img.url}
                  alt={img.alt || `Foto ${idx + 2} de ${identity.name}`}
                  style={{ objectPosition: getObjectPosition(img) }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>
        </div>
      );
    }

    // COM EXATAMENTE 2 FOTOS: 2 fotos com composição equilibrada lado a lado
    if (images.length === 2) {
      const img1 = images[0]!;
      const img2 = images[1]!;
      return (
        <div className="relative w-full h-[320px] sm:h-[340px] xl:h-[360px] rounded-2xl overflow-hidden border border-[#E8E5DF] shadow-xs bg-stone-100 grid grid-cols-1 sm:grid-cols-2 gap-1.5 p-1.5">
          {renderActionOverlay()}

          <div className="relative rounded-xl overflow-hidden group h-full">
            <img
              src={img1.url}
              alt={img1.alt || `Foto 1 de ${identity.name}`}
              style={{ objectPosition: getObjectPosition(img1) }}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
          </div>

          <div className="relative rounded-xl overflow-hidden group h-full">
            <img
              src={img2.url}
              alt={img2.alt || `Foto 2 de ${identity.name}`}
              style={{ objectPosition: getObjectPosition(img2) }}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
          </div>
        </div>
      );
    }

    // COM SOMENTE 1 FOTO: Exibe uma única foto compacta em h-[320px] sm:h-[340px]
    const singleImg = images[0]!;
    return (
      <div className="relative w-full h-[320px] sm:h-[340px] xl:h-[360px] rounded-2xl overflow-hidden border border-[#E8E5DF] shadow-xs bg-stone-100 group">
        {renderActionOverlay()}
        <img
          src={singleImg.url}
          alt={singleImg.alt || `Foto corporativa de ${identity.name}`}
          style={{ objectPosition: getObjectPosition(singleImg) }}
          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F7F5] text-stone-900 font-sans pb-16">
      
      {/* HERO BANNER PRATA - Vitrine Fotográfica Compacta e Horizontal */}
      <header className="relative w-full bg-white text-stone-900 border-b border-[#E8E5DF] shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            
            {/* COLUNA ESQUERDA: Informações Institucionais da Empresa (5 cols no desktop: ~42%, Alinhamento Centralizado) */}
            <div
              className={
                heroImages.length > 0
                  ? 'lg:col-span-5 flex flex-col justify-center space-y-4 my-auto'
                  : 'lg:col-span-12 flex flex-col justify-center space-y-4 my-auto'
              }
            >
              <div className="flex items-start gap-4 sm:gap-5">
                
                {/* Logo da Empresa com Ampliação em Lightbox */}
                <CompanyLogoWithZoom logo={identity.logo} businessName={identity.name} />

                <div className="space-y-1.5 min-w-0 flex-1">
                  <h1 className="font-serif font-bold text-2xl sm:text-3xl lg:text-4xl text-stone-900 tracking-tight leading-tight">
                    {identity.name}
                  </h1>

                  {identity.category && (
                    <p className="text-xs sm:text-sm font-semibold text-[#C9A227]">
                      {identity.category}
                    </p>
                  )}

                  {/* Selos Institucionais no Hero */}
                  <div className="pt-1">
                    <InstitutionalBadges recognition={recognition} catalog={recognition.catalog} commercialPlan={profile.plan.commercialPlan} variant="compact" />
                  </div>



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

            {/* COLUNA DIREITA: Vitrine em Mosaico Compacto de Altura Limitada (7 cols no desktop: ~58%) */}
            {heroImages.length > 0 && (
              <div className="lg:col-span-7 w-full flex items-center justify-center">
                {renderAdaptiveMosaic(heroImages)}
              </div>
            )}

          </div>

        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL (#F8F7F5) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        <QuickActionBar
          contacts={contacts}
          location={location}
          businessName={identity.name}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
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

          <aside className="lg:col-span-4 space-y-6">
            
            <BusinessOwnerCard owner={owner} logo={identity.logo} businessName={identity.name} isVerified={authority?.isVerified || recognition?.verified} />
            <BusinessHours hours={profile.hours} />
            <BusinessLocationCard location={profile.location} businessName={identity.name} />

            <div id="contato">
              <BusinessContacts contacts={profile.contacts} />
            </div>

          </aside>

        </div>

      </div>

    </div>
  );
}
