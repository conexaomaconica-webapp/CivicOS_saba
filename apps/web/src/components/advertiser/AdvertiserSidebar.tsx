'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Image,
  Eye,
  Briefcase,
  Award,
  Calendar,
  FileText,
  TrendingUp,
  CreditCard,
  Receipt,
  FileCheck2,
  Bell,
  Handshake,
  Users,
  User,
  X,
  LogOut,
  QrCode,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { AdvertiserFeature, AdvertiserFeatures } from '@/lib/advertiser/advertiser-entitlements';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  /** Recurso do plano necessário; sem ele o item não aparece no menu. */
  requires?: AdvertiserFeature;
}

interface NavigationGroup {
  title: string;
  items: NavItem[];
}

const ADVERTISER_NAV_GROUPS: NavigationGroup[] = [
  {
    title: 'INÍCIO',
    items: [{ label: 'Visão Geral', href: '/anunciante', icon: LayoutDashboard }],
  },
  {
    title: 'MINHA EMPRESA',
    items: [
      { label: 'Perfil da Empresa', href: '/anunciante/empresa', icon: Building2 },
      { label: 'Fotos e Mídias', href: '/anunciante/empresa/midias', icon: Image },
    ],
  },
  {
    title: 'CONTEÚDO',
    items: [
      { label: 'Serviços', href: '/anunciante/conteudo/servicos', icon: Briefcase },
      { label: 'Benefícios e Ofertas', href: '/anunciante/conteudo/beneficios', icon: Award, requires: 'benefits' },
      { label: 'Validar benefício', href: '/anunciante/beneficios/validar', icon: FileCheck2, requires: 'benefits' },
      { label: 'Eventos', href: '/anunciante/conteudo/eventos', icon: Calendar, requires: 'events' },
      { label: 'Publicações', href: '/anunciante/conteudo/posts', icon: FileText, requires: 'posts' },
    ],
  },
  {
    title: 'REDE E RESULTADOS',
    items: [
      { label: 'Desempenho do meu anúncio', href: '/anunciante/resultados', icon: TrendingUp },
      { label: 'Conexões', href: '/anunciante/conexoes', icon: Handshake },
      { label: 'Indicações', href: '/anunciante/indicacoes', icon: Users },
      { label: 'QR da empresa', href: '/anunciante/qr', icon: QrCode },
    ],
  },
  {
    title: 'PLANO E PAGAMENTOS',
    items: [
      { label: 'Meu Plano', href: '/anunciante/plano', icon: CreditCard },
      { label: 'Faturas e Pagamentos', href: '/anunciante/pagamentos', icon: Receipt },
      { label: 'Meu Contrato', href: '/anunciante/contrato', icon: FileCheck2 },
    ],
  },
  {
    title: 'COMUNICAÇÃO',
    items: [{ label: 'Notificações', href: '/anunciante/notificacoes', icon: Bell }],
  },
  {
    title: 'MINHA CONTA',
    items: [{ label: 'Meus Dados', href: '/anunciante/conta', icon: User }],
  },
];

export interface AdvertiserSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  businessName: string;
  businessSlug: string;
  unreadNotificationsCount?: number;
  /** Plano e recursos liberados; sem isso (falha de leitura) o menu mostra só o essencial. */
  features: AdvertiserFeatures | null;
  /** Bloco de marca (logomarca + cor): vem do tenant. */
  brandLogo: string | null;
  brandName: string;
  brandOnDark: boolean;
}

