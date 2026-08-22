'use client';

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

type DirectoryPaginationProps = {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
};

export function DirectoryPagination({
  total,
  page,
  pageSize,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: DirectoryPaginationProps) {
  if (total === 0) return null;

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  // Generate page numbers array with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
      {/* Texto da Paginação */}
      <div className="text-xs text-stone-600 font-medium">
        Mostrando <span className="font-bold text-gray-900">{startItem}–{endItem}</span> de{' '}
        <span className="font-bold text-gray-900">{total}</span> empresas
      </div>

      {/* Botões Numéricos de Navegação */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="p-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, idx) => (
          <React.Fragment key={idx}>
            {typeof p === 'number' ? (
              <button
                onClick={() => onPageChange(p)}
                className={`w-9 h-9 rounded-xl text-xs font-bold transition-all ${
                  page === p
                    ? 'bg-[#3b0b14] text-white shadow-xs'
                    : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {p}
              </button>
            ) : (
              <span className="px-1 text-stone-400 text-xs font-bold">...</span>
            )}
          </React.Fragment>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="p-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Seletor de quantidade por página */}
      {onPageSizeChange && (
        <div className="flex items-center gap-2 text-xs text-stone-600">
          <span>Por página:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-stone-50 border border-stone-300 rounded-xl p-1.5 text-xs text-gray-900 outline-none font-bold cursor-pointer"
          >
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      )}
    </div>
  );
}
