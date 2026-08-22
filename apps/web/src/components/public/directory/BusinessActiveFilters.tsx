'use client';

import React from 'react';
import { X } from 'lucide-react';
import type { FilterState } from './BusinessFilters';

type BusinessActiveFiltersProps = {
  filters: FilterState;
  categoryName?: string;
  onRemove: (key: keyof FilterState, value?: string) => void;
  onClearAll: () => void;
};

export function BusinessActiveFilters({
  filters,
  categoryName,
  onRemove,
  onClearAll,
}: BusinessActiveFiltersProps) {
  const chips: { label: string; key: keyof FilterState; value?: string }[] = [];

  if (filters.city) {
    chips.push({ label: `Cidade: ${filters.city}`, key: 'city' });
  }
  if (filters.maxDistanceKm) {
    chips.push({ label: `Distância: até ${filters.maxDistanceKm}km`, key: 'maxDistanceKm' });
  }
  if (filters.category) {
    chips.push({ label: `Categoria: ${categoryName || filters.category}`, key: 'category' });
  }
  filters.relationships.forEach((rel) => {
    const map: Record<string, string> = { brother: 'Irmão', wife: 'Cunhada', child: 'Sobrinho(a)', representative: 'Representante' };
    chips.push({ label: `Vínculo: ${map[rel] || rel}`, key: 'relationships', value: rel });
  });
  filters.recognitions.forEach((rec) => {
    const map: Record<string, string> = { pedra_fundamental: 'Pedra Fundamental', coluna_honra: 'Coluna de Honra' };
    chips.push({ label: `Selo: ${map[rec] || rec}`, key: 'recognitions', value: rec });
  });
  filters.plans.forEach((plan) => {
    chips.push({ label: `Plano: ${plan.toUpperCase()}`, key: 'plans', value: plan });
  });
  if (filters.verified) {
    chips.push({ label: 'Empresa Verificada', key: 'verified' });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap mb-4">
      <span className="text-xs font-semibold text-stone-500">Filtros ativos:</span>
      {chips.map((chip, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 bg-amber-50 text-amber-950 border border-amber-900/20 text-xs font-semibold px-2.5 py-1 rounded-full shadow-2xs"
        >
          <span>{chip.label}</span>
          <button
            onClick={() => onRemove(chip.key, chip.value)}
            className="p-0.5 hover:text-red-700 rounded-full hover:bg-amber-100 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}

      <button
        onClick={onClearAll}
        className="text-xs font-bold text-red-600 hover:underline ml-1"
      >
        Limpar todos
      </button>
    </div>
  );
}
