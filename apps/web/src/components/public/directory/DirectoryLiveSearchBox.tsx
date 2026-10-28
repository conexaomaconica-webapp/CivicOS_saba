'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Loader2, ChevronRight, Building2, Sparkles, FolderOpen, Users } from 'lucide-react';
import { normalizeSearchTerm, resolveSearchQuery } from '@/lib/directory/normalize-search';
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
  responsible_name?: string | null;
  responsible_label?: string | null;
  reference_mason_name?: string | null;
};

const DEFAULT_SEARCH_CATEGORIES = [
  { label: 'Alimentos e Bebidas', slug: 'alimentos-e-bebidas' },
  { label: 'Óptica', slug: 'optica-84b81899' },
  { label: 'Psicólogo', slug: 'psicologo-ca21ef78' },
  { label: 'Segurança e terceirização', slug: 'seguranca-e-terceirizacao-31aec1e6' },
  { label: 'Marmoraria', slug: 'marmoraria-ae8e8e4e' },
  { label: 'Saúde', slug: 'saude' },
  { label: 'Tecnologia', slug: 'tecnologia' },
  { label: 'Serviços', slug: 'servicos' },
  { label: 'Construção', slug: 'construcao-imoveis' },
  { label: 'Direito', slug: 'juridico' },
  { label: 'Automotivo', slug: 'automotivo' },
  { label: 'Comércio', slug: 'comercio-varejo' },
];

type DirectoryLiveSearchBoxProps = {
  initialQuery?: string;
  placeholder?: string;
  selectedCity?: string | null;
  availableCities?: string[];
  categories?: Array<{ id?: string; slug: string; name: string }>;
  actionUrl?: string;
  className?: string;
  buttonLabel?: string;
  iconType?: 'sparkles' | 'search';
  variant?: 'hero' | 'header';
};

