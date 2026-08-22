'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, ShieldCheck, UserCheck, Loader2, ChevronRight, Building2 } from 'lucide-react';
import { normalizeSearchTerm } from '@/lib/directory/normalize-search';
import { createClient } from '@/lib/supabase/client';

export type SearchResultItem = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  category_name?: string | null;
  city?: string | null;
  state?: string | null;
  is_verified?: boolean;
  is_founder?: boolean;
};

type DirectoryHeroProps = {
  title?: string;
  subtitle?: string;
  searchPlaceholder?: string;
  selectedCity?: string | null;
  initialQuery?: string;
};

export function DirectoryHero({
  title = 'Encontre empresas, serviços e conexões de confiança',
  subtitle = 'Descubra oportunidades dentro de uma rede que valoriza relacionamento, credibilidade e propósito.',
  searchPlaceholder = 'Digite o nome da empresa ou serviço...',
  selectedCity,
  initialQuery = '',
}: DirectoryHeroProps) {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Live autocomplete search as user types
  useEffect(() => {
    const normalized = normalizeSearchTerm(query);
    if (!normalized || normalized.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
        
        const { data, error } = await (supabase as any).rpc('public_businesses_search', {
          p_host: host,
          p_query: normalized,
          p_city: selectedCity || null,
          p_page: 1,
          p_page_size: 6,
        });

        if (!error && data?.items) {
          setResults(data.items as SearchResultItem[]);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error('Error fetching live search results:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, selectedCity]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBusiness = (slug: string) => {
    setIsOpen(false);
    router.push(`/guia/${slug}`);
  };

  return (
    <section className="dh-hero">
      {/* Floating & Pulsing Golden Circles */}
      <div className="dh-gold-orb dh-gold-orb--1" aria-hidden="true" />
      <div className="dh-gold-orb dh-gold-orb--2" aria-hidden="true" />
      <div className="dh-gold-orb dh-gold-orb--3" aria-hidden="true" />

      <div className="dh-container relative z-10">
        <h1 className="dh-hero__title">{title}</h1>
        <p className="dh-hero__subtitle">{subtitle}</p>

        {/* Live Search Input Bar & Dropdown */}
        <div ref={searchContainerRef} className="relative max-w-[780px] mx-auto">
          <div className="dh-search-box">
            <Search className="w-5 h-5 text-amber-500 ml-3 shrink-0" />
            
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => {
                if (query.trim().length >= 2) setIsOpen(true);
              }}
              placeholder={searchPlaceholder}
              className="dh-search-box__input"
            />

            {isLoading && (
              <Loader2 className="w-5 h-5 text-amber-500 mr-3 animate-spin shrink-0" />
            )}

            {selectedCity && (
              <div className="dh-search-box__pill mr-2">
                <MapPin className="w-3.5 h-3.5 text-amber-700" />
                <span>{selectedCity}</span>
              </div>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-amber-900/15 shadow-2xl overflow-hidden z-50 text-left">
              {isLoading && results.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-900" />
                  <span>Buscando empresas...</span>
                </div>
              ) : results.length > 0 ? (
                <div className="divide-y divide-gray-100 max-h-[360px] overflow-y-auto">
                  <div className="px-4 py-2 bg-amber-50/50 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Empresas Encontradas
                  </div>

                  {results.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => handleSelectBusiness(biz.slug)}
                      className="w-full p-3.5 flex items-center justify-between hover:bg-amber-50/80 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border bg-amber-950 text-amber-400 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                          {biz.logo_url ? (
                            <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" />
                          ) : (
                            biz.name.slice(0, 2).toUpperCase()
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-900 text-sm group-hover:text-amber-900 transition-colors">
                              {biz.name}
                            </h4>
                            {biz.is_verified && (
                              <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-1.5 py-0.5 rounded">
                                Verificada
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                            {biz.category_name && <span className="font-semibold text-amber-900">{biz.category_name}</span>}
                            {biz.city && <span>· {biz.city}, {biz.state}</span>}
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-900 group-hover:translate-x-0.5 transition-all" />
                    </button>
                  ))}
                </div>
              ) : query.trim().length >= 2 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  <Building2 className="w-8 h-8 text-amber-900/30 mx-auto mb-2" />
                  <p className="font-semibold text-gray-800">Nenhuma empresa encontrada</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Não encontramos resultados para &quot;{query}&quot;.
                  </p>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Badges de Confiança do Hero */}
        <div className="dh-hero__tags">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-400" /> Empresas verificadas
          </span>
          <span className="flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-amber-400" /> Resultados instantâneos
          </span>
        </div>
      </div>
    </section>
  );
}
