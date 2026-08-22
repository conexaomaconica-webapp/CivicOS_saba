'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { BusinessFilters, type FilterState } from './BusinessFilters';
import { BusinessActiveFilters } from './BusinessActiveFilters';
import { BusinessResultsToolbar, type ViewMode } from './BusinessResultsToolbar';
import { BusinessCard, type BusinessCardData } from './BusinessCard';
import { BusinessListCard } from './BusinessListCard';
import { BusinessMapView } from './BusinessMapView';
import { DirectoryPagination } from './DirectoryPagination';

type BusinessDirectoryClientProps = {
  initialFilters: FilterState;
  initialViewMode: ViewMode;
  initialSort: string;
  initialPage: number;
  initialPageSize: number;
  total: number;
  totalPages: number;
  businessItems: BusinessCardData[];
  availableCities: string[];
  categories: { id: string; slug: string; name: string }[];
  activeCategoryName?: string;
  queryParam: string;
};

export function BusinessDirectoryClient({
  initialFilters,
  initialViewMode,
  initialSort,
  initialPage,
  initialPageSize,
  total,
  totalPages,
  businessItems,
  availableCities,
  categories,
  activeCategoryName,
  queryParam,
}: BusinessDirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Helper to build URL and navigate
  const updateUrl = (updatedFilters: FilterState, updatedSort: string, updatedView: ViewMode, updatedPage: number, updatedSize: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (queryParam) params.set('q', queryParam);
    else params.delete('q');

    if (updatedFilters.city) params.set('city', updatedFilters.city);
    else params.delete('city');

    if (updatedFilters.state) params.set('state', updatedFilters.state);
    else params.delete('state');

    if (updatedFilters.category) params.set('cat', updatedFilters.category);
    else params.delete('cat');

    // Arrays
    params.delete('rel');
    updatedFilters.relationships.forEach((r) => params.append('rel', r));

    params.delete('rec');
    updatedFilters.recognitions.forEach((r) => params.append('rec', r));

    params.delete('plan');
    updatedFilters.plans.forEach((p) => params.append('plan', p));

    if (updatedFilters.verified) params.set('verified', 'true');
    else params.delete('verified');

    if (updatedFilters.maxDistanceKm) params.set('dist', String(updatedFilters.maxDistanceKm));
    else params.delete('dist');

    if (updatedSort && updatedSort !== 'relevance') params.set('sort', updatedSort);
    else params.delete('sort');

    if (updatedView && updatedView !== 'grid') params.set('view', updatedView);
    else params.delete('view');

    if (updatedPage > 1) params.set('page', String(updatedPage));
    else params.delete('page');

    if (updatedSize !== 12) params.set('page_size', String(updatedSize));
    else params.delete('page_size');

    router.push(`/guia/empresas?${params.toString()}`);
  };

  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    updateUrl(newFilters, sortBy, viewMode, 1, pageSize);
  };

  const handleClearAllFilters = () => {
    const emptyFilters: FilterState = {
      state: undefined,
      city: undefined,
      category: undefined,
      relationships: [],
      recognitions: [],
      plans: [],
      verified: false,
      maxDistanceKm: undefined,
    };
    setFilters(emptyFilters);
    updateUrl(emptyFilters, sortBy, viewMode, 1, pageSize);
  };

  const handleRemoveFilterChip = (key: keyof FilterState, value?: string) => {
    const updated = { ...filters };
    if (key === 'relationships') {
      updated.relationships = updated.relationships.filter((r) => r !== value);
    } else if (key === 'recognitions') {
      updated.recognitions = updated.recognitions.filter((r) => r !== value);
    } else if (key === 'plans') {
      updated.plans = updated.plans.filter((p) => p !== value);
    } else if (key === 'verified') {
      updated.verified = false;
    } else {
      (updated as any)[key] = undefined;
    }
    setFilters(updated);
    updateUrl(updated, sortBy, viewMode, 1, pageSize);
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    updateUrl(filters, sortBy, mode, initialPage, pageSize);
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    updateUrl(filters, sort, viewMode, 1, pageSize);
  };

  const handlePageChange = (newPage: number) => {
    updateUrl(filters, sortBy, viewMode, newPage, pageSize);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    updateUrl(filters, sortBy, viewMode, 1, newSize);
  };

  return (
    <>
      {/* Chips dos Filtros Ativos */}
      <BusinessActiveFilters
        filters={filters}
        categoryName={activeCategoryName}
        onRemove={handleRemoveFilterChip}
        onClearAll={handleClearAllFilters}
      />

      {/* Toolbar de Resultados */}
      <BusinessResultsToolbar
        total={total}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        pageSize={pageSize}
        onPageSizeChange={handlePageSizeChange}
        onOpenMobileFilters={() => setIsMobileDrawerOpen(true)}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar Desktop (3 colunas) */}
        <aside className="hidden lg:block lg:col-span-3 sticky top-24">
          <BusinessFilters
            filters={filters}
            availableCities={availableCities}
            categories={categories}
            onChange={handleFilterChange}
            onClear={handleClearAllFilters}
          />
        </aside>

        {/* Lista de Resultados (9 colunas) */}
        <section className="lg:col-span-9">
          {businessItems.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center my-4 space-y-3 shadow-2xs">
              <div className="w-12 h-12 bg-amber-50 text-amber-900 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-gray-900 text-lg">Nenhuma empresa encontrada</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Não encontramos nenhuma empresa que corresponda aos filtros selecionados. Tente alterar os termos ou limpar os filtros.
              </p>
              <button
                onClick={handleClearAllFilters}
                className="inline-block mt-2 text-xs font-bold bg-[#3b0b14] text-white px-5 py-2.5 rounded-xl hover:bg-[#5d1523] transition-colors"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : viewMode === 'map' ? (
            <BusinessMapView items={businessItems} />
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {businessItems.map((biz) => (
                <BusinessListCard key={biz.id} data={biz} />
              ))}
            </div>
          ) : (
            /* Modo Grade (3 colunas no desktop) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {businessItems.map((biz) => (
                <BusinessCard key={biz.id} data={biz} variant="compact" />
              ))}
            </div>
          )}

          {/* Paginação */}
          <DirectoryPagination
            total={total}
            page={initialPage}
            pageSize={pageSize}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </section>
      </div>

      {/* Drawer Mobile de Filtros */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex justify-end lg:hidden">
          <div className="absolute inset-0" onClick={() => setIsMobileDrawerOpen(false)} />
          <div className="relative w-full max-w-xs bg-white h-full shadow-2xl flex flex-col z-10 overflow-y-auto">
            <div className="p-4 bg-[#3b0b14] text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-serif font-bold text-base">
                <SlidersHorizontal className="w-4 h-4 text-amber-400" />
                <span>Filtros</span>
              </div>
              <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1 text-stone-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <BusinessFilters
              filters={filters}
              availableCities={availableCities}
              categories={categories}
              onChange={setFilters}
              onClear={handleClearAllFilters}
              isMobileDrawer
              onApply={() => handleFilterChange(filters)}
              onCloseMobile={() => setIsMobileDrawerOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
