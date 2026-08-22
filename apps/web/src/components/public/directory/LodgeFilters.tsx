'use client';

import React from 'react';
import { Filter, RotateCcw, MapPin, Landmark, Calendar, Scroll } from 'lucide-react';

export type LodgeFilterState = {
  state?: string;
  city?: string;
  potency?: string;
  rite?: string;
  meetingDay?: string;
  maxDistanceKm?: number;
};

type LodgeFiltersProps = {
  filters: LodgeFilterState;
  availableCities?: string[];
  potencies?: { id: string; slug: string; name: string; abbreviation: string }[];
  rites?: { id: string; slug: string; name: string }[];
  onChange: (newFilters: LodgeFilterState) => void;
  onClear: () => void;
  onApply?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
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

export function LodgeFilters({
  filters,
  availableCities = [],
  potencies = [],
  rites = [],
  onChange,
  onClear,
  onApply,
  isMobileDrawer = false,
  onCloseMobile,
}: LodgeFiltersProps) {
  const containerClasses = isMobileDrawer
    ? 'p-5 space-y-6'
    : 'bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-6';

  return (
    <div className={containerClasses}>
      {/* Header dos Filtros */}
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <div className="flex items-center gap-2 text-stone-900 font-serif font-bold text-base">
          <Filter className="w-4 h-4 text-amber-900" />
          <span>Filtros de Lojas</span>
        </div>
        <button
          onClick={onClear}
          className="text-xs font-semibold text-stone-500 hover:text-amber-900 flex items-center gap-1 transition-colors"
          title="Limpar todos os filtros"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Limpar</span>
        </button>
      </div>

      {/* Cidade */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-amber-900" />
          <span>Cidade / Oriente</span>
        </label>
        <select
          value={filters.city || ''}
          onChange={(e) => onChange({ ...filters, city: e.target.value || undefined })}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-900 font-medium"
        >
          <option value="">Todas as Cidades</option>
          {availableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Potência Maçônica (Obediência) */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
          <Landmark className="w-3.5 h-3.5 text-amber-900" />
          <span>Potência / Obediência</span>
        </label>
        <select
          value={filters.potency || ''}
          onChange={(e) => onChange({ ...filters, potency: e.target.value || undefined })}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-900 font-medium"
        >
          <option value="">Todas as Potências</option>
          {potencies.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.abbreviation} - {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Rito */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
          <Scroll className="w-3.5 h-3.5 text-amber-900" />
          <span>Rito Maçônico</span>
        </label>
        <select
          value={filters.rite || ''}
          onChange={(e) => onChange({ ...filters, rite: e.target.value || undefined })}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-900 font-medium"
        >
          <option value="">Todos os Ritos</option>
          {rites.map((r) => (
            <option key={r.id} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dia da Reunião */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-amber-900" />
          <span>Dia da Reunião</span>
        </label>
        <select
          value={filters.meetingDay || ''}
          onChange={(e) => onChange({ ...filters, meetingDay: e.target.value || undefined })}
          className="w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:ring-2 focus:ring-amber-900 font-medium"
        >
          <option value="">Qualquer dia da semana</option>
          {DAYS_OF_WEEK.map((d) => (
            <option key={d.value} value={d.value}>
              {d.label}
            </option>
          ))}
        </select>
      </div>

      {/* Botões Mobile */}
      {isMobileDrawer && (
        <div className="pt-4 space-y-2">
          {onApply && (
            <button
              onClick={() => {
                onApply();
                if (onCloseMobile) onCloseMobile();
              }}
              className="w-full bg-[#3b0b14] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#5d1523] transition-colors shadow-sm"
            >
              Aplicar Filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}
