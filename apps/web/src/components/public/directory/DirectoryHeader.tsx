'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, Bell, MapPin, User } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';

type DirectoryHeaderProps = {
  appName?: string;
  logoUrl?: string | null;
  selectedCity?: string | null;
  availableCities?: string[];
  onCityChange?: (city: string) => void;
};

export function DirectoryHeader({
  appName = 'Conexão Maçônica',
  logoUrl,
  selectedCity,
  availableCities = [],
  onCityChange,
}: DirectoryHeaderProps) {
  const { favoritesCount, setIsModalOpen } = useFavorites();
  const logoSrc = logoUrl || '/logoconexao_red_vert.png';

  return (
    <header className="dh-header">
      <div className="dh-container dh-header__inner">
        {/* Brand / Logo (Vertical logo) */}
        <Link href="/guia" className="dh-header__brand">
          <Image
            src={logoSrc}
            alt={appName}
            width={160}
            height={56}
            className="h-12 w-auto object-contain py-1"
            priority
            unoptimized
          />
        </Link>

        {/* Navigation Items */}
        <nav className="dh-header__nav" aria-label="Navegação do Guia">
          <Link href="/guia" className="dh-header__link">
            Início
          </Link>
          <Link href="/guia/empresas" className="dh-header__link">
            Empresas
          </Link>
          <Link href="/guia#beneficios" className="dh-header__link">
            Benefícios
          </Link>
          <Link href="/guia#eventos" className="dh-header__link">
            Eventos
          </Link>
          <Link href="/guia/lojas" className="dh-header__link">
            Lojas Maçônicas
          </Link>
        </nav>

        {/* User Actions & City Selector */}
        <div className="dh-header__actions">
          {/* Seletor de Cidade */}
          <div className="dh-city-dropdown">
            <MapPin className="w-4 h-4 text-amber-400" />
            <select
              value={selectedCity || ''}
              onChange={(e) => onCityChange && onCityChange(e.target.value)}
              className="bg-transparent text-white border-none outline-none font-semibold cursor-pointer text-xs"
            >
              <option value="" className="bg-amber-950 text-white">Todas as Cidades</option>
              {availableCities.map((c) => (
                <option key={c} value={c} className="bg-amber-950 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Botão de Favoritos com Badge */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="dh-header__icon-btn relative"
            title="Ver meus favoritos"
            aria-label="Favoritos"
          >
            <Heart className={`w-5 h-5 ${favoritesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-amber-950 animate-pulse">
                {favoritesCount}
              </span>
            )}
          </button>

          <button className="dh-header__icon-btn" title="Notificações" aria-label="Notificações">
            <Bell className="w-5 h-5" />
          </button>
          
          <Link
            href="/auth/login"
            className="flex items-center gap-2 bg-amber-600/30 hover:bg-amber-600/50 text-white text-xs font-semibold px-3.5 py-1.5 rounded-full border border-amber-500/40 shadow-sm backdrop-blur-sm transition-colors"
          >
            <User className="w-4 h-4 text-amber-400" />
            <span>Entrar</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
