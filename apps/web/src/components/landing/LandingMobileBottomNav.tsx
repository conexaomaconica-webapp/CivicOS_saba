'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Handshake,
  Award,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: typeof Sparkles;
  isPrimary?: boolean;
  href?: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'diferenciais', label: 'Diferenciais', icon: Sparkles },
  { id: 'mural', label: 'Mural', icon: Handshake },
  { id: 'planos', label: 'Planos', icon: Award },
  { id: 'anunciar', label: 'Anunciar', icon: ArrowUpRight, isPrimary: true, href: '/anunciar/passo-1' },
];

export function LandingMobileBottomNav() {
  const [activeSection, setActiveSection] = useState<string>('');

  useEffect(() => {
    const sectionIds = NAV_ITEMS.filter((item) => !item.href).map((item) => item.id);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
      setActiveSection(id);
    }
  };

  return (
    <aside
      aria-label="Navegação rápida da página principal"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden print:hidden"
    >
      <nav
        aria-label="Atalhos da página"
        className="relative flex h-16 w-full items-center justify-around border-t border-[#c9a227]/40 bg-[#4b161b] px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          if (item.isPrimary) {
            return (
              <Link
                key={item.id}
                href={item.href || '/anunciar/passo-1'}
                className="flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#C9A227] to-[#e6bd3b] px-3.5 py-1.5 text-xs font-bold text-[#240509] shadow-md transition-all active:scale-95"
                aria-label="Anunciar negócio"
              >
                <span>{item.label}</span>
                <Icon className="h-3.5 w-3.5 stroke-[2.5]" />
              </Link>
            );
          }

          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => handleClick(e, item.id)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 py-1 px-1.5 transition-all duration-200 active:scale-95',
                isActive ? 'text-[#F3CE61]' : 'text-white/75 hover:text-white'
              )}
              aria-label={`Rolar para a seção ${item.label}`}
            >
              <div className="relative">
                <Icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C9A227] animate-in zoom-in" />
                )}
              </div>
              <span className={cn('text-[10px] tracking-tight', isActive ? 'font-bold' : 'font-medium')}>
                {item.label}
              </span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}
