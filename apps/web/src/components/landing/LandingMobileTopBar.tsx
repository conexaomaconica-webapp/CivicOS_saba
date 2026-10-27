'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export function CategoryIcon({ slug, name }: { slug: string; name?: string }) {
  const s = slug.toLowerCase();
  const n = (name || '').toLowerCase();

  if (s.includes('saud') || s.includes('psico') || s.includes('medic') || n.includes('saúd') || n.includes('psic')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        <path d="M12 9v6M9 12h6" />
      </svg>
    );
  }
  if (
    s.includes('otic') ||
    s.includes('ótic') ||
    s.includes('optic') ||
    s.includes('óptic') ||
    s.includes('vis') ||
    n.includes('ótic') ||
    n.includes('otic') ||
    n.includes('óptic') ||
    n.includes('optic')
  ) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <circle cx="6" cy="14" r="4" />
        <circle cx="18" cy="14" r="4" />
        <path d="M10 14h4" />
        <path d="M2.5 12 5 7h14l2.5 5" />
      </svg>
    );
  }
  if (s.includes('seguran') || n.includes('seguran') || s.includes('vigil') || n.includes('vigil') || s.includes('terceiriz') || n.includes('terceiriz')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }
  if (s.includes('alim') || s.includes('gastro') || s.includes('rest') || s.includes('food') || s.includes('bebid') || n.includes('alim') || n.includes('gastro') || n.includes('bebid')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
        <path d="M15 11v11M5 2v20M2 2h6M2 5h6" />
      </svg>
    );
  }
  if (s.includes('tec') || s.includes('comand') || s.includes('soft') || n.includes('tec') || s.includes('infor') || n.includes('infor')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (s.includes('serv') || s.includes('prof') || n.includes('serv')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <rect width="20" height="14" x="2" y="7" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  }
  if (s.includes('const') || s.includes('refor') || s.includes('eng') || n.includes('const')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
        <path d="M17.64 15 22 10.64M20.91 3.26l-6.36 6.36" />
      </svg>
    );
  }
  if (s.includes('dir') || s.includes('advoc') || s.includes('jur') || n.includes('dir') || n.includes('advoc')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM2 16l3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1ZM7 21h10M12 3v18M3 7h18" />
      </svg>
    );
  }
  if (s.includes('auto') || s.includes('veic') || s.includes('car') || n.includes('auto')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
        <circle cx="7" cy="17" r="2" />
        <circle cx="17" cy="17" r="2" />
      </svg>
    );
  }
  if (s.includes('educ') || s.includes('curs') || s.includes('escola') || n.includes('educ')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
        <path d="M22 10v6M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
      </svg>
    );
  }
  if (s.includes('comerc') || s.includes('loja') || s.includes('varej') || n.includes('comerc') || n.includes('loja')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3 6h18" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    );
  }
  if (s.includes('marmor') || s.includes('pedra') || n.includes('marmor') || n.includes('pedra')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
        <path d="M6 3h12l4 6-10 12L2 9z" />
        <path d="M2 9h20" />
        <path d="M10 21 6 9" />
        <path d="M14 21l4-12" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5">
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
    </svg>
  );
}

// Categorias organizadas: Primeiro as com empresas ativas no catálogo, seguidas das demais
export const APP_CATEGORIES = [
  { slug: 'alimentos-e-bebidas', name: 'Alimentos e Bebidas', isCatalog: true },
  { slug: 'optica-84b81899', name: 'Óptica', isCatalog: true },
  { slug: 'psicologo-ca21ef78', name: 'Psicólogo', isCatalog: true },
  { slug: 'seguranca-e-terceirizacao-31aec1e6', name: 'Segurança', isCatalog: true },
  { slug: 'marmoraria-ae8e8e4e', name: 'Marmoraria', isCatalog: true },
  { slug: 'saude', name: 'Saúde' },
  { slug: 'tecnologia', name: 'Tecnologia' },
  { slug: 'servicos', name: 'Serviços' },
  { slug: 'construcao-imoveis', name: 'Construção' },
  { slug: 'juridico', name: 'Direito' },
  { slug: 'automotivo', name: 'Automotivo' },
  { slug: 'comercio-varejo', name: 'Comércio' },
];

