import React from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import {
  CONNECTIONS_MAX_QUERY,
  CONNECTION_TYPES,
  CONNECTION_TYPE_LABEL,
  buildConnectionsUrl,
  hasActiveFilters,
  type ConnectionsListParams,
} from '@/lib/directory/connections-list';

/**
 * Filtros discretos do mural: busca, tipo (abas) e ordem. Tudo funciona por URL (GET), sem JavaScript no navegador,
 * o que mantém a página rápida, compartilhável e acessível por teclado e leitores de tela.
 */
export function ConnectionsFilters({ params }: { params: ConnectionsListParams }) {
  const chip = (active: boolean) =>
    `inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-bold transition ${
      active ? 'border-[#4B161B] bg-[#4B161B] text-white' : 'border-stone-300 bg-white text-stone-700 hover:border-[#C9A227] hover:text-[#4B161B]'
    }`;

  return (
    <div className="space-y-4">
      <form method="get" action="/conexoes" role="search" aria-label="Buscar conexões" className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="conexoes-busca" className="sr-only">Buscar por empresa ou conteúdo</label>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden="true" />
          <input
            id="conexoes-busca"
            name="q"
            type="search"
            defaultValue={params.q}
            maxLength={CONNECTIONS_MAX_QUERY}
            placeholder="Buscar por empresa ou conteúdo"
            className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30"
          />
        </div>
        {params.type && <input type="hidden" name="tipo" value={params.type} />}
        {params.empresa && <input type="hidden" name="empresa" value={params.empresa} />}
        <label htmlFor="conexoes-ordem" className="sr-only">Ordenar por</label>
        <select
          id="conexoes-ordem"
          name="ordem"
          defaultValue={params.order === 'oldest' ? 'antigas' : ''}
          className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-700 focus:border-[#C9A227] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/30"
        >
          <option value="">Mais recentes</option>
          <option value="antigas">Mais antigas</option>
        </select>
        <button type="submit" className="rounded-xl bg-[#4B161B] px-5 py-2.5 text-sm font-bold text-[#F3EEDD] transition hover:bg-[#3B0B14] focus:outline-none focus:ring-2 focus:ring-[#C9A227]/60">
          Buscar
        </button>
      </form>

      <nav aria-label="Filtrar por tipo de conexão" className="flex flex-wrap items-center gap-2">
        <Link href={buildConnectionsUrl({ q: params.q, order: params.order, empresa: params.empresa })} className={chip(!params.type)} aria-current={!params.type ? 'true' : undefined}>
          Todas
        </Link>
        {CONNECTION_TYPES.map((type) => (
          <Link
            key={type}
            href={buildConnectionsUrl({ q: params.q, order: params.order, type, empresa: params.empresa })}
            className={chip(params.type === type)}
            aria-current={params.type === type ? 'true' : undefined}
          >
            {CONNECTION_TYPE_LABEL[type]}
          </Link>
        ))}
        {hasActiveFilters(params) && (
          <Link href="/conexoes" className="ml-auto text-xs font-bold text-[#4B161B] underline-offset-2 hover:underline">
            Limpar filtros
          </Link>
        )}
      </nav>
    </div>
  );
}
