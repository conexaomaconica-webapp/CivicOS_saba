'use client';

import React from 'react';
import { LayoutGrid, List, Map, SlidersHorizontal } from 'lucide-react';

export type ViewMode = 'list' | 'grid' | 'map';

type BusinessResultsToolbarProps = {
  total: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  onOpenMobileFilters?: () => void;
};

export function BusinessResultsToolbar({
  total,
  viewMode,
  onViewModeChange,
  sortBy,
  onSortChange,
  pageSize,
  onPageSizeChange,
  onOpenMobileFilters,
}: BusinessResultsToolbarProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-3.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 mb-5">
      {/* Esquerda: Contador total + Botão Mobile Filtros */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-3">
        <div className="text-xs font-bold text-gray-900 font-serif text-base">
          <span className="text-[#5d1523]">{total}</span> {total === 1 ? 'empresa encontrada' : 'empresas encontradas'}
        </div>

        {/* Botão de abrir filtros no mobile */}
        {onOpenMobileFilters && (
          <button
            onClick={onOpenMobileFilters}
            className="sm:hidden flex items-center gap-1.5 text-xs font-bold bg-amber-50 text-amber-950 px-3 py-1.5 rounded-xl border border-amber-900/20"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filtros</span>
          </button>
        )}
      </div>

      {/* Direita: Modos de Exibição, Ordenação e Tamanho de Página */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
        {/* Modos de Exibição (Lista | Grade | Mapa) */}
        <div className="bg-stone-100 p-1 rounded-xl flex items-center gap-1 border border-stone-200">
          <button
            onClick={() => onViewModeChange('list')}
            title="Visualização em Lista"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'list' ? 'bg-white text-[#5d1523] shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <List className="w-4 h-4" />
            <span className="hidden md:inline">Lista</span>
          </button>

          <button
            onClick={() => onViewModeChange('grid')}
            title="Visualização em Grade"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'grid' ? 'bg-white text-[#5d1523] shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">Grade</span>
          </button>

          <button
            onClick={() => onViewModeChange('map')}
            title="Visualização em Mapa"
            className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              viewMode === 'map' ? 'bg-white text-[#5d1523] shadow-xs font-bold' : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Map className="w-4 h-4" />
            <span className="hidden md:inline">Mapa</span>
          </button>
        </div>

        {/* Dropdown de Ordenação */}
        <div className="flex items-center gap-1.5">
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="bg-stone-50 border border-stone-300 rounded-xl p-2 text-xs text-gray-900 outline-none font-medium cursor-pointer"
          >
            <option value="relevance">Relevância</option>
            <option value="distance">Mais Próximas</option>
            <option value="rating">Melhor Avaliadas</option>
            <option value="recent">Mais Recentes</option>
            <option value="name">Nome (A-Z)</option>
          </select>
        </div>

        {/* Seletor de Quantidade por Página */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs text-stone-600">
          <span>Exibir:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-stone-50 border border-stone-300 rounded-xl p-1.5 text-xs text-gray-900 outline-none font-semibold cursor-pointer"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>
    </div>
  );
}
