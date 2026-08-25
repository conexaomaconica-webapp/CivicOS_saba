'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  User,
  X,
  LogOut,
} from 'lucide-react';

interface NavigationGroup {
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: React.ElementType;
    isExternal?: boolean;
  }>;
}

const ADVERTISER_NAV_GROUPS: NavigationGroup[] = [
  {
    title: 'INÍCIO',
    items: [
      { label: 'Visão Geral', href: '/anunciante', icon: LayoutDashboard },
    ],
  },
  {
    title: 'MINHA EMPRESA',
    items: [
      { label: 'Perfil da Empresa', href: '/anunciante/empresa', icon: Building2 },
      { label: 'Fotos e Mídias', href: '/anunciante/empresa/midias', icon: Image },
      { label: 'Ver meu anúncio', href: '/guia', icon: Eye, isExternal: true },
    ],
  },
  {
    title: 'CONTEÚDO',
    items: [
      { label: 'Serviços', href: '/anunciante/conteudo/servicos', icon: Briefcase },
      { label: 'Benefícios e Ofertas', href: '/anunciante/conteudo/beneficios', icon: Award },
      { label: 'Eventos', href: '/anunciante/conteudo/eventos', icon: Calendar },
      { label: 'Publicações', href: '/anunciante/conteudo/posts', icon: FileText },
    ],
  },
  {
    title: 'RESULTADOS',
    items: [
      { label: 'Desempenho do meu anúncio', href: '/anunciante/resultados', icon: TrendingUp },
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
    items: [
      { label: 'Notificações', href: '/anunciante/notificacoes', icon: Bell },
    ],
  },
  {
    title: 'MINHA CONTA',
    items: [
      { label: 'Meus Dados', href: '/anunciante/conta', icon: User },
    ],
  },
];

interface AdvertiserSidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  businessName?: string;
  businessSlug?: string;
  unreadNotificationsCount?: number;
}

export function AdvertiserSidebar({
  isMobileOpen = false,
  onMobileClose,
  businessName = 'Minha Empresa',
  businessSlug = 'comandos-terceirizacao-e-seguranca-eletronica',
  unreadNotificationsCount = 2,
}: AdvertiserSidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (href: string) => {
    if (href === '/anunciante') return pathname === '/anunciante';
    return pathname.startsWith(href);
  };

  const navContent = (
    <div className="flex flex-col h-full bg-[#1A1612] text-stone-200 border-r border-[#C9A227]/20 w-64">
      {/* HEADER DA SIDEBAR DO ANUNCIANTE */}
      <div className="p-4 border-b border-[#C9A227]/20 flex items-center justify-between">
        <Link href="/anunciante" onClick={() => onMobileClose?.()} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#3B0B14] border border-[#C9A227]/40 flex items-center justify-center font-serif font-bold text-[#C9A227]">
            CM
          </div>
          <div>
            <span className="font-serif font-bold text-sm text-[#F9F6F0] block leading-tight truncate max-w-[140px]">
              {businessName}
            </span>
            <span className="text-[10px] font-mono text-stone-400 block">
              Portal do Anunciante
            </span>
          </div>
        </Link>

        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden text-stone-400 hover:text-white p-1 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* ITEM DE AÇÃO RÁPIDA: VER ANÚNCIO NO GUIA */}
      <div className="p-3">
        <Link
          href={`/guia/${businessSlug}`}
          target="_blank"
          onClick={() => onMobileClose?.()}
          className="w-full px-3 py-2 bg-[#3B0B14]/60 hover:bg-[#3B0B14] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 transition-all flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4 text-[#C9A227]" />
          <span>Ver meu anúncio no Guia</span>
        </Link>
      </div>

      {/* GRUPOS DE NAVEGAÇÃO */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4 custom-scrollbar text-xs">
        {ADVERTISER_NAV_GROUPS.map((group) => (
          <div key={group.title} className="space-y-1">
            <span className="px-3 text-[10px] font-mono font-bold tracking-wider text-stone-400 uppercase">
              {group.title}
            </span>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isLinkActive(item.href);
                const targetHref = item.isExternal ? `/guia/${businessSlug}` : item.href;
                const isNotificationsItem = item.href === '/anunciante/notificacoes';

                return (
                  <Link
                    key={item.label}
                    href={targetHref}
                    target={item.isExternal ? '_blank' : undefined}
                    onClick={() => onMobileClose?.()}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl transition-colors font-medium text-xs ${
                      active
                        ? 'bg-[#3B0B14] text-[#C9A227] font-bold border border-[#C9A227]/30'
                        : 'text-stone-300 hover:bg-stone-800/60 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#C9A227]' : 'text-stone-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {isNotificationsItem && unreadNotificationsCount > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-[#C9A227] text-[#3B0B14] rounded-full shrink-0">
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

      {/* FOOTER DA SIDEBAR */}
      <div className="p-3 border-t border-[#C9A227]/20 bg-stone-900/50">
        <Link
          href="/api/auth/logout"
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-stone-400 hover:text-red-400 rounded-xl hover:bg-stone-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair do Portal</span>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:block h-screen sticky top-0 shrink-0 z-30">
        {navContent}
      </aside>

      {/* MOBILE OVERLAY */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onMobileClose}
          />
          <div className="relative flex-1 max-w-xs w-full z-10">
            {navContent}
          </div>
        </div>
      )}
    </>
  );
}
