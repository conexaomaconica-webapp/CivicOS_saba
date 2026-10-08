'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPlatformAdminRole } from '@/lib/auth/admin-roles';
import {
  Search,
  LayoutDashboard,
  CheckSquare,
  Building2,
  Layers,
  CreditCard,
  Landmark,
  ListFilter,
  ImageIcon,
  Sparkles,
  BookOpen,
  Bell,
  ShieldCheck,
  Star,
  Palette,
  Users,
  ShieldAlert,
  ChevronRight,
  Award,
  Scale,
  X,
  CalendarDays,
  ClipboardList,
  KeyRound,
  Handshake,
  AlertTriangle,
} from 'lucide-react';
import { getApprovalDirectoryListAction } from '@/lib/admin/admin-approval-service';

export type SidebarNavItem = {
  id: string;
  label: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  disabled?: boolean;
  subItems?: { label: string; path: string }[];
};

export type NavSection = {
  sectionTitle: string;
  items: SidebarNavItem[];
};

export const adminNavSections: NavSection[] = [
  {
    sectionTitle: '1. VISÃO GERAL',
    items: [
      {
        id: 'dashboard',
        label: 'Dashboard',
        path: '/admin',
        icon: LayoutDashboard,
      },
      {
        id: 'risco',
        label: 'Empresas em risco',
        path: '/admin/risco',
        icon: AlertTriangle,
      },
    ],
  },
  {
    sectionTitle: '2. OPERAÇÃO COMERCIAL',
    items: [
      {
        id: 'aprovacoes',
        label: 'Aprovações (Pré-Publicação)',
        path: '/admin/aprovacoes',
        icon: CheckSquare,
        badge: 'Pendentes',
      },
      {
        id: 'alteracoes',
        label: 'Alterações dos Anunciantes',
        path: '/admin/alteracoes',
        icon: CheckSquare,
      },
      {
        id: 'empresas',
        label: 'Empresas (Pós-Aprovação)',
        path: '/admin/empresas',
        icon: Building2,
        subItems: [
          { label: 'Todas as Empresas', path: '/admin/empresas' },
          { label: 'Nova Empresa', path: '/admin/empresas/nova' },
          { label: 'Convites de Cadastro', path: '/admin/empresas/convites' },
        ],
      },
      {
        id: 'planos',
        label: 'Central de Planos',
        path: '/admin/planos',
        icon: Layers,
      },
      {
        id: 'pagamentos',
        label: 'Pagamentos & Asaas',
        path: '/admin/pagamentos',
        icon: CreditCard,
      },
    ],
  },
  {
    sectionTitle: '3. GUIA MAÇÔNICO',
    items: [
      {
        id: 'lojas',
        label: 'Lojas Maçônicas',
        path: '/admin/lojas',
        icon: Landmark,
        subItems: [
          { label: 'Todas as Lojas', path: '/admin/lojas' },
          { label: 'Nova Loja', path: '/admin/lojas/nova' },
          { label: 'Importar Planilha', path: '/admin/lojas/importar' },
          { label: 'Potências & Ritos', path: '/admin/lojas/potencias' },
        ],
      },
      {
        id: 'categorias',
        label: 'Categorias',
        path: '/admin/guia/categorias',
        icon: ListFilter,
      },
      {
        id: 'banners',
        label: 'Banners',
        path: '/admin/guia/banners',
        icon: ImageIcon,
      },
      {
        id: 'destaques',
        label: 'Empresas em Destaque',
        path: '/admin/guia/destaques',
        icon: Sparkles,
      },
      {
        id: 'guia-geral',
        label: 'Configurações do Guia',
        path: '/admin/guia/geral',
        icon: BookOpen,
      },
      {
        id: 'reconhecimentos',
        label: 'Selos de Reconhecimento',
        path: '/admin/reconhecimentos',
        icon: Award,
      },
    ],
  },
  {
    sectionTitle: '4. COMUNICAÇÃO',
    items: [
      {
        id: 'notificacoes',
        label: 'Notificações Operacionais',
        path: '/admin/notificacoes',
        icon: Bell,
      },
      {
        id: 'eventos',
        label: 'Eventos & RSVP',
        path: '/admin/eventos',
        icon: CalendarDays,
      },
      {
        id: 'pesquisas',
        label: 'Pesquisas & Diagnósticos',
        path: '/admin/pesquisas',
        icon: ClipboardList,
      },
    ],
  },
  {
    sectionTitle: '5. GOVERNANÇA & JURÍDICO',
    items: [
      {
        id: 'juridico',
        label: 'Modelos de Contrato',
        path: '/admin/juridico/contratos',
        icon: Scale,
        subItems: [
          { label: 'Contrato de Anunciante', path: '/admin/juridico/contratos' },
          { label: 'Termos de Uso', path: '/admin/juridico/contratos?tipo=termos' },
          { label: 'Política de Privacidade', path: '/admin/juridico/contratos?tipo=privacidade' },
        ],
      },
      {
        id: 'seo',
        label: 'SEO Center',
        path: '/admin/seo',
        icon: Search,
      },
      {
        id: 'auditoria',
        label: 'Trilha de Auditoria',
        path: '/admin/auditoria',
        icon: ShieldCheck,
      },
      {
        id: 'reviews',
        label: 'Avaliações & Reputação',
        path: '/admin/reviews',
        icon: Star,
      },
      {
        id: 'conexoes',
        label: 'Mural de Conexões',
        path: '/admin/conexoes',
        icon: Handshake,
      },
    ],
  },
  {
    sectionTitle: '6. CONFIGURAÇÕES',
    items: [
      {
        id: 'marca',
        label: 'Marca & Identidade Visual',
        path: '/admin/marca',
        icon: Palette,
      },
      {
        id: 'asaas-integracao',
        label: 'Integração Asaas',
        path: '/admin/configuracoes/integracoes/asaas',
        icon: KeyRound,
      },
      {
        id: 'settings',
        label: 'Usuários & Permissões',
        path: '/admin/settings',
        icon: Users,
      },
    ],
  },
];

