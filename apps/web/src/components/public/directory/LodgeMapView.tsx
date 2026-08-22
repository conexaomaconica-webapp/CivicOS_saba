'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Landmark, MapPin, Navigation, Calendar, ChevronRight } from 'lucide-react';
import type { LodgeCardData } from './LodgeCard';

type LodgeMapViewProps = {
  items: LodgeCardData[];
};

export function LodgeMapView({ items }: LodgeMapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);
  const selectedLodge = items.find((item) => item.id === selectedId) || items[0];

  const mapsUrl = selectedLodge?.latitude && selectedLodge?.longitude
    ? `https://www.google.com/maps/search/?api=1&query=${selectedLodge.latitude},${selectedLodge.longitude}`
    : selectedLodge?.address && selectedLodge?.city
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedLodge.name}, ${selectedLodge.address}, ${selectedLodge.city}`)}`
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm p-4">
      {/* Esquerda: Lista de Seleção (5 colunas no desktop) */}
      <div className="lg:col-span-5 space-y-3 max-h-[600px] overflow-y-auto pr-1">
        <h4 className="font-serif font-bold text-gray-900 text-sm border-b pb-2 flex items-center justify-between">
          <span>Lojas na Região</span>
          <span className="text-amber-900 text-xs font-sans font-semibold">{items.length} encontradas</span>
        </h4>

        {items.map((lodge) => {
          const isSelected = lodge.id === selectedId;
          return (
            <div
              key={lodge.id}
              onClick={() => setSelectedId(lodge.id)}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                isSelected
                  ? 'border-[#3b0b14] bg-amber-50/50 shadow-xs'
                  : 'border-stone-200 hover:border-amber-300 hover:bg-stone-50'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-white border border-stone-200 shadow-2xs flex items-center justify-center shrink-0 overflow-hidden mt-0.5">
                {lodge.logo_url ? (
                  <img src={lodge.logo_url} alt={lodge.name} className="w-full h-full object-cover" />
                ) : (
                  <Landmark className="w-5 h-5 text-[#3b0b14]" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900">
                  {lodge.potency && <span>{lodge.potency}</span>}
                  {lodge.rite && <span>• {lodge.rite}</span>}
                </div>
                <h5 className="font-serif font-bold text-gray-900 text-xs truncate">{lodge.name}</h5>
                <p className="text-[11px] text-stone-500 truncate">
                  {lodge.city}{lodge.state ? `, ${lodge.state}` : ''}
                  {lodge.distance_km != null && <span className="text-amber-900 font-semibold ml-1">• {lodge.distance_km} km</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direita: Mapa Interativo Visual (7 colunas no desktop) */}
      <div className="lg:col-span-7 bg-stone-100 rounded-xl relative min-h-[400px] lg:min-h-[550px] flex flex-col justify-between overflow-hidden border border-stone-200">
        {/* Background do Mapa Estilizado */}
        <div className="absolute inset-0 bg-cover bg-center opacity-65 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]" />

        {/* Header do Mapa */}
        <div className="relative z-10 p-3 bg-white/90 backdrop-blur-xs border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800">
            <MapPin className="w-4 h-4 text-amber-900" />
            <span>Visualização de Mapa</span>
          </div>
          {selectedLodge && (
            <span className="text-[11px] font-medium text-stone-500">
              {selectedLodge.city}, {selectedLodge.state}
            </span>
          )}
        </div>

        {/* Pin central destacado */}
        {selectedLodge && (
          <div className="relative z-10 my-auto mx-auto text-center animate-fade-in">
            <div className="relative inline-block">
              <div className="w-12 h-12 bg-[#3b0b14] text-white rounded-full flex items-center justify-center mx-auto shadow-xl border-2 border-amber-400 animate-bounce">
                <Landmark className="w-6 h-6" />
              </div>
              <div className="w-4 h-4 bg-amber-400 rotate-45 mx-auto -mt-2 shadow-md" />
            </div>

            {/* Popup Info Card */}
            <div className="mt-3 bg-white/95 backdrop-blur-md border border-stone-200 rounded-2xl p-4 shadow-xl max-w-sm mx-auto text-left space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900">
                {selectedLodge.potency && <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{selectedLodge.potency}</span>}
                {selectedLodge.rite && <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">{selectedLodge.rite}</span>}
              </div>

              <h4 className="font-serif font-bold text-gray-900 text-sm">{selectedLodge.name}</h4>
              
              {selectedLodge.address && (
                <p className="text-xs text-stone-600 font-sans">{selectedLodge.address}</p>
              )}

              {selectedLodge.primary_meeting?.day && (
                <p className="text-xs text-stone-700 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-amber-800" />
                  <span>Reuniões: {selectedLodge.primary_meeting.day} {selectedLodge.primary_meeting.time ? `• ${selectedLodge.primary_meeting.time}` : ''}</span>
                </p>
              )}

              <div className="pt-2 flex items-center gap-2">
                <Link
                  href={`/guia/lojas/${selectedLodge.slug}`}
                  className="flex-1 bg-[#3b0b14] text-white text-xs font-bold py-2 px-3 rounded-xl hover:bg-[#5d1523] transition-colors text-center flex items-center justify-center gap-1"
                >
                  <span>Ver Loja</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>

                {mapsUrl && (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-amber-900 text-white text-xs font-semibold py-2 px-3 rounded-xl hover:bg-amber-800 transition-colors flex items-center justify-center gap-1"
                  >
                    <Navigation className="w-3.5 h-3.5" />
                    <span>Como chegar</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer do Mapa */}
        <div className="relative z-10 p-3 bg-white/90 backdrop-blur-xs border-t border-stone-200 text-center text-xs text-stone-500">
          Selecione uma loja na lista para visualizar detalhes de localização no mapa.
        </div>
      </div>
    </div>
  );
}
