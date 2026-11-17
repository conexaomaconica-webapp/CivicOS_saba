import React from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildConnectionsUrl, paginationWindow, type ConnectionsListParams } from '@/lib/directory/connections-list';

/** Paginação por links (paginação no servidor): cada página tem URL própria e funciona sem JavaScript. */
export function ConnectionsPagination({ params, page, totalPages }: { params: ConnectionsListParams; page: number; totalPages: number }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => buildConnectionsUrl({ ...params, page: p });
  const base = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2.5 text-sm font-bold transition';

  return (
    <nav aria-label="Paginação das conexões" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className={`${base} border-stone-300 bg-white text-[#4B161B] hover:border-[#C9A227]`} aria-label="Página anterior">
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${base} cursor-not-allowed border-stone-200 bg-stone-50 text-stone-300`} aria-hidden="true"><ChevronLeft className="h-4 w-4" /></span>
      )}

      {paginationWindow(page, totalPages).map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 text-stone-400" aria-hidden="true">…</span>
        ) : (
          <Link
            key={entry}
            href={href(entry)}
            aria-label={`Página ${entry}`}
            aria-current={entry === page ? 'page' : undefined}
            className={`${base} ${entry === page ? 'border-[#4B161B] bg-[#4B161B] text-white' : 'border-stone-300 bg-white text-[#4B161B] hover:border-[#C9A227]'}`}
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link href={href(page + 1)} rel="next" className={`${base} border-stone-300 bg-white text-[#4B161B] hover:border-[#C9A227]`} aria-label="Próxima página">
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={`${base} cursor-not-allowed border-stone-200 bg-stone-50 text-stone-300`} aria-hidden="true"><ChevronRight className="h-4 w-4" /></span>
      )}
    </nav>
  );
}