type AdminSidebarProps = {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  userRole?: string;
};

export function AdminSidebar({ isMobileOpen = false, onMobileClose, userRole = 'master' }: AdminSidebarProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchPendingApprovals() {
      try {
        const res = await getApprovalDirectoryListAction('todos');
        if (res.success) {
          setPendingCount(res.counts?.total ?? res.items?.length ?? 0);
        }
      } catch (_err) {
        setPendingCount(1);
      }
    }
    fetchPendingApprovals();
  }, []);

  const isLinkActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin';
    return pathname?.startsWith(path);
  };

  const isSuperAdmin = isPlatformAdminRole(userRole);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#3B0B14] text-stone-200 border-r border-[#C9A227]/30">
      {/* Drawer Header Mobile */}
      {onMobileClose && (
        <div className="lg:hidden p-4 border-b border-[#C9A227]/30 flex items-center justify-between">
          <span className="font-serif font-bold text-sm text-[#C9A227]">Menu Operacional Admin</span>
          <button
            type="button"
            onClick={onMobileClose}
            className="p-1.5 rounded-lg bg-stone-900/40 text-stone-300 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Lista de Navegação por 6 Seções Domínio */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-thin scrollbar-thumb-amber-900">
        {adminNavSections.map((section) => (
          <div key={section.sectionTitle} className="space-y-1">
            <h4 className="px-3 text-[10px] font-bold text-[#C9A227] uppercase tracking-widest mb-1.5">
              {section.sectionTitle}
            </h4>

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = isLinkActive(item.path);
                const Icon = item.icon;
                const dynamicBadge = item.id === 'aprovacoes' && pendingCount !== null ? `${pendingCount}` : item.badge;

                return (
                  <div key={item.id} className="space-y-1">
                    <Link
                      href={item.path}
                      onClick={() => onMobileClose && onMobileClose()}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? 'bg-[#C9A227] text-[#3B0B14] font-bold shadow-md'
                          : 'text-stone-300 hover:bg-[#4B161B] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#3B0B14]' : 'text-[#C9A227]'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {dynamicBadge && (
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            active
                              ? 'bg-[#3B0B14] text-[#C9A227]'
                              : 'bg-amber-500/20 text-[#C9A227] border border-[#C9A227]/30'
                          }`}
                        >
                          {dynamicBadge}
                        </span>
                      )}
                    </Link>

                    {/* Sub-itens: em 'empresas' já vem expandido por padrão; nos demais, se ativo */}
                    {(active || item.id === 'empresas') && item.subItems && (
                      <div className="pl-7 pr-1 py-1 space-y-1 border-l border-[#C9A227]/40 ml-4 my-1">
                        {item.subItems.map((sub) => {
                          const subActive = pathname === sub.path;
                          return (
                            <Link
                              key={sub.path}
                              href={sub.path}
                              onClick={() => onMobileClose && onMobileClose()}
                              className={`flex items-center justify-between text-[11px] py-1 px-2 rounded-lg transition-colors ${
                                subActive
                                  ? 'text-[#C9A227] font-bold bg-[#4B161B]'
                                  : 'text-stone-400 hover:text-stone-200'
                              }`}
                            >
                              <span>{sub.label}</span>
                              {subActive && <ChevronRight className="w-3 h-3 text-[#C9A227]" />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ISOLAMENTO DA TORRE DE CONTROLE (SUPERADMIN ONLY) */}
      {isSuperAdmin && (
        <div className="p-3 border-t border-[#C9A227]/30 bg-[#2b060d]">
          <Link
            href="/master"
            onClick={() => onMobileClose && onMobileClose()}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/80 border border-amber-500/40 text-amber-300 transition-all text-xs font-bold shadow-xs cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
              <span>Torre de Controle</span>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-400 text-[#3B0B14] font-extrabold uppercase">
              SuperAdmin
            </span>
          </Link>
        </div>
      )}

      {/* Footer da Sidebar */}
      <div className="px-3 py-2 border-t border-[#C9A227]/20 bg-[#1f0408] text-center">
        <p className="text-[10px] text-amber-200/80 font-medium">Conexão Maçônica v1.0</p>
        <p className="text-[9px] text-stone-500">Operação Comercial & Fraterna</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-16 h-[calc(100vh-64px)] shadow-lg">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={onMobileClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
