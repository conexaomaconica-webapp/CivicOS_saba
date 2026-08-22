'use client';

import React, { useState } from 'react';
import { Landmark, MapPin, Calendar, Navigation, Info, Filter } from 'lucide-react';

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
  lodges?: PublicMasonicLodgeItem[];
  availableCities?: string[];
  onFilterChange?: (filters: { city?: string; potency?: string; rite?: string }) => void;
};

export function DirectoryLodgesGuide({
  lodges = [],
  availableCities = [],
  onFilterChange,
}: DirectoryLodgesGuideProps) {
  const [city, setCity] = useState('');
  const [potency, setPotency] = useState('');
  const [rite, setRite] = useState('');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (onFilterChange) {
      onFilterChange({ city, potency, rite });
    }
  };

  return (
    <section className="dh-container my-14" id="lojas">
      <div>
        <h2 className="dh-section-title">Guia de Lojas Maçônicas</h2>
        <p className="text-xs text-gray-500 mt-1">
          Encontre lojas, orientes e informações para sua visita institucional.
        </p>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleApply} className="dh-filter-bar my-6">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="dh-filter-select"
          >
            <option value="">Todas as Cidades</option>
            {availableCities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={potency}
            onChange={(e) => setPotency(e.target.value)}
            className="dh-filter-select"
          >
            <option value="">Todas as Potências</option>
            <option value="GLEB">GLEB</option>
            <option value="GOB">GOB</option>
            <option value="GLMMG">GLMMG</option>
            <option value="COMAB">COMAB</option>
          </select>

          <select
            value={rite}
            onChange={(e) => setRite(e.target.value)}
            className="dh-filter-select"
          >
            <option value="">Todos os Ritos</option>
            <option value="Rito Escocês Antigo e Aceito">Rito Escocês Antigo e Aceito</option>
            <option value="Rito Moderno">Rito Moderno</option>
            <option value="Rito Brasileiro">Rito Brasileiro</option>
            <option value="Rito York">Rito York</option>
          </select>
        </div>

        <button
          type="submit"
          className="bg-amber-900 text-white font-bold text-xs px-4 py-2 rounded-md hover:bg-amber-800 transition-colors flex items-center gap-1.5"
        >
          <Filter className="w-3.5 h-3.5" /> Aplicar filtros
        </button>
      </form>

      {/* Cards Grid */}
      {lodges.length === 0 ? (
        <div className="bg-white border rounded-xl p-8 text-center text-xs text-gray-500">
          Nenhuma Loja Maçônica encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {lodges.map((lodge) => {
            const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              lodge.latitude != null && lodge.longitude != null
                ? `${lodge.latitude},${lodge.longitude}`
                : `${lodge.name}, ${lodge.address || lodge.city || 'Brasil'}`
            )}`;

            return (
              <div key={lodge.id} className="dh-lodge-card">
                <div>
                  <div className="w-12 h-12 bg-amber-50 text-amber-900 rounded-xl flex items-center justify-center mb-4 border border-amber-200">
                    <Landmark className="w-6 h-6" />
                  </div>

                  <h3 className="font-bold text-gray-900 text-base">
                    {lodge.name} {lodge.code_number ? `nº ${lodge.code_number}` : ''}
                  </h3>
                  
                  {lodge.potency && (
                    <span className="inline-block mt-1 text-[11px] font-bold text-amber-900 bg-amber-100/60 px-2 py-0.5 rounded">
                      {lodge.potency}
                    </span>
                  )}

                  <div className="space-y-1.5 mt-4 text-xs text-gray-600">
                    {lodge.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{lodge.city}{lodge.state ? `, ${lodge.state}` : ''}</span>
                      </div>
                    )}
                    {lodge.meeting_schedule && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span>{lodge.meeting_schedule}</span>
                      </div>
                    )}
                    {lodge.rite && (
                      <div className="flex items-center gap-1.5 text-gray-500">
                        <span>Rito: <strong>{lodge.rite}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => alert(`Informações da loja: ${lodge.name}\nPotência: ${lodge.potency || 'N/A'}\nReuniões: ${lodge.meeting_schedule || 'N/A'}`)}
                    className="flex items-center justify-center gap-1 text-xs font-bold text-gray-700 bg-gray-50 border border-gray-200 py-2 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    <Info className="w-3.5 h-3.5" /> Ver informações
                  </button>
                  
                  <a
                    href={mapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1 text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 py-2 rounded-md hover:bg-amber-100 transition-colors"
                  >
                    <Navigation className="w-3.5 h-3.5 text-amber-800" /> Traçar rota
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
