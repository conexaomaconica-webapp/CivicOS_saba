'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { MapPin, MapPinOff, Navigation, Calendar, ChevronRight } from 'lucide-react';
import type { LodgeCardData } from './LodgeCard';
import { formatMeetingDay, formatMeetingTime } from '@/lib/lodges/format';
import { canonicalPotencyCode } from '@/lib/lodges/potency';
import { LodgeLogoZoom } from './LodgeLogoZoom';
import type { MapPoint } from './BusinessLeafletMap';

const BusinessLeafletMap = dynamic(() => import('./BusinessLeafletMap').then((m) => m.BusinessLeafletMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-stone-200" aria-label="Carregando mapa" />,
});

type LodgeMapViewProps = {
  items: LodgeCardData[];
};

export function LodgeMapView({ items }: LodgeMapViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id || null);
  const selectedLodge = items.find((item) => item.id === selectedId) || items[0];

  // Um pin por loja com coordenadas válidas (o mapa usa o slug como identificador).
  const points = useMemo<MapPoint[]>(
    () =>
      items
        .map((item) => ({ slug: item.slug, name: item.name, latitude: Number(item.latitude), longitude: Number(item.longitude) }))
        .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude) && !(p.latitude === 0 && p.longitude === 0)),
    [items],
  );
  const withoutLocation = items.length - points.length;

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
              <LodgeLogoZoom
                logoUrl={lodge.logo_url}
                potency={lodge.potency}
                lodgeName={lodge.name}
                className="w-10 h-10 rounded-xl bg-white border border-stone-200 shadow-2xs p-0.5 mt-0.5"
                fallbackIconClassName="w-5 h-5 text-[#3b0b14]"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-[10px] font-bold text-amber-900">
                  {lodge.potency && <span>{canonicalPotencyCode(lodge.potency)}</span>}
                  {lodge.rite && <span>• {lodge.rite}</span>}
                </div>
                <h5 className="font-serif font-bold text-xs truncate text-[color:var(--member-primary,#5d1523)]">{lodge.name}</h5>
                <p className="text-[11px] text-stone-500 truncate">
                  {lodge.city}{lodge.state ? `, ${lodge.state}` : ''}
                  {lodge.distance_km != null && <span className="text-amber-900 font-semibold ml-1">• {lodge.distance_km} km</span>}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Direita: mapa real (Leaflet + OpenStreetMap) com um pin por loja */}
      <div className="lg:col-span-7 space-y-3">
        <div className="relative h-[340px] overflow-hidden rounded-xl border border-stone-300 bg-stone-200 sm:h-[440px] lg:h-[520px]">
          <BusinessLeafletMap
            points={points}
            selectedSlug={selectedLodge?.slug ?? null}
            onSelect={(slug) => {
              const lodge = items.find((item) => item.slug === slug);
              if (lodge) setSelectedId(lodge.id);
            }}
          />

          {withoutLocation > 0 && points.length > 0 && (
            <p className="pointer-events-none absolute left-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-stone-700 shadow">
              <MapPinOff className="h-3.5 w-3.5" aria-hidden />
              {withoutLocation} {withoutLocation === 1 ? 'loja sem localização' : 'lojas sem localização'} no mapa
            </p>
          )}

          {points.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center p-6">
              <p className="max-w-xs rounded-2xl bg-white/95 p-4 text-center text-sm font-semibold text-stone-700 shadow-lg">
                As lojas desta página ainda não têm localização no mapa. Use a lista ao lado para conhecê-las.
              </p>
            </div>
          )}
        </div>

        {selectedLodge && (
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-900">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              {selectedLodge.potency && <span className="bg-amber-50 px-2 py-0.5 rounded border border-amber-200">{canonicalPotencyCode(selectedLodge.potency)}</span>}
              {selectedLodge.rite && <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-700">{selectedLodge.rite}</span>}
            </div>

            <h4 className="font-serif font-bold text-sm text-[color:var(--member-primary,#5d1523)]">{selectedLodge.name}</h4>

            {selectedLodge.address && <p className="text-xs text-stone-600 font-sans">{selectedLodge.address}</p>}

            {selectedLodge.primary_meeting?.day && (
              <p className="text-xs text-stone-700 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-amber-800" />
                <span>Reuniões: {formatMeetingDay(selectedLodge.primary_meeting.day, selectedLodge.primary_meeting.label)} {selectedLodge.primary_meeting.time ? `• ${formatMeetingTime(selectedLodge.primary_meeting.time)}` : ''}</span>
              </p>
            )}

            <div className="pt-1 flex items-center gap-2">
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
        )}
      </div>
    </div>
  );
}