export function DirectoryLiveSearchBox({
  initialQuery = '',
  placeholder = 'Digite o nome da empresa, serviço ou especialidade...',
  selectedCity,
  availableCities = [],
  categories = [],
  actionUrl = '/guia/empresas',
  className = '',
  buttonLabel = 'Buscar',
  iconType = 'search',
  variant = 'hero',
}: DirectoryLiveSearchBoxProps) {
  const router = useRouter();
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Sincroniza quando initialQuery muda externamente
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  // Identifica correspondência direta com categoria ou cidade conhecida
  const categoryPool = (categories && categories.length > 0)
    ? categories.map((c) => ({ label: c.name, slug: c.slug }))
    : DEFAULT_SEARCH_CATEGORIES;

  const normalizedQ = normalizeSearchTerm(query).toLowerCase();
  const matchedCategory = normalizedQ.length >= 2
    ? categoryPool.find((cat) => {
        const normLabel = normalizeSearchTerm(cat.label).toLowerCase();
        const normSlug = cat.slug.toLowerCase();
        return normLabel.includes(normalizedQ) || normSlug.includes(normalizedQ) || normalizedQ.includes(normLabel);
      })
    : null;

  const matchedCityName = (normalizedQ.length >= 2 && availableCities.length > 0)
    ? availableCities.find((c) => {
        const normCity = normalizeSearchTerm(c).toLowerCase();
        return normCity.includes(normalizedQ) || normalizedQ.includes(normCity);
      })
    : null;

  // Busca instantânea com resolução de sinônimos/apelidos (ex: "ótica" -> "optica")
  useEffect(() => {
    const raw = normalizeSearchTerm(query);
    if (!raw || raw.length < 2) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setIsOpen(true);

    const resolved = resolveSearchQuery(query);

    const timer = setTimeout(async () => {
      try {
        let items: SearchResultItem[] = [];

        // 1. Consulta o endpoint inteligente que busca por nome, categoria, descrição E maçom/cunhada/sobrinho
        try {
          const params = new URLSearchParams();
          params.set('q', query);
          if (selectedCity) params.set('city', selectedCity);
          params.set('limit', '6');

          const apiRes = await fetch(`/api/directory/live-search?${params.toString()}`);
          if (apiRes.ok) {
            const apiData = await apiRes.json();
            if (Array.isArray(apiData?.items)) {
              items = apiData.items;
            }
          }
        } catch {
          // Fallback para RPC direta se a API falhar
        }

        // 2. Se a API não retornou itens, tenta a busca direta via RPC no Supabase client
        if (items.length === 0) {
          const supabase = createClient();
          const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';

          const { data, error } = await (supabase as any).rpc('public_businesses_search', {
            p_host: host,
            p_query: resolved,
            p_city: selectedCity || null,
            p_page: 1,
            p_page_size: 6,
          });

          if (!error && data?.items) {
            items = data.items as SearchResultItem[];
          }

          // 3. Se a busca textual não retornou resultados e bate com uma categoria conhecida, tenta por slug
          if (items.length === 0 && matchedCategory) {
            const { data: catData } = await (supabase as any).rpc('public_businesses_search', {
              p_host: host,
              p_category_slug: matchedCategory.slug,
              p_city: selectedCity || null,
              p_page: 1,
              p_page_size: 6,
            });
            if (catData?.items && catData.items.length > 0) {
              items = catData.items as SearchResultItem[];
            }
          }

          // 4. Se a busca textual não retornou resultados, verifica se bate com uma cidade
          if (items.length === 0 && !selectedCity) {
            const cityToSearch = matchedCityName || resolved;
            const { data: cityData } = await (supabase as any).rpc('public_businesses_search', {
              p_host: host,
              p_query: null,
              p_city: cityToSearch,
              p_page: 1,
              p_page_size: 6,
            });
            if (cityData?.items && cityData.items.length > 0) {
              items = cityData.items as SearchResultItem[];
            }
          }
        }

        setResults(items);
      } catch (err) {
        console.error('Error fetching live search results:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, selectedCity, matchedCityName]);

  // Fecha o dropdown ao clicar ou tocar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handleSelectBusiness = (slug: string) => {
    setIsOpen(false);
    router.push(`/guia/${slug}?src=text_search`);
  };

  const handleSelectCategory = (catSlug: string) => {
    setIsOpen(false);
    const params = new URLSearchParams();
    params.set('cat', catSlug);
    if (selectedCity) {
      params.set('city', selectedCity);
    }
    router.push(`${actionUrl}?${params.toString()}`);
  };

  const handleSelectCity = (city: string) => {
    setIsOpen(false);
    const params = new URLSearchParams();
    params.set('city', city);
    router.push(`${actionUrl}?${params.toString()}`);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsOpen(false);
    const trimmed = query.trim();
    if (!trimmed) {
      router.push(actionUrl);
      return;
    }
    const params = new URLSearchParams();
    params.set('q', trimmed);
    if (selectedCity) {
      params.set('city', selectedCity);
    }
    router.push(`${actionUrl}?${params.toString()}`);
  };

  const LeadingIcon = iconType === 'sparkles' ? Sparkles : Search;

  const isHeaderVariant = variant === 'header';

  return (
    <div
      ref={searchContainerRef}
      className={`relative ${isHeaderVariant ? 'w-full z-40' : 'max-w-[780px] mx-auto z-40'} ${className}`}
    >
      {isHeaderVariant ? (
        /* Formato Header Mobile (Sleek, alinhado ao app) */
        <form
          onSubmit={handleSubmit}
          className="flex items-center gap-2 rounded-xl bg-white p-1 pl-3 shadow-sm border border-[#c9a227]/40 focus-within:border-[#c9a227] focus-within:ring-2 focus-within:ring-[#c9a227]/30 transition-all"
        >
          <Search className="h-4 w-4 shrink-0 text-[#8a6d12]" />

          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true);
            }}
            placeholder={placeholder}
            aria-label={placeholder}
            className="w-full bg-transparent text-xs text-stone-800 placeholder-stone-500 focus:outline-none py-1"
            autoComplete="off"
          />

          {isLoading && (
            <Loader2 className="w-4 h-4 text-[#8a6d12] mr-1 animate-spin shrink-0" />
          )}

          <button
            type="submit"
            className="rounded-lg bg-[#c9a227] px-3 py-1.5 text-xs font-bold text-[#2a0a10] shadow-sm transition hover:bg-[#e0b92f] active:scale-95 shrink-0"
          >
            {buttonLabel}
          </button>
        </form>
      ) : (
        /* Formato Hero Desktop / Clássico */
        <form onSubmit={handleSubmit} className="dh-search-box">
          <LeadingIcon className="w-5 h-5 text-amber-500 ml-3 shrink-0" />

          <input
            type="text"
            name="q"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (query.trim().length >= 2) setIsOpen(true);
            }}
            placeholder={placeholder}
            className="dh-search-box__input text-gray-900"
            autoComplete="off"
          />

          {isLoading && (
            <Loader2 className="w-5 h-5 text-amber-500 mr-3 animate-spin shrink-0" />
          )}

          {selectedCity && (
            <div className="dh-search-box__pill mr-2 hidden sm:flex">
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>{selectedCity}</span>
            </div>
          )}

          <button type="submit" className="dh-search-box__btn">
            <Search className="w-4 h-4" />
            <span>{buttonLabel}</span>
          </button>
        </form>
      )}

      {/* Autocomplete Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-amber-900/15 shadow-2xl overflow-hidden z-[60] text-left max-h-[72vh] flex flex-col">
          {isLoading && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-gray-500 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-900" />
              <span>Buscando empresas...</span>
            </div>
          ) : results.length > 0 || matchedCategory || matchedCityName ? (
            <div className="overflow-y-auto divide-y divide-gray-100">
              {/* Sugestão de Categoria quando o usuário pesquisa por categoria */}
              {matchedCategory && (
                <button
                  key="matched-cat"
                  type="button"
                  onClick={() => handleSelectCategory(matchedCategory.slug)}
                  className="w-full px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100/80 transition-colors flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-200/70 flex items-center justify-center text-amber-900 shrink-0">
                      <FolderOpen className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-950">
                        Categoria: {matchedCategory.label}
                      </span>
                      <p className="text-[10px] text-amber-800">Ver todas as empresas nesta categoria</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              )}

              {/* Sugestão de Cidade quando o usuário pesquisa por localidade */}
              {matchedCityName && selectedCity !== matchedCityName && (
                <button
                  key="matched-city"
                  type="button"
                  onClick={() => handleSelectCity(matchedCityName)}
                  className="w-full px-3.5 py-2.5 bg-amber-50/60 hover:bg-amber-100/80 transition-colors flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-200/70 flex items-center justify-center text-amber-900 shrink-0">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-950">
                        Cidade: {matchedCityName}
                      </span>
                      <p className="text-[10px] text-amber-800">Filtrar empresas nesta localidade</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition-transform shrink-0" />
                </button>
              )}

              {/* Cabeçalho de Resultados de Empresas */}
              {results.length > 0 && (
                <div className="px-4 py-2 bg-amber-50/50 text-[11px] font-bold text-amber-900 uppercase tracking-wider flex items-center justify-between">
                  <span>Empresas Encontradas ({results.length})</span>
                  <span className="text-[10px] text-gray-400 font-normal">Resultado instantâneo</span>
                </div>
              )}

              {/* Lista de Empresas */}
              {results.map((biz) => (
                <button
                  key={biz.id}
                  type="button"
                  onClick={() => handleSelectBusiness(biz.slug)}
                  className="w-full p-3 flex items-center justify-between hover:bg-amber-50/80 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden text-xs p-1 ${biz.logo_url ? 'bg-white border-stone-200' : 'bg-amber-950 text-amber-400 font-bold border-amber-900'}`}>
                      {biz.logo_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={biz.logo_url} alt={biz.name} className="max-w-full max-h-full object-contain object-center" />
                      ) : (
                        biz.name.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-gray-900 text-sm group-hover:text-amber-900 transition-colors truncate">
                          {biz.name}
                        </h4>
                        {biz.is_verified && (
                          <span className="text-[10px] bg-green-100 text-green-800 font-semibold px-1.5 py-0.2 rounded shrink-0">
                            Verificada
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 truncate">
                        {biz.category_name && (
                          <span className="font-semibold text-amber-900 shrink-0">
                            {biz.category_name}
                          </span>
                        )}
                        {biz.city && (
                          <span className="truncate">
                            · {biz.city}{biz.state ? `, ${biz.state}` : ''}
                          </span>
                        )}
                      </p>

                      {(biz.responsible_name || biz.reference_mason_name) && (
                        <div className="flex items-center gap-1 text-[11px] font-medium text-amber-900 bg-amber-100/70 border border-amber-200/60 px-1.5 py-0.5 rounded-md mt-1 w-fit max-w-full">
                          <Users className="w-3 h-3 text-amber-700 shrink-0" />
                          <span className="truncate">
                            {biz.responsible_name ? (
                              <>
                                {biz.responsible_label ? `${biz.responsible_label}: ` : ''}
                                {biz.responsible_name}
                                {biz.reference_mason_name && biz.reference_mason_name !== biz.responsible_name
                                  ? ` (Ref: Ir. ${biz.reference_mason_name})`
                                  : ''}
                              </>
                            ) : (
                              <>Ref: Ir. {biz.reference_mason_name}</>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-amber-900 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                </button>
              ))}

              {/* Botão de Rodapé para Ver Tudo */}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full p-3 text-center text-xs font-bold text-amber-900 bg-amber-50/70 hover:bg-amber-100 transition-colors flex items-center justify-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Ver todos os resultados no Guia Comercial →</span>
              </button>
            </div>
          ) : query.trim().length >= 2 ? (
            <div className="p-6 text-center text-xs text-gray-500">
              <Building2 className="w-8 h-8 text-amber-900/30 mx-auto mb-2" />
              <p className="font-semibold text-gray-800">Nenhuma empresa encontrada</p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Não encontramos resultados diretos para &quot;{query}&quot;. Pressione &quot;Buscar&quot; para pesquisar em todo o catálogo.
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
