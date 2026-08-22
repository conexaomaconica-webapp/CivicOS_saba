'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { LodgeFilters, type LodgeFilterState } from './LodgeFilters';
import { BusinessResultsToolbar, type ViewMode } from './BusinessResultsToolbar';
import { LodgeCard, type LodgeCardData } from './LodgeCard';
import { LodgeListCard } from './LodgeListCard';
import { LodgeMapView } from './LodgeMapView';
import { DirectoryPagination } from './DirectoryPagination';

type LodgeDirectoryClientProps = {
  initialFilters: LodgeFilterState;
  initialViewMode: ViewMode;
  initialSort: string;
  initialPage: number;
  initialPageSize: number;
  total: number;
  totalPages: number;
  lodgeItems: LodgeCardData[];
  availableCities: string[];
  potencies: { id: string; slug: string; name: string; abbreviation: string }[];
  rites: { id: string; slug: string; name: string }[];
  queryParam: string;
};

export function LodgeDirectoryClient({
  initialFilters,
  initialViewMode,
  initialSort,
  initialPage,
  initialPageSize,
  total,
  totalPages,
  lodgeItems,
  availableCities,
  potencies,
  rites,
  queryParam,
}: LodgeDirectoryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<LodgeFilterState>(initialFilters);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [sortBy, setSortBy] = useState<string>(initialSort);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  const updateUrl = (updatedFilters: LodgeFilterState, updatedSort: string, updatedView: ViewMode, updatedPage: number, updatedSize: number) => {
    const params = new URLSearchParams(searchParams.toString());

    if (queryParam) params.set('q', queryParam);
    else params.delete('q');

    if (updatedFilters.city) params.set('city', updatedFilters.city);
    else params.delete('city');

    if (updatedFilters.state) params.set('state', updatedFilters.state);
    else params.delete('state');

    if (updatedFilters.potency) params.set('potency', updatedFilters.potency);
    else params.delete('potency');

    if (updatedFilters.rite) params.set('rite', updatedFilters.rite);
    else params.delete('rite');

    if (updatedFilters.meetingDay) params.set('day', updatedFilters.meetingDay);
    else params.delete('day');

    if (updatedSort && updatedSort !== 'name') params.set('sort', updatedSort);
    else params.delete('sort');

    if (updatedView && updatedView !== 'grid') params.set('view', updatedView);
    else params.delete('view');

    if (updatedPage > 1) params.set('page', String(updatedPage));
    else params.delete('page');

    if (updatedSize !== 12) params.set('page_size', String(updatedSize));
    else params.delete('page_size');

    router.push(`/guia/lojas?${params.toString()}`);
  };

  const handleFilterChange = (newFilters: LodgeFilterState) => {
    setFilters(newFilters);
    updateUrl(newFilters, sortBy, viewMode, 1, pageSize);
  };

  const handleClearAllFilters = () => {
    const emptyFilters: LodgeFilterState = {
      state: undefined,
      city: undefined,
      potency: undefined,
      rite: undefined,
      meetingDay: undefined,
      maxDistanceKm: undefined,
    };
    setFilters(emptyFilters);
    updateUrl(emptyFilters, sortBy, viewMode, 1, pageSize);
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
          <LodgeFilters
            filters={filters}
            availableCities={availableCities}
            potencies={potencies}
            rites={rites}
            onChange={handleFilterChange}
            onClear={handleClearAllFilters}
          />
        </aside>

        {/* Lista de Resultados (9 colunas) */}
        <section className="lg:col-span-9">
          {lodgeItems.length === 0 ? (
            <div className="bg-white border rounded-2xl p-12 text-center my-4 space-y-3 shadow-2xs">
              <div className="w-12 h-12 bg-amber-50 text-amber-900 rounded-full flex items-center justify-center mx-auto border border-amber-200">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-serif font-bold text-gray-900 text-lg">Nenhuma loja maçônica encontrada</h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Não encontramos nenhuma loja que corresponda aos filtros selecionados. Tente alterar os termos ou limpar os filtros.
              </p>
              <button
                onClick={handleClearAllFilters}
                className="inline-block mt-2 text-xs font-bold bg-[#3b0b14] text-white px-5 py-2.5 rounded-xl hover:bg-[#5d1523] transition-colors"
              >
                Limpar todos os filtros
              </button>
            </div>
          ) : viewMode === 'map' ? (
            <LodgeMapView items={lodgeItems} />
          ) : viewMode === 'list' ? (
            <div className="space-y-4">
              {lodgeItems.map((lodge) => (
                <LodgeListCard key={lodge.id} data={lodge} />
              ))}
            </div>
          ) : (
            /* Modo Grade (3 colunas no desktop) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {lodgeItems.map((lodge) => (
                <LodgeCard key={lodge.id} data={lodge} variant="compact" />
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
                <span>Filtros de Lojas</span>
              </div>
              <button onClick={() => setIsMobileDrawerOpen(false)} className="p-1 text-stone-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <LodgeFilters
              filters={filters}
              availableCities={availableCities}
              potencies={potencies}
              rites={rites}
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
