'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, Marker, TileLayer } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Layers, Maximize2, Minimize2 } from 'lucide-react';
import type { PublicSearchResultItem } from './DirectoryAllBusinesses';

type Props = {
  businesses: PublicSearchResultItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
};

// Centro geográfico do Brasil para fallback
const BRAZIL_CENTER: [number, number] = [-14.235, -51.925];

const STREETS_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const STREETS_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>';

const SATELLITE_TILE_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION =
  'Tiles &copy; <a href="https://www.esri.com" target="_blank" rel="noopener noreferrer">Esri</a> &mdash; Earthstar Geographics';

function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Constrói o HTML do Pin com Balão Flutuante exibindo a Logo da Empresa.
 * O balão flutua acima do ponto geográfico e a ponta inferior conecta exatamente nas coordenadas.
 */
function createMarkerHtml(b: PublicSearchResultItem, isSelected: boolean): string {
  const name = escapeHtml(b.name);
  const category = escapeHtml(b.category_name || 'Empresa');
  const initials = escapeHtml(b.name ? b.name.slice(0, 2).toUpperCase() : 'CM');

  const logoImgHtml = b.logo_url
    ? `<img src="${escapeHtml(b.logo_url)}" alt="${name}" style="width: 100%; height: 100%; object-fit: contain; object-position: center;" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />`
    : '';

  const fallbackInitialsHtml = `<div style="display: ${b.logo_url ? 'none' : 'flex'}; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; color: #5d1523; background: #fdf8eb;">${initials}</div>`;

  const borderColor = isSelected ? '#C9A227' : 'rgba(93, 21, 35, 0.25)';
  const borderWidth = isSelected ? '2.5px' : '1.5px';
  const shadow = isSelected
    ? '0 0 0 4px rgba(201, 162, 39, 0.4), 0 10px 25px rgba(0, 0, 0, 0.3)'
    : '0 4px 14px rgba(0, 0, 0, 0.18)';
  const transform = isSelected ? 'scale(1.08)' : 'scale(1)';
  const zIndex = isSelected ? '100' : '10';
  const pinDotBg = isSelected ? '#5d1523' : '#C9A227';
  const pinRingColor = isSelected ? '#C9A227' : '#ffffff';

  const benefitBadge = b.has_benefits
    ? `<div style="display: inline-flex; align-items: center; gap: 2px; margin-top: 2px; background: #fef3c7; color: #92400e; font-size: 8.5px; font-weight: 800; padding: 1px 4px; border-radius: 4px; border: 1px solid #fde68a; line-height: 1;"><span>✨ Benefício</span></div>`
    : '';

  return `
    <div class="cm-map-balloon-marker" style="position: relative; width: 170px; display: flex; flex-direction: column; align-items: center; cursor: pointer; user-select: none; z-index: ${zIndex};">
      <!-- Balão Flutuante (Floating Balloon with Logo and Name) -->
      <div style="
        background: #ffffff;
        border: ${borderWidth} solid ${borderColor};
        border-radius: 14px;
        box-shadow: ${shadow};
        padding: 4px 8px 4px 4px;
        display: flex;
        align-items: center;
        gap: 7px;
        width: 100%;
        max-width: 170px;
        box-sizing: border-box;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease, border-color 0.2s ease;
        transform: ${transform};
      ">
        <!-- Container da Logo da Empresa -->
        <div style="
          width: 32px;
          height: 32px;
          border-radius: 9px;
          overflow: hidden;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          padding: 2px;
        ">
          ${logoImgHtml}
          ${fallbackInitialsHtml}
        </div>

        <!-- Nome e Categoria da Empresa -->
        <div style="min-width: 0; flex: 1; text-align: left; overflow: hidden;">
          <div style="
            font-size: 11px;
            font-weight: 700;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.25;
            letter-spacing: -0.01em;
          ">
            ${name}
          </div>
          <div style="
            font-size: 9.5px;
            font-weight: 600;
            color: #92400e;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            line-height: 1.15;
            margin-top: 1px;
          ">
            ${category}
          </div>
          ${benefitBadge}
        </div>
      </div>

      <!-- Rabicho / Seta Triangular do Balão -->
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 7px solid ${isSelected ? '#C9A227' : '#ffffff'};
        margin-top: -1px;
        z-index: 2;
        transition: border-top-color 0.2s ease;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.12));
      "></div>

      <!-- Pino no Chão (Fixação Exata das Coordenadas) -->
      <div style="
        width: 14px;
        height: 14px;
        border-radius: 9999px;
        background: ${pinDotBg};
        border: 2.5px solid ${pinRingColor};
        box-shadow: 0 2px 6px rgba(0,0,0,0.45);
        margin-top: 1px;
        z-index: 1;
        transition: all 0.2s ease;
      "></div>
    </div>
  `;
}

