'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Visão Geral',
    items: [
      { label: 'Dashboard Geral', href: '/design-lab', icon: '📊' },
      { label: 'Matriz Validação UX', href: '/design-lab/ux-validation', icon: '✅', badge: 'Checklist' }
    ]
  },
  {
    title: 'Design System & Fundação',
    items: [
      { label: 'Componentes UI', href: '/design-lab/components', icon: '🧩' },
      { label: 'Tipografia & Fontes', href: '/design-lab/typography', icon: '🔤' },
      { label: 'Espaçamento & Grid', href: '/design-lab/spacing', icon: '📐' },
      { label: 'Iconografia Lucide', href: '/design-lab/icons', icon: '🎨' },
      { label: 'Animações & Transitions', href: '/design-lab/animations', icon: '⚡' },
      { label: 'Estados Auxiliares', href: '/design-lab/states', icon: '🚦', badge: 'AUX-001..006' }
    ]
  },
  {
    title: 'Governança & Mídias',
    items: [
      { label: 'White Label & Temas', href: '/design-lab/themes', icon: '🎭', badge: 'Multi-Brand' },
      { label: 'Theme Editor (ADM-021)', href: '/design-lab/theme-editor', icon: '🎛️' },
      { label: 'Mobile Simulator Lab', href: '/design-lab/mobile', icon: '📱' },
      { label: 'Acessibilidade WCAG', href: '/design-lab/accessibility', icon: '♿' }
    ]
  },
  {
    title: 'Telas Piloto (Mocks)',
    items: [
      { label: 'Piloto 1: Guia Público', href: '/design-lab/pilots/public', icon: '🏛️', badge: 'PUB' },
      { label: 'Piloto 2: Anunciante', href: '/design-lab/pilots/advertiser', icon: '💼', badge: 'ADV' },
      { label: 'Piloto 3: Moderação ADM', href: '/design-lab/pilots/admin', icon: '🛡️', badge: 'ADM' }
    ]
  }
];

export function DesignLabSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-[calc(100vh-3.5rem-2rem)]">
      <div className="p-4 border-b border-slate-800/60">
        <div className="text-xs font-mono text-slate-400 uppercase tracking-wider">
          Navegação de Laboratório
        </div>
        <div className="text-[11px] text-slate-500 mt-1">
          14 Rotas Auditadas & Isoladas
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-6">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">{item.icon}</span>
                    <span>{item.label}</span>
                  </span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer Info */}
      <div className="p-3 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between items-center bg-slate-950/40">
        <span>Framework v1.0</span>
        <span className="text-emerald-400">● Isolated</span>
      </div>
    </aside>
  );
}
