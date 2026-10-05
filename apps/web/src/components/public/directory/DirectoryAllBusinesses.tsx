'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Search,
  Grid,
  List,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RotateCcw,
} from 'lucide-react';
import { normalizeSearchTerm } from '@/lib/directory/normalize-search';
import { BusinessCard } from './BusinessCard';

export type PublicSearchResultItem = {
  id: string;
  slug: string;
  name: string;
  short_description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  category_slug?: string | null;
  category_name?: string | null;
  city?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  /** Endereço completo da sede (rua, número, bairro, cidade - UF, CEP), usado para posicionar o mapa. */
  address_line?: string | null;
  is_verified?: boolean;
  is_founder?: boolean;
  effective_plan_code?: string | null;
  rating_average?: number | null;
  reviews_count?: number;
  has_benefits?: boolean;
};

type DirectoryAllBusinessesProps = {
  items: PublicSearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  availableCities?: string[];
  categories?: { slug: string; name: string }[];
  searchQuery: string;
  selectedCity: string;
  selectedCategory: string;
  verifiedOnly: boolean;
  hasBenefitsOnly: boolean;
  sortBy: string;
};

function getPaginationRange(current: number, total: number): (number | string)[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const range: (number | string)[] = [1];

  if (left > 2) {
    range.push('...');
  }

  for (let i = left; i <= right; i++) {
    range.push(i);
  }

  if (right < total - 1) {
    range.push('...');
  }

  range.push(total);
  return range;
}