export function AdvertiserSidebar({
  isMobileOpen = false,
  onMobileClose,
  businessName,
  businessSlug,
  unreadNotificationsCount = 0,
  features,
  brandLogo,
  brandName,
  brandOnDark,
}: AdvertiserSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // Gaveta do celular: fecha ao navegar, trava a rolagem do fundo e aceita ESC.
  useEffect(() => {
    if (isMobileOpen) onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
  useEffect(() => {
    if (!isMobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onMobileClose?.();
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKey);
    };
  }, [isMobileOpen, onMobileClose]);

  const isLinkActive = (href: string) => {
    if (href === '/anunciante') return pathname === '/anunciante';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const allowed = (item: NavItem) => !item.requires || Boolean(features?.allows[item.requires]);
  const groups = ADVERTISER_NAV_GROUPS.map((group) => ({ ...group, items: group.items.filter(allowed) })).filter((group) => group.items.length > 0);

  const logout = async () => {
    await createClient().auth.signOut();
    router.replace('/');
    router.refresh();
  };

  const navContent = (
    <div className="flex h-full w-64 flex-col border-r border-[#C9A227]/20 bg-[#1A1612] text-stone-200">
      {/* MARCA DO TENANT (logomarca sobre a cor primária) + EMPRESA */}
      <div className="border-b border-[#C9A227]/20">
        <div
          className="flex items-center justify-between gap-2 px-4 py-3"
          style={brandOnDark || brandLogo ? { background: 'var(--member-primary)' } : undefined}
        >
          <Link href="/anunciante" aria-label={`${brandName} — Portal do Anunciante`} className="flex min-w-0 items-center">
            {brandLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brandLogo} alt={`Logomarca ${brandName}`} className="h-11 w-auto max-w-[11rem] object-contain object-left" />
            ) : (
              <span className="truncate font-serif text-sm font-bold text-[#F9F6F0]">{brandName}</span>
            )}
          </Link>
          {onMobileClose && (
            <button
              type="button"
              onClick={onMobileClose}
              aria-label="Fechar menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-stone-200 hover:bg-white/10 md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="space-y-1 px-4 py-3">
          <span className="block truncate font-serif text-sm font-bold leading-tight text-[#F9F6F0]">{businessName}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-stone-400">Portal do Anunciante</span>
            {features && (
              <span className="rounded-full border border-[#C9A227]/50 bg-[#3B0B14] px-2 py-0.5 font-mono text-[10px] font-bold text-[#C9A227]">
                {features.planName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* AÇÃO RÁPIDA: VER ANÚNCIO NO GUIA */}
      <div className="p-3">
        <Link
          href={`/guia/${businessSlug}`}
          target="_blank"
          onClick={() => onMobileClose?.()}
          className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#C9A227]/40 bg-[#3B0B14]/60 px-3 py-2 text-xs font-bold text-[#C9A227] transition-all hover:bg-[#3B0B14]"
        >
          <Eye className="h-4 w-4 text-[#C9A227]" />
          <span>Ver meu anúncio no Guia</span>
        </Link>
      </div>

      {/* GRUPOS DE NAVEGAÇÃO (só o que o plano inclui) */}
      <nav className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-3 py-2 text-xs" aria-label="Menu do portal">
        {groups.map((group) => (
          <div key={group.title} className="space-y-1">
            <span className="px-3 font-mono text-[10px] font-bold uppercase tracking-wider text-stone-400">{group.title}</span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href);
                const isNotificationsItem = item.href === '/anunciante/notificacoes';
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-10 items-center justify-between rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                      active
                        ? 'border border-[#C9A227]/30 bg-[#3B0B14] font-bold text-[#C9A227]'
                        : 'text-stone-300 hover:bg-stone-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#C9A227]' : 'text-stone-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isNotificationsItem && unreadNotificationsCount > 0 && (
                      <span className="shrink-0 rounded-full bg-[#C9A227] px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#3B0B14]">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* RODAPÉ */}
      <div className="border-t border-[#C9A227]/20 bg-stone-900/50 p-3">
        <button
          type="button"
          onClick={logout}
          className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-400 transition-colors hover:bg-stone-800 hover:text-red-400"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair do Portal</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP */}
      <aside className="sticky top-0 z-30 hidden h-screen shrink-0 md:block">{navContent}</aside>

      {/* CELULAR: gaveta */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" role="dialog" aria-modal="true" aria-label="Menu do portal">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={onMobileClose} />
          <div className="relative z-10 h-[100dvh] w-full max-w-xs">{navContent}</div>
        </div>
      )}
    </>
  );
}
