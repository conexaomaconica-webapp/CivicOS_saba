'use client';

import React from 'react';
import { ShieldCheck, UserCheck, Handshake } from 'lucide-react';
import { DirectoryLiveSearchBox } from './DirectoryLiveSearchBox';

type DirectoryHeroProps = {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  selectedCity?: string | null;
  initialQuery?: string;
  /** Negócios confirmados pelas empresas no Mural de Conexões (exibido só quando maior que zero). */
  confirmedConnections?: number;
};

export function DirectoryHero({
  title = 'Encontre empresas, serviços e conexões de confiança',
  subtitle = 'Descubra oportunidades dentro de uma rede que valoriza relacionamento, credibilidade e propósito.',
  searchPlaceholder = 'Digite o nome da empresa ou serviço...',
  selectedCity,
  initialQuery = '',
  confirmedConnections = 0,
}: DirectoryHeroProps) {
  return (
    <section className="dh-hero relative z-30">
      {/* Floating & Pulsing Golden Circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="dh-gold-orb dh-gold-orb--1" />
        <div className="dh-gold-orb dh-gold-orb--2" />
        <div className="dh-gold-orb dh-gold-orb--3" />
      </div>

      <div className="dh-container relative z-10">
        <h1 className="dh-hero__title">{title}</h1>
        <p className="dh-hero__subtitle">{subtitle}</p>

        {/* Live Search Input Bar & Dropdown */}
        <DirectoryLiveSearchBox
          initialQuery={initialQuery}
          placeholder={searchPlaceholder}
          selectedCity={selectedCity}
          actionUrl="/guia/empresas"
          className="max-w-[780px] mx-auto z-40"
          iconType="search"
        />

        {/* Badges de Confiança do Hero */}
        <div className="dh-hero__tags">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Empresas verificadas
          </span>
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-amber-400" /> Resultados instantâneos
          </span>
          {confirmedConnections > 0 && (
            <span className="flex items-center gap-1.5">
              <Handshake className="w-4 h-4 text-amber-400" />
              {confirmedConnections} {confirmedConnections === 1 ? 'negócio confirmado' : 'negócios confirmados'} pela Conexão
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