export function DirectoryLeafletMap({
  businesses,
  selectedId,
  onSelect,
  isFullscreen = false,
  onToggleFullscreen,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const tileLayerRef = useRef<TileLayer | null>(null);

  const [layerType, setLayerType] = useState<'streets' | 'satellite'>('streets');

  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;

  // Filtra apenas empresas com coordenadas válidas
  const locatedBusinesses = businesses.filter(
    (b) => typeof b.latitude === 'number' && typeof b.longitude === 'number' && !isNaN(b.latitude) && !isNaN(b.longitude)
  );

  const locationsKey = locatedBusinesses.map((b) => `${b.id}:${b.latitude}:${b.longitude}`).join('|');

  const applyTileLayer = (layer: 'streets' | 'satellite') => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    if (layer === 'satellite') {
      tileLayerRef.current = L.tileLayer(SATELLITE_TILE_URL, {
        maxNativeZoom: 17,
        maxZoom: 18,
        attribution: SATELLITE_ATTRIBUTION,
      }).addTo(map);
    } else {
      tileLayerRef.current = L.tileLayer(STREETS_TILE_URL, {
        maxNativeZoom: 18,
        maxZoom: 18,
        attribution: STREETS_ATTRIBUTION,
      }).addTo(map);
    }
  };

  // Inicializa o Leaflet Map
  useEffect(() => {
    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;

    void (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(containerRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        maxZoom: 18,
        minZoom: 4,
      }).setView(BRAZIL_CENTER, 4);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapRef.current = map;
      applyTileLayer(layerType);

      // Invalida tamanho em redimensionamentos responsivos
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(containerRef.current);

      syncMarkers();
    })();

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current.clear();
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Altera camada de mapa (Ruas vs Satélite)
  useEffect(() => {
    applyTileLayer(layerType);
  }, [layerType]);

  // Invalida tamanho do mapa ao alternar tela cheia
  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  function syncMarkers() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    if (locatedBusinesses.length === 0) {
      map.setView(BRAZIL_CENTER, 4);
      return;
    }

    const bounds = L.latLngBounds([]);

    locatedBusinesses.forEach((b) => {
      const lat = b.latitude as number;
      const lng = b.longitude as number;
      const isSelected = b.id === selectedIdRef.current;

      bounds.extend([lat, lng]);

      const height = b.has_benefits ? 76 : 68;
      const icon = L.divIcon({
        html: createMarkerHtml(b, isSelected),
        className: 'cm-leaflet-div-icon',
        iconSize: [170, height],
        iconAnchor: [85, height],
      });

      const marker = L.marker([lat, lng], {
        icon,
        title: b.name,
        keyboard: true,
        zIndexOffset: isSelected ? 1000 : 10,
      });

      marker.on('click', () => {
        onSelectRef.current(b.id);
      });

      marker.addTo(map);
      markersRef.current.set(b.id, marker);
    });

    // Enquadra todas as empresas com padding confortável
    if (locatedBusinesses.length === 1) {
      const first = locatedBusinesses[0]!;
      map.setView([first.latitude as number, first.longitude as number], 15);
    } else if (locatedBusinesses.length > 1) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    }
  }

  // Atualiza marcadores quando a lista de empresas mudar
  useEffect(() => {
    syncMarkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationsKey]);

  // Atualiza destaque e animação de câmera quando selectedId mudar
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    locatedBusinesses.forEach((b) => {
      const marker = markersRef.current.get(b.id);
      if (!marker) return;

      const isSelected = b.id === selectedId;
      const height = b.has_benefits ? 76 : 68;
      const icon = L.divIcon({
        html: createMarkerHtml(b, isSelected),
        className: 'cm-leaflet-div-icon',
        iconSize: [170, height],
        iconAnchor: [85, height],
      });

      marker.setIcon(icon);
      marker.setZIndexOffset(isSelected ? 1000 : 10);

      if (isSelected) {
        map.flyTo(marker.getLatLng(), Math.min(Math.max(map.getZoom(), 15), 17), { duration: 0.6 });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  return (
    <div className="relative w-full h-full min-h-[460px] overflow-hidden">
      <style>{`
        .cm-leaflet-div-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Controles Flutuantes de Modo: Ruas vs Satélite */}
      <div className="absolute top-3 left-3 z-[400] flex items-center gap-1.5 pointer-events-auto">
        <div className="bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-lg border border-amber-900/15 flex items-center gap-1">
          <button
            type="button"
            onClick={() => setLayerType('streets')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              layerType === 'streets'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-amber-950 hover:bg-amber-50'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>Mapa</span>
          </button>
          <button
            type="button"
            onClick={() => setLayerType('satellite')}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              layerType === 'satellite'
                ? 'bg-amber-900 text-white shadow-xs'
                : 'text-gray-600 hover:text-amber-950 hover:bg-amber-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Satélite</span>
          </button>
        </div>
      </div>

      {/* Botão de Tela Cheia */}
      {onToggleFullscreen && (
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-amber-900/15 text-gray-800 hover:text-amber-900 hover:bg-white transition-all text-xs font-bold flex items-center gap-1.5 pointer-events-auto"
          title={isFullscreen ? 'Sair da tela cheia (ESC)' : 'Ver mapa em tela cheia'}
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Sair Tela Cheia</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-amber-700" />
              <span>Tela Cheia</span>
            </>
          )}
        </button>
      )}

      {/* Container do Leaflet */}
      <div
        ref={containerRef}
        className="h-full w-full relative z-0"
        role="region"
        aria-label="Mapa interativo com localização das empresas"
      />
    </div>
  );
}
