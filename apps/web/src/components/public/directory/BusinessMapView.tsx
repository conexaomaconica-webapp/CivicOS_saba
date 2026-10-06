'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Crown, ExternalLink, Heart, MapPin, MapPinOff, Navigation, Share2, ShieldCheck, Award, X } from 'lucide-react';
import { useFavorites } from '@/lib/directory/favorites-context';
import { CardReferModal } from './CardReferModal';
import type { BusinessCardData } from './BusinessCard';
import type { MapPoint } from './BusinessLeafletMap';

const BusinessLeafletMap = dynamic(() => import('./BusinessLeafletMap').then((m) => m.BusinessLeafletMap), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-stone-200" aria-label="Carregando mapa" />,
});

type BusinessMapViewProps = {
  items: BusinessCardData[];
};

function planBadge(code?: string | null) {
  const plan = (code || '').toLowerCase().trim();
  if (['ouro', 'gold', 'ouro_founder', 'acacia'].includes(plan)) return { label: 'Acácia', cls: 'bg-[#fdf8eb] text-[#855e10] border-[#e8d7ad]', Icon: Crown };
  if (['prata', 'silver', 'compasso'].includes(plan)) return { label: 'Compasso', cls: 'bg-slate-100 text-slate-800 border-slate-300', Icon: Award };
  return { label: 'Esquadro', cls: 'bg-orange-50 text-amber-900 border-orange-200', Icon: ShieldCheck };
}

const hasCoords = (b: BusinessCardData) => typeof b.latitude === 'number' && typeof b.longitude === 'number';

