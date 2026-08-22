'use client';

import React from 'react';
import { Filter, RotateCcw, MapPin, Building2, Crown, ShieldCheck, Award, Users, Navigation } from 'lucide-react';

export type FilterState = {
  state?: string;
  city?: string;
  category?: string;
  relationships: string[];
  recognitions: string[];
  plans: string[];
  verified: boolean;
  maxDistanceKm?: number;
};

type BusinessFiltersProps = {
  filters: FilterState;
  availableCities?: string[];
  categories?: { id: string; slug: string; name: string }[];
  onChange: (newFilters: FilterState) => void;
  onClear: () => void;
  onApply?: () => void;
  isMobileDrawer?: boolean;
  onCloseMobile?: () => void;
};

export function BusinessFilters({
  filters,
  availableCities = [],
  categories = [],
  onChange,
  onClear,
  onApply,
  isMobileDrawer = false,
  onCloseMobile,
}: BusinessFiltersProps) {
  const handleToggleArrayItem = (key: 'relationships' | 'recognitions' | 'plans', item: string) => {
    const current = filters[key] || [];
    const exists = current.includes(item);
    const updated = exists ? current.filter((x) => x !== item) : [...current, item];
    onChange({ ...filters, [key]: updated });
  };

  const containerClasses = isMobileDrawer
    ? 'p-5 space-y-6'
    : 'bg-white border border-stone-200 rounded-2xl p-5 shadow-2xs space-y-6';

  return (
    <div className={containerClasses}>
      <div className="flex items-center justify-between border-b border-stone-100 pb-3">
        <div className="flex items-center gap-2 font-serif font-bold text-gray-900 text-base">
          <Filter className="w-4 h-4 text-amber-900" />
          <span>Filtrar Empresas</span>
        </div>

        <button
          onClick={onClear}
          className="text-xs font-semibold text-stone-500 hover:text-red-700 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Limpar
        </button>
      </div>

      {/* 1. Localização (Cidade & Distância) */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-amber-900" /> Cidade
        </label>
        <select
          value={filters.city || ''}
          onChange={(e) => onChange({ ...filters, city: e.target.value || undefined })}
          className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs text-gray-900 outline-none focus:border-amber-900 transition-colors"
        >
          <option value="">Todas as Cidades</option>
          {availableCities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        {/* Raio de Distância */}
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 pt-2">
          <Navigation className="w-3.5 h-3.5 text-amber-900" /> Distância Máxima
        </label>
        <select
          value={filters.maxDistanceKm || ''}
          onChange={(e) => onChange({ ...filters, maxDistanceKm: e.target.value ? Number(e.target.value) : undefined })}
          className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs text-gray-900 outline-none focus:border-amber-900 transition-colors"
        >
          <option value="">Qualquer distância</option>
          <option value="2">Até 2 km</option>
          <option value="5">Até 5 km</option>
          <option value="10">Até 10 km</option>
          <option value="25">Até 25 km</option>
          <option value="50">Até 50 km</option>
        </select>
      </div>

      {/* 2. Categoria */}
      <div className="space-y-3 border-t border-stone-100 pt-4">
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-amber-900" /> Categoria
        </label>
        <select
          value={filters.category || ''}
          onChange={(e) => onChange({ ...filters, category: e.target.value || undefined })}
          className="w-full bg-stone-50 border border-stone-300 rounded-xl p-2.5 text-xs text-gray-900 outline-none focus:border-amber-900 transition-colors"
        >
          <option value="">Todas as Categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* 3. Vínculo Maçônico */}
      <div className="space-y-2 border-t border-stone-100 pt-4">
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-amber-900" /> Vínculo Maçônico
        </label>

        {[
          { id: 'brother', label: 'Irmão' },
          { id: 'wife', label: 'Cunhada' },
          { id: 'child', label: 'Sobrinho(a)' },
          { id: 'representative', label: 'Representante' },
        ].map((rel) => (
          <label key={rel.id} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer hover:text-amber-900">
            <input
              type="checkbox"
              checked={filters.relationships.includes(rel.id)}
              onChange={() => handleToggleArrayItem('relationships', rel.id)}
              className="rounded text-amber-900 focus:ring-amber-800"
            />
            <span>{rel.label}</span>
          </label>
        ))}
      </div>

      {/* 4. Reconhecimento Institucional */}
      <div className="space-y-2 border-t border-stone-100 pt-4">
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Crown className="w-3.5 h-3.5 text-amber-900" /> Reconhecimento Especial
        </label>

        {[
          { id: 'pedra_fundamental', label: 'Pedra Fundamental' },
          { id: 'coluna_honra', label: 'Coluna de Honra' },
        ].map((rec) => (
          <label key={rec.id} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer hover:text-amber-900">
            <input
              type="checkbox"
              checked={filters.recognitions.includes(rec.id)}
              onChange={() => handleToggleArrayItem('recognitions', rec.id)}
              className="rounded text-amber-900 focus:ring-amber-800"
            />
            <span>{rec.label}</span>
          </label>
        ))}
      </div>

      {/* 5. Plano Comercial */}
      <div className="space-y-2 border-t border-stone-100 pt-4">
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Award className="w-3.5 h-3.5 text-amber-900" /> Plano Comercial
        </label>

        {[
          { id: 'ouro', label: 'Plano Ouro' },
          { id: 'prata', label: 'Plano Prata' },
          { id: 'bronze', label: 'Plano Bronze' },
        ].map((plan) => (
          <label key={plan.id} className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer hover:text-amber-900">
            <input
              type="checkbox"
              checked={filters.plans.includes(plan.id)}
              onChange={() => handleToggleArrayItem('plans', plan.id)}
              className="rounded text-amber-900 focus:ring-amber-800"
            />
            <span>{plan.label}</span>
          </label>
        ))}
      </div>

      {/* 6. Confiança */}
      <div className="space-y-2 border-t border-stone-100 pt-4">
        <label className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-900" /> Confiança
        </label>

        <label className="flex items-center gap-2 text-xs text-stone-700 cursor-pointer hover:text-amber-900">
          <input
            type="checkbox"
            checked={filters.verified}
            onChange={(e) => onChange({ ...filters, verified: e.target.checked })}
            className="rounded text-amber-900 focus:ring-amber-800"
          />
          <span>Empresa verificada</span>
        </label>
      </div>

      {/* Mobile Drawer Action Buttons */}
      {isMobileDrawer && (
        <div className="pt-4 border-t border-stone-200 flex gap-2">
          <button
            onClick={onClear}
            className="flex-1 text-xs font-bold border border-stone-300 py-2.5 rounded-xl text-stone-700 hover:bg-stone-100"
          >
            Limpar
          </button>
          <button
            onClick={() => {
              if (onApply) onApply();
              if (onCloseMobile) onCloseMobile();
            }}
            className="flex-1 text-xs font-bold bg-[#3b0b14] text-white py-2.5 rounded-xl hover:bg-[#5d1523]"
          >
            Aplicar Filtros
          </button>
        </div>
      )}
    </div>
  );
}
