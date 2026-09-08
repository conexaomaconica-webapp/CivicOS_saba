'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Heart, MapPin, User, Menu, X, PlusCircle } from 'lucide-react';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { favoritesCount, setIsModalOpen } = useFavorites();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentParamCity = searchParams ? (searchParams.get('city') || searchParams.get('cidade') || '') : '';
  const activeCity = selectedCity !== undefined && selectedCity !== null ? selectedCity : currentParamCity;
  const logoSrc = logoUrl || '/logoconexao_red_vert.png';

  const handleCityChange = (city: string) => {
    if (onCityChange) {
      onCityChange(city);
    } else {
      const currentParams = searchParams ? searchParams.toString() : '';
      const params = new URLSearchParams(currentParams);
      if (city) {
        params.set('city', city);
      } else {
        params.delete('city');
        params.delete('cidade');
      }
      params.delete('page');
      const queryString = params.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ''}`);
    }
  };

  const citiesToDisplay = availableCities || [];

  const navLinks = [
    { href: '/guia', label: 'Início', exact: true },
    { href: '/guia/empresas', label: 'Empresas' },
    { href: '/guia/beneficios', label: 'Benefícios' },
    { href: '/guia/eventos', label: 'Eventos' },
    { href: '/guia/lojas', label: 'Lojas Maçônicas' },
  ];

  const isLinkActive = (href: string, exact = false) => {
    if (!pathname) return false;
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="dh-header sticky top-0 z-50">
      <div className="dh-container dh-header__inner">
        {/* Brand / Logo */}
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

        {/* Navigation Links (Desktop) */}
        <nav className="dh-header__nav hidden md:flex" aria-label="Navegação do Guia">
          {navLinks.map((link) => {
            const active = isLinkActive(link.href, link.exact);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`dh-header__link ${active ? 'dh-header__link--active' : ''}`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions & City Selector */}
        <div className="dh-header__actions hidden md:flex items-center gap-3">
          {/* Seletor de Cidade */}
          <div className="dh-city-dropdown">
            <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
            <select
              value={activeCity || ''}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-transparent text-white border-none outline-none font-semibold cursor-pointer text-xs pr-1"
            >
              <option value="" className="bg-amber-950 text-white">Todas as Cidades</option>
              {citiesToDisplay.map((c) => (
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

          {/* Botão Anunciar Empresa */}
          <Link
            href="/anunciar/passo-1"
            className="hidden lg:flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-amber-500/40 transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Anunciar</span>
          </Link>

          {/* Botão Login / Entrar */}
          <Link
            href="/login"
            className="flex items-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-md transition-all border border-amber-400/30"
          >
            <User className="w-4 h-4" />
            <span>Entrar</span>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <div className="flex md:hidden items-center gap-2">
          {/* Seletor de Cidade Compacto Mobile */}
          <div className="dh-city-dropdown px-2 py-1">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={activeCity || ''}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-transparent text-white border-none outline-none font-medium cursor-pointer text-[11px] max-w-[100px] truncate"
            >
              <option value="" className="bg-amber-950 text-white">Cidades</option>
              {citiesToDisplay.map((c) => (
                <option key={c} value={c} className="bg-amber-950 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="dh-header__icon-btn relative p-1.5"
            aria-label="Favoritos"
          >
            <Heart className={`w-4 h-4 ${favoritesCount > 0 ? 'fill-red-500 text-red-500' : ''}`} />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                {favoritesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="dh-header__icon-btn p-2 text-white"
            aria-label="Abrir menu de navegação"
          >
            {mobileMenuOpen ? <X className="w-6 h-6 text-amber-400" /> : <Menu className="w-6 h-6 text-white" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-amber-950/95 backdrop-blur-xl border-b border-amber-500/20 px-4 py-5 shadow-2xl transition-all animate-fadeIn">
          <nav className="flex flex-col gap-3 mb-5">
            {navLinks.map((link) => {
              const active = isLinkActive(link.href, link.exact);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-semibold py-2 px-3 rounded-lg transition-colors flex items-center justify-between ${
                    active
                      ? 'bg-amber-500/20 text-amber-300 border-l-4 border-amber-400'
                      : 'text-white/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-white/10 flex flex-col gap-2.5">
            <Link
              href="/anunciar/passo-1"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold py-2.5 rounded-xl border border-amber-500/40 w-full"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Anunciar Empresa</span>
            </Link>

            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-xs font-semibold py-2.5 rounded-xl shadow-md w-full"
            >
              <User className="w-4 h-4" />
              <span>Entrar no Portal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

