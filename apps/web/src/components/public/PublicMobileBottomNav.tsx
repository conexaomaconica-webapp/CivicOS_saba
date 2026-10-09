'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Sparkles,
  Compass,
  Landmark,
  Menu,
  X,
  CalendarDays,
  PlusCircle,
  Heart,
  ShieldCheck,
  FileText,
  Lock,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { openCookiePreferences } from '@/components/analytics/GoogleAnalytics';
import { useFavorites } from '@/lib/directory/favorites-context';

function useSafeFavorites() {
  try {
    return useFavorites();
  } catch {
    return { favoritesCount: 0, setIsModalOpen: () => {} };
  }
}

export function PublicMobileBottomNav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewer, setViewer] = useState<{ name: string; href: string } | null>(null);
  const { favoritesCount, setIsModalOpen } = useSafeFavorites();

  // Fecha o menu ao navegar entre rotas
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Bloqueia scroll do fundo e fecha com tecla ESC quando o menu estiver aberto
  useEffect(() => {
    if (!menuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  // Carrega status de sessão do usuário para a seção Minha Conta do menu
  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const fetchSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !isMounted) {
          setViewer(null);
          return;
        }

        const meta = user.user_metadata || {};
        const metaName = [meta.full_name, meta.name].find(
          (v): v is string => typeof v === 'string' && v.trim().length > 0
        );
        let name = metaName || (user.email ? user.email.split('@')[0]! : 'Minha conta');
        let href = '/minha-conta';

        try {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('name, role')
            .eq('id', user.id)
            .maybeSingle();

          if (profile?.name) name = profile.name;
          if (profile?.role && profile.role !== 'member') href = '/login';
        } catch {
          // Ignora falha de busca de perfil complementar
        }

        if (isMounted) {
          setViewer({
            name: String(name).trim().split(/\s+/)[0] || 'Minha conta',
            href,
          });
        }
      } catch {
        if (isMounted) setViewer(null);
      }
    };

    void fetchSession();
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      void fetchSession();
    });

    return () => {
      isMounted = false;
      authSub?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await createClient().auth.signOut();
      setViewer(null);
      setMenuOpen(false);
      window.location.reload();
    } catch {
      // Ignora erro de logout
    }
  };

  // Estados ativos por rota
  const isHomeActive = pathname === '/guia' || pathname === '/';
  const isBenefitsActive = pathname?.startsWith('/guia/beneficios');
  const isExploreActive = pathname?.startsWith('/guia/empresas');
  const isLojasActive = pathname?.startsWith('/guia/lojas');

  const returnTo = pathname || '/guia';
  const loginHref = `/login?redirect=${encodeURIComponent(returnTo)}`;
  const registerHref = `/register?redirect=${encodeURIComponent(returnTo)}`;

  return (
    <>
      {/* DRAWER / MODAL DO MENU MOBILE */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-[70] md:hidden print:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Menu principal de navegação"
        >
          {/* Backdrop semitransparente */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Bottom Sheet com cantos arredondados */}
          <div className="fixed inset-x-0 bottom-0 z-[75] max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-[#C59B27]/40 bg-[#4A0E1A] p-5 pb-[calc(2.5rem+env(safe-area-inset-bottom))] text-white shadow-2xl animate-in slide-in-from-bottom duration-300">
            {/* Indicador de arrasto no topo */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />

            {/* Cabeçalho do Menu */}
            <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-serif text-lg font-bold text-[#F3CE61]">◈ Conexão Maçônica</span>
                <span className="rounded-full bg-[#C9A227]/15 px-2 py-0.5 text-[10px] font-semibold text-[#F3CE61] border border-[#C9A227]/30">
                  Portal
                </span>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-stone-400 hover:bg-white/10 hover:text-white transition-colors"
                aria-label="Fechar painel do menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Seção 1: Área do Usuário / Login */}
            <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-3.5">
              {viewer ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#C9A227] text-[#240509] font-bold text-sm shadow-md">
                      {viewer.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-xs text-stone-400">Logado como</p>
                      <p className="text-sm font-bold text-white">Olá, {viewer.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={viewer.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl bg-[#C9A227] px-3 py-1.5 text-xs font-bold text-[#240509] shadow hover:bg-[#b89320] transition-colors"
                    >
                      Minha conta
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-stone-400 hover:text-rose-400 transition-colors"
                      title="Sair da conta"
                      aria-label="Sair"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-stone-400">Faça parte da nossa rede</p>
                    <p className="text-sm font-bold text-white">Acesse sua conta</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={loginHref}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl bg-[#C9A227] px-3.5 py-1.5 text-xs font-bold text-[#240509] shadow hover:bg-[#b89320] transition-colors"
                    >
                      Entrar
                    </Link>
                    <Link
                      href={registerHref}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl border border-[#C9A227]/40 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#F3CE61] hover:bg-white/10 transition-colors"
                    >
                      Cadastrar
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Seção 2: Links Principais Complementares */}
            <div className="mb-5 space-y-1">
              <p className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Mais Recursos
              </p>

              {/* Eventos */}
              <Link
                href="/guia/eventos"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-stone-200 hover:bg-white/5 hover:text-[#F3CE61] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9A227]/15 text-[#F3CE61]">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <span>Eventos & Encontros</span>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-500" />
              </Link>

              {/* Anunciar Empresa */}
              <Link
                href="/anunciar/passo-1"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-stone-200 hover:bg-white/5 hover:text-[#F3CE61] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C9A227]/20 text-[#F3CE61]">
                    <PlusCircle className="h-4 w-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Anunciar Minha Empresa</span>
                    <span className="rounded-md bg-[#C9A227] px-1.5 py-0.5 text-[9px] font-bold text-[#240509]">
                      Destaque
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-500" />
              </Link>

              {/* Meus Favoritos */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setIsModalOpen(true);
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-stone-200 hover:bg-white/5 hover:text-[#F3CE61] transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400">
                    <Heart className="h-4 w-4 fill-rose-500/30" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Meus Negócios Salvos</span>
                    {favoritesCount > 0 && (
                      <span className="rounded-full bg-rose-600 px-1.5 py-0.2 text-[10px] font-bold text-white">
                        {favoritesCount}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-stone-500" />
              </button>
            </div>

            {/* Seção 3: Institucional & Privacidade LGPD */}
            <div className="space-y-1 border-t border-white/10 pt-4">
              <p className="px-1 mb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Privacidade & Informações Legais
              </p>

              {/* Preferências de Cookies */}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openCookiePreferences();
                }}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-300 hover:bg-white/5 hover:text-[#F3CE61] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-[#C9A227]" />
                  <span>Preferências de Cookies (LGPD)</span>
                </div>
                <span className="text-[10px] text-stone-500">Configurar</span>
              </button>

              {/* Política de Privacidade */}
              <Link
                href="/privacidade"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-300 hover:bg-white/5 hover:text-[#F3CE61] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="h-4 w-4 text-stone-400" />
                  <span>Política de Privacidade</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-stone-500" />
              </Link>

              {/* Termos de Uso */}
              <Link
                href="/termos"
                onClick={() => setMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-stone-300 hover:bg-white/5 hover:text-[#F3CE61] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="h-4 w-4 text-stone-400" />
                  <span>Termos de Uso</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-stone-500" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* BARRA FIXA MOBILE INFERIOR */}
      <aside
        aria-label="Barra de navegação móvel"
        className="fixed bottom-0 left-0 right-0 z-50 md:hidden print:hidden"
      >
        <nav
          aria-label="Navegação rápida"
          className="relative flex h-16 w-full items-center justify-around border-t border-[#C59B27]/30 bg-[#4A0E1A]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
        >
          {/* 1. INÍCIO */}
          <Link
            href="/guia"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-95",
              isHomeActive ? "text-[#F3CE61]" : "text-white/75 hover:text-white"
            )}
            aria-label="Ir para a página inicial do guia"
          >
            <div className="relative">
              <Home className={cn("h-5 w-5 transition-transform", isHomeActive && "scale-110")} />
              {isHomeActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C9A227] animate-in zoom-in" />
              )}
            </div>
            <span className={cn("text-[10px] tracking-tight", isHomeActive ? "font-bold" : "font-medium")}>
              Início
            </span>
          </Link>

          {/* 2. BENEFÍCIOS */}
          <Link
            href="/guia/beneficios"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-95",
              isBenefitsActive ? "text-[#F3CE61]" : "text-white/75 hover:text-white"
            )}
            aria-label="Conhecer benefícios exclusivos para membros"
          >
            <div className="relative">
              <Sparkles className={cn("h-5 w-5 transition-transform", isBenefitsActive && "scale-110")} />
              {isBenefitsActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C9A227] animate-in zoom-in" />
              )}
            </div>
            <span className={cn("text-[10px] tracking-tight", isBenefitsActive ? "font-bold" : "font-medium")}>
              Benefícios
            </span>
          </Link>

          {/* 3. EXPLORAR */}
          <Link
            href="/guia/empresas"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-95",
              isExploreActive ? "text-[#F3CE61]" : "text-white/75 hover:text-white"
            )}
            aria-label="Explorar catálogo de empresas e negócios"
          >
            <div className="relative">
              <Compass className={cn("h-5 w-5 transition-transform", isExploreActive && "scale-110")} />
              {isExploreActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C9A227] animate-in zoom-in" />
              )}
            </div>
            <span className={cn("text-[10px] tracking-tight", isExploreActive ? "font-bold" : "font-medium")}>
              Explorar
            </span>
          </Link>

          {/* 4. LOJAS */}
          <Link
            href="/guia/lojas"
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-95",
              isLojasActive ? "text-[#F3CE61]" : "text-white/75 hover:text-white"
            )}
            aria-label="Consultar lojas maçônicas e potências"
          >
            <div className="relative">
              <Landmark className={cn("h-5 w-5 transition-transform", isLojasActive && "scale-110")} />
              {isLojasActive && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C9A227] animate-in zoom-in" />
              )}
            </div>
            <span className={cn("text-[10px] tracking-tight", isLojasActive ? "font-bold" : "font-medium")}>
              Lojas
            </span>
          </Link>

          {/* 5. MENU */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu de opções"}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-95 focus:outline-none",
              menuOpen ? "text-[#F3CE61]" : "text-white/75 hover:text-white"
            )}
          >
            <div className="relative">
              <Menu className={cn("h-5 w-5 transition-transform", menuOpen && "scale-110")} />
              {menuOpen && (
                <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C9A227] animate-in zoom-in" />
              )}
            </div>
            <span className={cn("text-[10px] tracking-tight", menuOpen ? "font-bold" : "font-medium")}>
              Menu
            </span>
          </button>
        </nav>
      </aside>
    </>
  );
}