export function LandingMobileTopBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/guia?q=${encodeURIComponent(query.trim())}`);
    } else {
      router.push('/guia');
    }
  };

  return (
    <div className="flex flex-col gap-2.5 px-3 pt-2 pb-2.5 bg-[#4b161b] text-white border-b border-[#c9a227]/40 shadow-md">
      {/* 1. Linha da Logo e Ações */}
      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="inline-flex items-center" aria-label="Conexão Maçônica — início">
          <Image
            src="/logoconexao_red_vert.png"
            alt="Conexão Maçônica"
            width={971}
            height={208}
            priority
            className="h-9 w-auto brightness-110"
          />
        </Link>
        <div className="flex items-center gap-1.5">
          <Link
            href="/anunciar/passo-1"
            className="rounded-lg border border-[#c9a227]/50 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-[#f3eedd] transition active:scale-95"
          >
            ANUNCIAR
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-[#c9a227] px-3 py-1 text-[11px] font-extrabold text-[#2a0a10] shadow-sm transition hover:bg-[#e0b92f] active:scale-95"
          >
            ENTRAR
          </Link>
        </div>
      </div>

      {/* 2. Campo de Buscar (logo após a logo) */}
      <form onSubmit={handleSearch} className="relative flex items-center w-full">
        <div className="pointer-events-none absolute left-3 flex items-center text-stone-400">
          <Search className="h-4 w-4 text-[#8a6d12]" />
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar empresas ou serviços..."
          className="h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-20 text-xs font-medium text-stone-900 placeholder:text-stone-400 shadow-inner focus:border-[#c9a227] focus:outline-none focus:ring-2 focus:ring-[#c9a227]/30"
          aria-label="Buscar empresas ou serviços"
        />
        <button
          type="submit"
          className="absolute right-1.5 rounded-lg bg-[#5d1523] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition hover:bg-[#4b161b] active:scale-95"
        >
          Buscar
        </button>
      </form>

      {/* 3. Ícones de Categorias (Presentes no catálogo preferencialmente e depois outras) */}
      <div
        className="w-full -mx-3 px-3 overflow-x-auto scrollbar-none py-1 flex gap-2.5 scroll-smooth"
        role="region"
        aria-label="Categorias em destaque"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {APP_CATEGORIES.map((cat) => (
          <Link
            key={cat.slug}
            href={`/guia?cat=${cat.slug}`}
            className="flex flex-col items-center gap-1 shrink-0 w-[60px] group transition active:scale-95"
            title={cat.name}
          >
            <div
              className={`relative flex h-11 w-11 items-center justify-center rounded-xl bg-[#fffdfa] border shadow-xs transition-all duration-200 group-hover:scale-105 group-hover:bg-[#c9a227] group-hover:text-[#2b060d] ${
                cat.isCatalog
                  ? 'border-[#c9a227]/70 text-[#4b161b] ring-1 ring-[#c9a227]/30'
                  : 'border-[#e2d1bd] text-[#5d1523]'
              }`}
            >
              <CategoryIcon slug={cat.slug} name={cat.name} />
              {cat.isCatalog && (
                <span
                  className="absolute -top-1 -right-1 flex h-2.5 w-2.5"
                  title="Presente no catálogo"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#c9a227] opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#c9a227]"></span>
                </span>
              )}
            </div>
            <span
              className={`block w-full text-center text-[10px] leading-tight truncate font-semibold transition ${
                cat.isCatalog ? 'text-[#f3eedd] font-bold' : 'text-[#f3eedd]/80'
              }`}
            >
              {cat.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