function MapResultCard({
  biz,
  selected,
  onSelect,
}: {
  biz: BusinessCardData;
  selected: boolean;
  onSelect: () => void;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const [referOpen, setReferOpen] = useState(false);
  const favorited = isFavorite(biz.slug);
  const badge = planBadge(biz.effective_plan_code);
  const located = hasCoords(biz);
  const place = [biz.city, biz.state].filter(Boolean).join(', ');

  return (
    <article
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border bg-white p-3.5 shadow-2xs transition-all hover:shadow-md ${
        selected ? 'border-[#5d1523] ring-2 ring-amber-400' : 'border-stone-200'
      }`}
    >
      {referOpen && (
        <CardReferModal businessId={biz.id} businessName={biz.name} businessSlug={biz.slug} source="directory_list" onClose={() => setReferOpen(false)} />
      )}
      <div className="flex items-start gap-3.5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-white p-1">
          {biz.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={biz.logo_url} alt={biz.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-sm font-bold text-amber-700">{biz.name.slice(0, 2).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="font-serif text-sm font-bold text-stone-900">{biz.name}</h3>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
              <badge.Icon className="h-3 w-3" aria-hidden />
              {badge.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-stone-500">
            {biz.category_name && <span className="font-semibold text-amber-900">{biz.category_name}</span>}
            {place && <span>{biz.category_name ? ' · ' : ''}{place}</span>}
            {typeof biz.distance_km === 'number' && <span> · {biz.distance_km.toFixed(1).replace('.', ',')} km</span>}
          </p>
          {!located && (
            <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-stone-400">
              <MapPinOff className="h-3 w-3" aria-hidden /> Localização ainda não cadastrada
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleFavorite(biz.slug); }}
            aria-pressed={favorited}
            title={favorited ? 'Remover dos favoritos' : 'Favoritar'}
            className={`inline-flex min-h-9 items-center gap-1 rounded-xl border px-2.5 text-xs font-semibold ${
              favorited ? 'border-red-200 bg-red-50 text-red-700' : 'border-stone-300 bg-white text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Heart className={`h-3.5 w-3.5 ${favorited ? 'fill-red-600 text-red-600' : ''}`} />
            <span className="hidden sm:inline">{favorited ? 'Favoritado' : 'Favoritar'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setReferOpen(true); }}
            title="Indicar empresa"
            aria-label="Indicar empresa"
            className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Indicar</span>
          </button>
        </div>
        <div className="flex items-center gap-1.5">
          {located && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onSelect(); }}
              className="inline-flex min-h-9 items-center gap-1 rounded-xl border border-stone-300 bg-white px-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden /> No mapa
            </button>
          )}
          <Link
            href={`/guia/${biz.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex min-h-9 items-center rounded-xl border border-[#5d1523] px-3 text-xs font-bold text-[#5d1523] hover:bg-[#5d1523] hover:text-white"
          >
            Ver empresa
          </Link>
        </div>
      </div>
    </article>
  );
}

export function BusinessMapView({ items }: BusinessMapViewProps) {
  const points: MapPoint[] = useMemo(
    () => items.filter(hasCoords).map((b) => ({ slug: b.slug, name: b.name, latitude: b.latitude as number, longitude: b.longitude as number })),
    [items]
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(points[0]?.slug ?? null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Lista nova (filtro/página): garante uma seleção válida.
  useEffect(() => {
    if (selectedSlug && !items.some((b) => b.slug === selectedSlug)) setSelectedSlug(points[0]?.slug ?? null);
  }, [items, points, selectedSlug]);

  // Escolher um pin leva a lista até a empresa.
  useEffect(() => {
    if (selectedSlug) cardRefs.current.get(selectedSlug)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [selectedSlug]);

  const selectedBiz = items.find((b) => b.slug === selectedSlug) || null;
  const withoutLocation = items.length - points.length;

  const openRoute = (biz: BusinessCardData) => {
    const target = hasCoords(biz)
      ? `https://www.google.com/maps/dir/?api=1&destination=${biz.latitude},${biz.longitude}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.name} ${biz.city ?? ''}`)}`;
    window.open(target, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="my-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Mapa: em cima no celular; à direita (fixo na rolagem) no computador */}
      <div className="order-1 lg:order-2 lg:col-span-7">
        <div className="relative h-[340px] overflow-hidden rounded-2xl border border-stone-300 bg-stone-200 shadow-md sm:h-[440px] lg:sticky lg:top-24 lg:h-[calc(100vh-9rem)] lg:max-h-[720px]">
          <BusinessLeafletMap points={points} selectedSlug={selectedSlug} onSelect={setSelectedSlug} />

          {withoutLocation > 0 && points.length > 0 && (
            <p className="pointer-events-none absolute left-3 top-3 z-[500] inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-stone-700 shadow">
              <MapPinOff className="h-3.5 w-3.5" aria-hidden />
              {withoutLocation} {withoutLocation === 1 ? 'empresa sem localização' : 'empresas sem localização'} no mapa
            </p>
          )}

          {points.length === 0 && (
            <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center p-6">
              <p className="max-w-xs rounded-2xl bg-white/95 p-4 text-center text-sm font-semibold text-stone-700 shadow-lg">
                As empresas desta página ainda não têm localização no mapa. Use a lista ao lado para conhecê-las.
              </p>
            </div>
          )}

          {selectedBiz && (
            <div className="absolute inset-x-3 bottom-3 z-[500] rounded-2xl border border-stone-300 bg-white p-3.5 text-left shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="line-clamp-1 font-serif text-sm font-bold text-gray-900">{selectedBiz.name}</h4>
                  <p className="line-clamp-1 text-xs text-stone-500">
                    {[selectedBiz.category_name, [selectedBiz.city, selectedBiz.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button type="button" onClick={() => setSelectedSlug(null)} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700" aria-label="Fechar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openRoute(selectedBiz)}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-900/20 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950 hover:bg-amber-100"
                >
                  <Navigation className="h-3.5 w-3.5 text-amber-800" /> Traçar rota
                </button>
                <Link
                  href={`/guia/${selectedBiz.slug}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#3b0b14] px-3 py-2 text-xs font-bold text-white hover:bg-[#5d1523]"
                >
                  Ver empresa <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de empresas: abaixo do mapa no celular; à esquerda, com rolagem própria, no computador */}
      <div className="order-2 lg:order-1 lg:col-span-5">
        <div className="space-y-3 lg:max-h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-1 xl:max-h-[720px]">
          {items.map((biz) => (
            <div
              key={biz.id}
              ref={(el) => {
                if (el) cardRefs.current.set(biz.slug, el);
                else cardRefs.current.delete(biz.slug);
              }}
            >
              <MapResultCard biz={biz} selected={selectedSlug === biz.slug} onSelect={() => setSelectedSlug(biz.slug)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