export function DirectoryAllBusinesses({
  items,
  total,
  page,
  pageSize,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  availableCities = [],
  categories = [],
  searchQuery,
  selectedCity,
  selectedCategory,
  verifiedOnly,
  hasBenefitsOnly,
  sortBy,
}: DirectoryAllBusinessesProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [localQuery, setLocalQuery] = useState(searchQuery);

  const updateFilters = (newParams: Record<string, string | boolean | number | null | undefined>) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');

    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '' || val === false) {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    const queryString = params.toString();
    const targetUrl = queryString ? `${pathname}?${queryString}#todas` : `${pathname}#todas`;
    router.push(targetUrl, { scroll: false });

    if (typeof window !== 'undefined') {
      const el = document.getElementById('todas');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizeSearchTerm(localQuery);
    updateFilters({ q: normalized, page: 1 });
  };

  const handleClearFilters = () => {
    setLocalQuery('');
    router.push(pathname);
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(selectedCity) ||
    Boolean(selectedCategory) ||
    verifiedOnly ||
    hasBenefitsOnly ||
    (Boolean(sortBy) && sortBy !== 'relevance');

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const paginationRange = getPaginationRange(page, totalPages);

  return (
    <section className="dh-container py-4" id="todas">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="dh-section-title">Todas as Empresas</h2>
          <p className="text-xs text-stone-600 mt-1">
            {total === 0 ? (
              'Nenhuma empresa encontrada com os filtros selecionados.'
            ) : totalPages > 1 ? (
              <>
                Mostrando <strong className="text-amber-950 font-bold">{startItem}–{endItem}</strong> de{' '}
                <strong className="text-amber-950 font-bold">{total}</strong> empresas cadastradas na Plataforma.
              </>
            ) : (
              <>
                Exibindo <strong className="text-amber-950 font-bold">{total}</strong>{' '}
                {total === 1 ? 'empresa cadastrada' : 'empresas cadastradas'} na Plataforma.
              </>
            )}
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md border text-xs font-semibold flex items-center gap-1 ${viewMode === 'grid' ? 'bg-amber-950 text-white border-amber-950' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            <Grid className="w-4 h-4" /> Grid
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md border text-xs font-semibold flex items-center gap-1 ${viewMode === 'list' ? 'bg-amber-950 text-white border-amber-950' : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
          >
            <List className="w-4 h-4" /> Lista
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="dh-filter-bar">
        <form onSubmit={handleSearchSubmit} className="flex min-w-0 flex-1 basis-full items-center gap-2 sm:min-w-[240px] sm:basis-auto">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Buscar por nome ou serviço..."
            className="dh-filter-input w-full"
          />
        </form>

        <div className="dh-filter-group">
          {/* Cidade */}
          <select
            value={selectedCity}
            onChange={(e) => updateFilters({ city: e.target.value, page: 1 })}
            className="dh-filter-select"
          >
            <option value="">Todas as Cidades</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Categoria */}
          <select
            value={selectedCategory}
            onChange={(e) => updateFilters({ cat: e.target.value, page: 1 })}
            className="dh-filter-select"
          >
            <option value="">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>

          {/* Ordenação */}
          <select
            value={sortBy}
            onChange={(e) => updateFilters({ sort: e.target.value, page: 1 })}
            className="dh-filter-select"
          >
            <option value="relevance">Relevância (Prioridade)</option>
            <option value="recent">Mais Recentes</option>
            <option value="name">Nome (A-Z)</option>
            <option value="featured">Destaques Primeiro</option>
          </select>

          {/* Checkboxes */}
          <label className="dh-filter-checkbox">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => updateFilters({ verified: e.target.checked, page: 1 })}
              className="rounded text-amber-900 focus:ring-amber-800"
            />
            <span>Verificada</span>
          </label>

          <label className="dh-filter-checkbox">
            <input
              type="checkbox"
              checked={hasBenefitsOnly}
              onChange={(e) => updateFilters({ benefits: e.target.checked, page: 1 })}
              className="rounded text-amber-900 focus:ring-amber-800"
            />
            <span>Benefícios</span>
          </label>

          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs font-semibold text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 bg-red-50 rounded"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Limpar
            </button>
          )}
        </div>
      </div>

      {/* Grid or List Display */}
      {items.length === 0 ? (
        <div className="bg-white border rounded-xl p-12 text-center my-6 space-y-3">
          <div className="w-12 h-12 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-gray-900">Nenhuma empresa encontrada</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Não encontramos nenhum resultado para os filtros selecionados. Tente buscar por outros termos ou limpar os filtros.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-2 text-xs font-bold bg-amber-900 text-white px-4 py-2 rounded-md hover:bg-amber-800 transition-colors"
          >
            Limpar todos os filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 my-6">
          {items.map((biz) => (
            <BusinessCard key={biz.id} data={biz} variant="compact" />
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-3 my-6">
          {items.map((biz) => (
            <div key={biz.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden p-1 ${biz.logo_url ? 'bg-white border-stone-200' : 'bg-amber-950 text-amber-400 font-bold border-amber-900'}`}>
                  {biz.logo_url ? (
                    <img src={biz.logo_url} alt={biz.name} className="max-w-full max-h-full object-contain object-center bg-white" />
                  ) : (
                    biz.name.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{biz.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                    {biz.category_name && <span className="font-semibold text-amber-900">{biz.category_name}</span>}
                    {biz.city && <span>· {biz.city}, {biz.state}</span>}
                  </div>
                </div>
              </div>

              <Link
                href={`/guia/${biz.slug}`}
                className="text-xs font-bold bg-amber-900 text-white px-4 py-2 rounded-md hover:bg-amber-800 transition-colors shrink-0"
              >
                Ver empresa
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Real Server-side Pagination Controls */}
      {totalPages > 1 && (
        <div className="border-t border-stone-200 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Contador / Resumo para mobile & desktop */}
          <div className="text-xs text-stone-600 order-2 sm:order-1 text-center sm:text-left">
            Página <strong className="font-bold text-amber-950">{page}</strong> de <strong className="font-bold text-amber-950">{totalPages}</strong>
            <span className="hidden md:inline text-stone-400 mx-2">·</span>
            <span className="hidden md:inline">Mostrando itens {startItem} a {endItem} de {total}</span>
          </div>

          {/* Botões de Navegação */}
          <nav aria-label="Navegação da paginação" className="flex items-center gap-1 sm:gap-1.5 order-1 sm:order-2 flex-wrap justify-center">
            {/* Primeira Página */}
            <button
              disabled={page <= 1}
              onClick={() => updateFilters({ page: 1 })}
              title="Primeira página"
              aria-label="Primeira página"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 hover:text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Página Anterior */}
            <button
              disabled={!hasPreviousPage}
              onClick={() => updateFilters({ page: page - 1 })}
              title="Página anterior"
              aria-label="Página anterior"
              className="flex items-center gap-1 text-xs font-semibold text-stone-700 bg-white border border-stone-300 px-2.5 sm:px-3 py-2 rounded-lg hover:bg-stone-50 hover:text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Números de Página */}
            <div className="flex items-center gap-1">
              {paginationRange.map((item, idx) => {
                if (item === '...') {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="w-7 sm:w-8 text-center text-stone-400 font-bold select-none text-xs"
                    >
                      ...
                    </span>
                  );
                }

                const pageNum = item as number;
                const isActive = pageNum === page;

                return (
                  <button
                    key={pageNum}
                    onClick={() => updateFilters({ page: pageNum })}
                    aria-current={isActive ? 'page' : undefined}
                    className={`min-w-[34px] sm:min-w-[38px] h-9 sm:h-9 px-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center ${isActive
                      ? 'bg-[#3B0B14] text-[#C9A227] border border-[#C9A227]/40 shadow-sm font-bold scale-105'
                      : 'bg-white text-stone-700 border border-stone-300 hover:bg-stone-50 hover:text-amber-950 hover:border-amber-900/30'
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Próxima Página */}
            <button
              disabled={!hasNextPage}
              onClick={() => updateFilters({ page: page + 1 })}
              title="Próxima página"
              aria-label="Próxima página"
              className="flex items-center gap-1 text-xs font-semibold text-stone-700 bg-white border border-stone-300 px-2.5 sm:px-3 py-2 rounded-lg hover:bg-stone-50 hover:text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Próxima</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Última Página */}
            <button
              disabled={page >= totalPages}
              onClick={() => updateFilters({ page: totalPages })}
              title="Última página"
              aria-label="Última página"
              className="p-2 sm:px-2.5 sm:py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 hover:text-amber-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </nav>
        </div>
      )}
    </section>
  );
}
