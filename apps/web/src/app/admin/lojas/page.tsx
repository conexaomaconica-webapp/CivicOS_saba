import React from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import {
  getAdminLodgeFacetsAction,
  listAdminLodgesAction,
  type LodgeListFilters,
  type LodgeListSort,
} from '@/lib/admin/admin-lodges-list-service';
import { LodgesTableClient } from './lodges-table-client';

export const metadata = {
  title: 'Diretório de Lojas Maçônicas · Admin CM',
  robots: { index: false, follow: false },
};

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

const PAGE_SIZES = [25, 50, 100, 200];

/** Janela de páginas: 1 … 4 5 [6] 7 8 … 40 */
function pageWindow(current: number, last: number): Array<number | '…'> {
  const set = new Set<number>([1, last, current - 2, current - 1, current, current + 1, current + 2]);
  const nums = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b);
  const out: Array<number | '…'> = [];
  nums.forEach((n, i) => {
    const prev = nums[i - 1];
    if (i > 0 && prev !== undefined && n - prev > 1) out.push('…');
    out.push(n);
  });
  return out;
}

export default async function AdminLojasPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const filters: LodgeListFilters = {
    q: one(sp.q),
    state: one(sp.state),
    city: one(sp.city),
    potency: one(sp.potency),
    rite: one(sp.rite),
    status: one(sp.status) as LodgeListFilters['status'],
    logo: one(sp.logo) as LodgeListFilters['logo'],
    coords: one(sp.coords) as LodgeListFilters['coords'],
  };
  const sort = (one(sp.sort) || 'recent') as LodgeListSort;

  const [result, facets] = await Promise.all([
    listAdminLodgesAction({ filters, page: Number(one(sp.page)) || 1, pageSize: Number(one(sp.size)) || 50, sort }),
    getAdminLodgeFacetsAction(),
  ]);
  const { items, total, page, pageSize, totalPages, kpis } = result;

  const buildHref = (over: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const base: Record<string, string | number | undefined> = {
      q: filters.q, state: filters.state, city: filters.city, potency: filters.potency, rite: filters.rite,
      status: filters.status, logo: filters.logo, coords: filters.coords,
      sort: sort !== 'recent' ? sort : undefined, size: pageSize !== 50 ? pageSize : undefined,
      page, ...over,
    };
    for (const [k, v] of Object.entries(base)) {
      if (v === undefined || v === '' || v === 'all' || (k === 'page' && Number(v) <= 1)) continue;
      params.set(k, String(v));
    }
    const qs = params.toString();
    return qs ? `/admin/lojas?${qs}` : '/admin/lojas';
  };

  const kpiCards = [
    { label: 'Total de lojas', value: kpis.total, href: buildHref({ q: '', state: '', city: '', potency: '', rite: '', status: '', logo: '', coords: '', page: 1 }) },
    { label: 'Publicadas', value: kpis.published, href: buildHref({ status: 'published', page: 1 }) },
    { label: 'Inativas', value: kpis.inactive, href: buildHref({ status: 'inactive', page: 1 }) },
    { label: 'Sem brasão', value: kpis.missing_logo, href: buildHref({ logo: 'missing', page: 1 }) },
    { label: 'Sem coordenadas', value: kpis.missing_coords, href: buildHref({ coords: 'missing', page: 1 }) },
  ];

  const input = 'rounded-lg border border-stone-300 bg-white px-2.5 py-1.5 text-sm';
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#C9A227]/30 pb-4">
        <span className="bg-[#3B0B14] text-[#C9A227] font-bold text-xs px-2.5 py-0.5 rounded-full border border-[#C9A227]/40">
          Organizações Maçônicas · Conexão Maçônica
        </span>
        <h1 className="text-2xl font-serif font-bold text-[#1f1914] mt-2 flex items-center gap-2">
          <Compass className="w-6 h-6 text-[#4B161B]" /> Gestão 360º de Lojas Maçônicas & Potências
        </h1>
        <p className="text-xs text-stone-500 mt-1">
          Qualificação da base: brasão, coordenadas, reuniões e publicação. Selecione várias lojas para editar ou excluir em massa.
        </p>
      </div>

      {result.error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{result.error}</div>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpiCards.map((k) => (
          <Link key={k.label} href={k.href} className="rounded-xl border border-stone-200 bg-white p-3 hover:border-[#C9A227]">
            <div className="text-2xl font-bold text-[#4B161B]">{k.value.toLocaleString('pt-BR')}</div>
            <div className="text-xs text-stone-500">{k.label}</div>
          </Link>
        ))}
      </div>

      <form method="get" action="/admin/lojas" className="grid grid-cols-2 gap-2 rounded-xl border border-stone-200 bg-white p-3 md:grid-cols-4 lg:grid-cols-6">
        <input name="q" defaultValue={filters.q} placeholder="Buscar nome, cidade, nº, venerável…" className={`${input} col-span-2`} />
        <select name="state" defaultValue={filters.state || ''} className={input} aria-label="Estado">
          <option value="">Todos os estados</option>
          {facets.states.map((s) => <option key={s.value} value={s.value}>{s.value} ({s.count.toLocaleString('pt-BR')})</option>)}
        </select>
        <input name="city" defaultValue={filters.city} placeholder="Cidade (exata)" className={input} />
        <select name="potency" defaultValue={filters.potency || ''} className={input} aria-label="Potência">
          <option value="">Todas as potências</option>
          {facets.potencies.map((p) => <option key={p.value} value={p.value}>{p.label} ({p.count.toLocaleString('pt-BR')})</option>)}
        </select>
        <input name="rite" defaultValue={filters.rite} placeholder="Rito" className={input} />
        <select name="status" defaultValue={filters.status || 'all'} className={input} aria-label="Status">
          <option value="all">Qualquer status</option>
          <option value="published">Publicadas</option>
          <option value="inactive">Inativas</option>
        </select>
        <select name="logo" defaultValue={filters.logo || 'all'} className={input} aria-label="Brasão">
          <option value="all">Brasão: todos</option>
          <option value="missing">Sem brasão</option>
          <option value="has">Com brasão</option>
        </select>
        <select name="coords" defaultValue={filters.coords || 'all'} className={input} aria-label="Coordenadas">
          <option value="all">Coordenadas: todas</option>
          <option value="missing">Sem coordenadas</option>
        </select>
        <select name="sort" defaultValue={sort} className={input} aria-label="Ordenação">
          <option value="recent">Mais recentes</option>
          <option value="name">Nome (A–Z)</option>
          <option value="number">Número</option>
        </select>
        <select name="size" defaultValue={String(pageSize)} className={input} aria-label="Por página">
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n} por página</option>)}
        </select>
        <div className="flex gap-2">
          <button type="submit" className="rounded-lg bg-[#4B161B] px-4 py-1.5 text-sm font-bold text-white hover:bg-[#3B0B14]">Filtrar</button>
          <Link href="/admin/lojas" className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">Limpar</Link>
        </div>
      </form>

      <p className="text-sm text-stone-600">
        Mostrando <strong>{first.toLocaleString('pt-BR')}–{last.toLocaleString('pt-BR')}</strong> de <strong>{total.toLocaleString('pt-BR')}</strong> loja(s)
        {total !== kpis.total && <> (filtro aplicado; base total {kpis.total.toLocaleString('pt-BR')})</>}.
      </p>

      <LodgesTableClient items={items} total={total} filters={filters} />

      {totalPages > 1 && (
        <nav aria-label="Paginação" className="flex flex-wrap items-center justify-center gap-1.5">
          {page > 1 && <Link href={buildHref({ page: page - 1 })} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">‹ Anterior</Link>}
          {pageWindow(page, totalPages).map((n, i) =>
            n === '…' ? (
              <span key={`gap-${i}`} className="px-1 text-stone-400">…</span>
            ) : (
              <Link
                key={n}
                href={buildHref({ page: n })}
                aria-current={n === page ? 'page' : undefined}
                className={`rounded-lg border px-3 py-1.5 text-sm ${n === page ? 'border-[#4B161B] bg-[#4B161B] font-bold text-white' : 'border-stone-300 hover:bg-stone-50'}`}
              >
                {n}
              </Link>
            ),
          )}
          {page < totalPages && <Link href={buildHref({ page: page + 1 })} className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm hover:bg-stone-50">Próxima ›</Link>}
        </nav>
      )}
    </div>
  );
}
