'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker } from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = { slug: string; name: string; latitude: number; longitude: number };

type Props = {
  points: MapPoint[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
};

// Centro do Brasil, usado só quando nenhuma empresa da página tem coordenadas.
const BRAZIL_CENTER: [number, number] = [-14.2, -51.9];

function pinHtml(selected: boolean) {
  const size = selected ? 42 : 34;
  const bg = selected ? '#5d1523' : '#ffffff';
  const fg = selected ? '#ffffff' : '#5d1523';
  const ring = selected ? '0 0 0 4px rgba(201,162,39,.85), 0 8px 18px rgba(0,0,0,.35)' : '0 3px 8px rgba(0,0,0,.35)';
  return `<div style="width:${size}px;height:${size}px;border-radius:9999px;background:${bg};color:${fg};border:2px solid #5d1523;box-shadow:${ring};display:flex;align-items:center;justify-content:center;transition:all .15s">
    <svg width="${selected ? 22 : 18}" height="${selected ? 22 : 18}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
  </div>`;
}

/**
 * Mapa real (Leaflet + OpenStreetMap) com um pin por empresa que tenha coordenadas.
 * Carregado só no navegador. Os pins usam HTML próprio (sem imagens), então não dependem de arquivos de ícone.
 */
export function BusinessLeafletMap({ points, selectedSlug, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const selectedRef = useRef(selectedSlug);
  selectedRef.current = selectedSlug;

  const pointsKey = points.map((p) => `${p.slug}:${p.latitude}:${p.longitude}`).join('|');

  // Cria o mapa uma única vez.
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: true }).setView(BRAZIL_CENTER, 4);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).addTo(map);
      mapRef.current = map;
      // O contêiner muda de tamanho (layout responsivo): mantém os blocos do mapa certos.
      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(containerRef.current);
      syncMarkers();
    })();
    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function syncMarkers() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();
    points.forEach((p) => {
      const selected = p.slug === selectedRef.current;
      const marker = L.marker([p.latitude, p.longitude], {
        icon: L.divIcon({ html: pinHtml(selected), className: '', iconSize: selected ? [42, 42] : [34, 34], iconAnchor: selected ? [21, 21] : [17, 17] }),
        title: p.name,
        keyboard: true,
        zIndexOffset: selected ? 1000 : 0,
      });
      marker.on('click', () => onSelectRef.current(p.slug));
      marker.addTo(map);
      markersRef.current.set(p.slug, marker);
    });
    if (points.length === 1) {
      map.setView([points[0]!.latitude, points[0]!.longitude], 15);
    } else if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number])), { padding: [48, 48], maxZoom: 15 });
    }
  }

  // Pins novos quando a lista de empresas muda (filtro, página).
  useEffect(() => {
    syncMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointsKey]);

  // Seleção: destaca o pin e centraliza o mapa nele.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    points.forEach((p) => {
      const marker = markersRef.current.get(p.slug);
      if (!marker) return;
      const selected = p.slug === selectedSlug;
      marker.setIcon(L.divIcon({ html: pinHtml(selected), className: '', iconSize: selected ? [42, 42] : [34, 34], iconAnchor: selected ? [21, 21] : [17, 17] }));
      marker.setZIndexOffset(selected ? 1000 : 0);
      if (selected) map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 14), { duration: 0.5 });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSlug]);

  return <div ref={containerRef} className="h-full w-full" role="region" aria-label="Mapa das empresas" />;
}
