'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Search, Loader2, ArrowRight, Landmark } from 'lucide-react';
import { searchHomeLodgesAction, type HomeLodgeSearchResult } from '@/app/actions/home-lodges';
import { LodgeCard } from './LodgeCard';
import { STATE_NAMES } from './LodgeFilters';
import type { LodgeGuideFacets } from '@/lib/lodges/facets';
import { EMPTY_LODGE_FACETS } from '@/lib/lodges/facets';

export type PublicMasonicLodgeItem = {
  id: string;
  slug?: string | null;
  name: string;
  code_number?: number | null;
  potency?: string | null;
  rite?: string | null;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  meeting_schedule?: string | null;
  contact_email?: string | null;
};

type DirectoryLodgesGuideProps = {
  /** Opções reais dos filtros, vindas de todas as lojas publicadas (não só das exibidas). */
  facets?: LodgeGuideFacets;
};

const DAYS_OF_WEEK = [
  { value: 'segunda', label: 'Segunda-feira' },
  { value: 'terca', label: 'Terça-feira' },
  { value: 'quarta', label: 'Quarta-feira' },
  { value: 'quinta', label: 'Quinta-feira' },
  { value: 'sexta', label: 'Sexta-feira' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

export function DirectoryLodgesGuide({ facets = EMPTY_LODGE_FACETS }: DirectoryLodgesGuideProps) {
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [potency, setPotency] = useState('');
  const [rite, setRite] = useState('');
  const [day, setDay] = useState('');
  const [result, setResult] = useState<HomeLodgeSearchResult | null>(null);
  const [searchedParams, setSearchedParams] = useState('');
  const [isPending, startTransition] = useTransition();

  const hasFilter = Boolean(state || city || potency || rite || day);
  const cityOptions = state ? facets.citiesByState[state] || [] : facets.cities;

  const handleStateChange = (value: string) => {
    setState(value);
    // Cidade que não pertence ao novo estado é limpa.
    if (value && city && !(facets.citiesByState[value] || []).includes(city)) setCity('');
  };

  const handleClear = () => {
    setState('');
    setCity('');
    setPotency('');
    setRite('');
    setDay('');
    setResult(null);
    setSearchedParams('');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasFilter) return;
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (city) params.set('city', city);
    if (potency) params.set('potency', potency);
    if (rite) params.set('rite', rite);
    if (day) params.set('day', day);
    setSearchedParams(params.toString());
    startTransition(async () => {
      setResult(await searchHomeLodgesAction({ state, city, potency, rite, day }));
    });
  };

  const selectClass = 'dh-filter-select';

  return (
    <section className="dh-container py-4" id="lojas">
      <div>
        <h2 className="dh-section-title">Guia de Lojas Maçônicas</h2>
        <p className="text-xs text-gray-500 mt-1">
          Encontre lojas maçônicas em todo o Brasil e consulte informações para sua visita fraternal.
        </p>
      </div>

      {/* Barra de filtros com dados reais */}
      <form onSubmit={handleSearch} className="dh-filter-bar my-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select value={state} onChange={(e) => handleStateChange(e.target.value)} className={selectClass} aria-label="Estado">
            <option value="">Todos os Estados</option>
            {facets.states.map((uf) => (
              <option key={uf} value={uf}>
                {uf} — {STATE_NAMES[uf] || uf}
              </option>
            ))}
          </select>

          <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass} aria-label="Cidade">
            <option value="">Todas as Cidades</option>
            {cityOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select value={potency} onChange={(e) => setPotency(e.target.value)} className={selectClass} aria-label="Potência">
            <option value="">Todas as Potências</option>
            {facets.potencies.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>

          <select value={rite} onChange={(e) => setRite(e.target.value)} className={selectClass} aria-label="Rito">
            <option value="">Todos os Ritos</option>
            {facets.rites.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>

          <select value={day} onChange={(e) => setDay(e.target.value)} className={selectClass} aria-label="Dia da reunião">
            <option value="">Qualquer dia de reunião</option>
            {DAYS_OF_WEEK.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          {hasFilter && (
            <button type="button" onClick={handleClear} className="text-xs font-semibold text-stone-500 hover:text-amber-900 px-2 py-2">
              Limpar
            </button>
          )}
          <button
            type="submit"
            disabled={!hasFilter || isPending}
            className="bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-md hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Buscar lojas
          </button>
        </div>
      </form>

      {/* Resultado: só aparece depois de filtrar */}
      {!result && !isPending && (
        <div className="bg-white border border-dashed border-stone-300 rounded-xl p-8 text-center text-xs text-stone-500 flex flex-col items-center gap-2">
          <Landmark className="w-6 h-6 text-amber-900/60" />
          <span>Escolha estado, cidade, potência, rito ou dia de reunião e clique em <strong>Buscar lojas</strong>.</span>
          <Link href="/guia/lojas" className="font-bold text-amber-900 hover:underline">
            Ou veja o diretório completo de lojas →
          </Link>
        </div>
      )}

      {isPending && (
        <div className="bg-white border rounded-xl p-8 text-center text-xs text-stone-500 flex items-center justify-center gap-2" role="status">
          <Loader2 className="w-4 h-4 animate-spin text-amber-900" /> Buscando lojas…
        </div>
      )}

      {result && !isPending && !result.success && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-xs text-red-700" role="alert">
          {result.error}
        </div>
      )}

      {result && !isPending && result.success && result.items.length === 0 && (
        <div className="bg-white border rounded-xl p-8 text-center text-xs text-gray-500">
          Nenhuma Loja Maçônica encontrada com os filtros selecionados.
        </div>
      )}

      {result && !isPending && result.success && result.items.length > 0 && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {result.items.map((lodge) => (
              <LodgeCard key={lodge.id} data={lodge} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-600">
            <span>
              Mostrando {result.items.length} de {result.total} {result.total === 1 ? 'loja' : 'lojas'}.
            </span>
            <Link
              href={`/guia/lojas${searchedParams ? `?${searchedParams}` : ''}`}
              className="inline-flex items-center gap-1 font-bold text-amber-900 hover:underline"
            >
              Ver {result.total > result.items.length ? `todas as ${result.total} lojas` : 'no diretório'} <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
