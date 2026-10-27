'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Heart, MapPin, User, Menu, X, PlusCircle, LogOut, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useFavorites } from '@/lib/directory/favorites-context';
import { CategoryIcon, APP_CATEGORIES } from '@/components/landing/LandingMobileTopBar';
import { DirectoryLiveSearchBox } from './DirectoryLiveSearchBox';

type DirectoryHeaderProps = {
  appName?: string;
  logoUrl?: string | null;
  selectedCity?: string | null;
  availableCities?: string[];
  onCityChange?: (city: string) => void;
  categories?: Array<{ id?: string; slug: string; name: string; icon_name?: string | null; business_count?: number }>;
};

export function DirectoryHeader({
  appName = 'Conexão Maçônica',
  logoUrl,
  selectedCity,
  availableCities = [],
  onCityChange,
  categories = [],
}: DirectoryHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { favoritesCount, setIsModalOpen } = useFavorites();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sessão: undefined = ainda verificando, null = visitante, objeto = pessoa logada.
  const [viewer, setViewer] = useState<{ name: string; href: string } | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    const resolveViewer = async (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!active) return;
      if (!user) {
        setViewer(null);
        return;
      }
      const meta = user.user_metadata || {};
      const metaName = [meta.full_name, meta.name].find((v): v is string => typeof v === 'string' && v.trim().length > 0);
      let name = metaName || (user.email ? user.email.split('@')[0]! : 'Minha conta');
      let href = '/minha-conta';
      try {
        const { data: profile } = await (supabase as any).from('profiles').select('name, role').eq('id', user.id).maybeSingle();
        if (profile?.name) name = profile.name;
        // Membros vão para a própria conta; demais perfis (anunciante, admin) para a Central de Acessos.
        if (profile?.role && profile.role !== 'member') href = '/login';
      } catch {}
      if (active) setViewer({ name: String(name).trim().split(/\s+/)[0] || 'Minha conta', href });
    };

    supabase.auth.getUser().then(({ data }) => void resolveViewer(data.user as any)).catch(() => active && setViewer(null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => void resolveViewer((session?.user as any) ?? null));
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await createClient().auth.signOut();
    setViewer(null);
    setMobileMenuOpen(false);
    router.refresh();
  };

  // Depois de entrar (ou criar a conta), a pessoa volta para esta mesma página.
  const currentSearch = searchParams ? searchParams.toString() : '';
  const returnTo = `${pathname || '/guia'}${currentSearch ? `?${currentSearch}` : ''}`;
  const loginHref = `/login?redirect=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?redirect=${encodeURIComponent(returnTo)}`;

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

  const currentCat = searchParams ? (searchParams.get('cat') || searchParams.get('category') || '') : '';

  const headerCategories = React.useMemo(() => {
    if (categories && categories.length > 0) {
      // Prioriza categorias que têm empresas no catálogo
      const withBiz = categories.filter((c) => (c.business_count ?? 0) > 0);
      const withoutBiz = categories.filter((c) => !(c.business_count && c.business_count > 0));
      return [...withBiz, ...withoutBiz];
    }
    return APP_CATEGORIES;
  }, [categories]);

  const handleCategoryClick = (catSlug: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    if (currentCat === catSlug) {
      params.delete('cat');
      params.delete('category');
    } else {
      params.set('cat', catSlug);
      params.delete('category');
    }
    params.delete('page');

    // Se o usuário está na página inicial do Guia (/guia), permanece em /guia e rola até a listagem #todas
    // Se está em /guia/empresas, permanece em /guia/empresas
    const isGuiaHome = pathname === '/guia' || pathname === '/guia/';
    const targetPath = isGuiaHome ? '/guia' : (pathname || '/guia/empresas');
    const hash = isGuiaHome ? '#todas' : '';
    router.push(`${targetPath}?${params.toString()}${hash}`);
  };

  const citiesToDisplay = Array.from(new Set(
    (availableCities || []).filter((city): city is string => typeof city === 'string' && city.trim().length > 0)
  )).sort((a, b) => a.localeCompare(b, 'pt-BR'));

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
      <div className="dh-container dh-header__inner hidden md:flex">
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
            <MapPin className="w-4 h-4 text-[#C9A227] shrink-0" />
            <select
              value={activeCity || ''}
              onChange={(e) => handleCityChange(e.target.value)}
              className="bg-transparent text-white border-none outline-none font-semibold cursor-pointer text-xs pr-1"
            >
              <option value="" className="bg-white text-stone-900">Todas as Cidades</option>
              {citiesToDisplay.map((c) => (
                <option key={c} value={c} className="bg-white text-stone-900">
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
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center border border-[#2b060d] animate-pulse">
                {favoritesCount}
              </span>
            )}
          </button>

          {/* Botão Anunciar Empresa */}
          <Link
            href="/anunciar/passo-1"
            className="hidden lg:flex items-center gap-1.5 bg-[#C9A227]/15 hover:bg-[#C9A227]/25 text-[#f3cf68] hover:text-white text-xs font-semibold px-3.5 py-1.5 rounded-full border border-[#C9A227]/50 shadow-sm transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Anunciar</span>
          </Link>

          {/* Sessão: Entrar / Cadastrar (visitante) ou Minha conta + Sair (logado) */}
          {viewer === undefined ? (
            <span className="h-8 w-24" aria-hidden="true" />
          ) : viewer ? (
            <div className="flex items-center gap-2">
              <Link
                href={viewer.href}
                className="flex items-center gap-2 bg-[#C9A227] hover:bg-[#b89320] text-[#2b060d] text-xs font-bold px-4 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all border border-[#ffd866]/30"
                title="Ir para minha conta"
              >
                <User className="w-4 h-4 text-[#2b060d]" />
                <span className="max-w-[64px] truncate lg:max-w-[110px]">Olá, {viewer.name}</span>
              </Link>
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="dh-header__icon-btn"
                title="Sair"
                aria-label="Sair da conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <Link href={registerHref} className="hidden 2xl:inline whitespace-nowrap text-xs font-semibold text-[#f3cf68] hover:text-white transition-colors">
                Cadastre-se grátis
              </Link>
              <Link
                href={loginHref}
                className="flex items-center gap-2 bg-[#C9A227] hover:bg-[#b89320] text-[#2b060d] text-xs font-bold px-4 py-1.5 rounded-full shadow-md hover:shadow-lg transition-all border border-[#ffd866]/30"
              >
                <User className="w-4 h-4 text-[#2b060d]" />
                <span>Entrar</span>
              </Link>
            </>
          )}
        </div>

      </div>

      {/* Topo Mobile (< md) — Formato idêntico ao App nativo da Conexão Maçônica */}
      <div className="flex flex-col gap-2 px-3 pt-2 pb-2 md:hidden bg-[#4b161b] text-white border-b border-[#c9a227]/40 shadow-md">
        {/* Linha 1: Marca + Seletor de Cidades ao lado da Logo + Ações */}
        <div className="flex items-center justify-between gap-2 w-full">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Link href="/guia" className="inline-flex shrink-0 items-center" aria-label="Conexão Maçônica — início">
              <Image
                src={logoSrc}
                alt={appName}
                width={160}
                height={56}
                className="h-8 w-auto object-contain brightness-110"
                priority
                unoptimized
              />
            </Link>

            {/* Seletor de Cidades no topo ao lado da logo (Pill idêntico ao app) */}
            <div className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-[#c9a227]/50 bg-white/10 text-xs font-semibold text-[#f3eedd] max-w-[170px] truncate hover:bg-white/15 transition-colors">
              <MapPin className="w-3.5 h-3.5 text-[#c9a227] shrink-0" />
              <select
                value={activeCity || ''}
                onChange={(e) => handleCityChange(e.target.value)}
                aria-label="Filtrar por cidade"
                className="bg-transparent text-white border-none outline-none cursor-pointer text-xs font-semibold truncate pr-1"
              >
                <option value="" className="bg-white text-stone-900">Brasil (Todas)</option>
                {citiesToDisplay.map((c) => (
                  <option key={c} value={c} className="bg-white text-stone-900">
                    {c}
                  </option>
                ))}
              </select>
              <span className="text-[#dfbd58] text-[10px] shrink-0">▾</span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Favoritos */}
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

            {/* Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="dh-header__icon-btn p-1.5 text-white"
              aria-label="Abrir menu de navegação"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-[#c9a227]" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Linha 2: Campo Buscar empresas ou serviços com busca ao vivo / autocomplete */}
        <DirectoryLiveSearchBox
          variant="header"
          placeholder="Buscar empresas ou serviços..."
          selectedCity={activeCity}
          availableCities={citiesToDisplay}
          categories={headerCategories.map((c) => ({ id: 'id' in c ? c.id : undefined, slug: c.slug, name: c.name }))}
          initialQuery={searchParams ? (searchParams.get('q') || '') : ''}
          actionUrl="/guia/empresas"
        />

        {/* Linha 3: Slider Horizontal de Ícones de Categorias (Categorias do catálogo preferencialmente) */}
        <div className="relative -mx-3 px-3 overflow-x-auto scrollbar-none py-1" role="region" aria-label="Categorias em destaque">
          <div className="flex gap-2.5 w-max">
            {headerCategories.map((cat) => {
              const isActive = currentCat === cat.slug;
              const hasCount = ('business_count' in cat && (cat.business_count ?? 0) > 0) || Boolean((cat as any).isCatalog);
              return (
                <button
                  key={cat.slug}
                  type="button"
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={`flex flex-col items-center gap-1 w-[60px] shrink-0 text-center transition-all ${
                    isActive ? 'scale-105' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`relative flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm transition-all ${
                      isActive
                        ? 'bg-[#c9a227] text-[#2a0a10] ring-2 ring-white shadow-md'
                        : 'bg-[#fffdfa] text-[#4b161b] border border-[#e2d1bd] hover:border-[#c9a227]'
                    }`}
                  >
                    <CategoryIcon slug={cat.slug} name={cat.name} />
                    {hasCount && (
                      <span
                        className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#c9a227] border-2 border-[#4b161b]"
                        title="Ativo no Catálogo"
                      />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold leading-tight line-clamp-1 w-full ${
                      isActive ? 'text-[#dfbd58]' : 'text-[#f3eedd]'
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="animate-fadeIn border-b border-[#c59b27]/25 bg-[#3b0b14]/98 px-4 py-5 shadow-2xl backdrop-blur-xl transition-all md:hidden">
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
                      ? 'bg-[#C9A227]/20 text-[#f3cf68] border-l-4 border-[#C9A227]'
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
              className="flex items-center justify-center gap-2 bg-[#C9A227]/15 hover:bg-[#C9A227]/25 text-[#f3cf68] text-xs font-semibold py-2.5 rounded-xl border border-[#C9A227]/50 w-full shadow-sm transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Anunciar Empresa</span>
            </Link>

            {viewer ? (
              <>
                <Link
                  href={viewer.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-[#C9A227] hover:bg-[#b89320] text-[#2b060d] text-xs font-bold py-2.5 rounded-xl shadow-md w-full transition-all border border-[#ffd866]/30"
                >
                  <User className="w-4 h-4 text-[#2b060d]" />
                  <span>Olá, {viewer.name} — minha conta</span>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex items-center justify-center gap-2 text-white/80 hover:text-white text-xs font-semibold py-2 w-full"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sair</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href={loginHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-[#C9A227] hover:bg-[#b89320] text-[#2b060d] text-xs font-bold py-2.5 rounded-xl shadow-md w-full transition-all border border-[#ffd866]/30"
                >
                  <User className="w-4 h-4 text-[#2b060d]" />
                  <span>Entrar no Portal</span>
                </Link>
                <Link
                  href={registerHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 text-[#f3cf68] hover:text-white text-xs font-semibold py-2 w-full"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Cadastre-se grátis como membro</span>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

