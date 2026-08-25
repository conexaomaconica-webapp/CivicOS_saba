'use client';

import React, { useState } from 'react';
import { Navigation, Loader2, AlertCircle, Compass, Check } from 'lucide-react';
import { searchBusinessesByGeofenceAction, GeofencedBusinessItem } from '@/lib/geofencing/geofencing-service';

type GeofencingNearbyFilterProps = {
  onResultsUpdated: (items: GeofencedBusinessItem[], radiusKm: number, userLat?: number, userLng?: number) => void;
  onResetFilter: () => void;
};

const RADIUS_OPTIONS = [
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 25, label: '25 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: '100 km' },
];

export default function GeofencingNearbyFilter({
  onResultsUpdated,
  onResetFilter,
}: GeofencingNearbyFilterProps) {
  const [active, setActive] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedRadius, setSelectedRadius] = useState<number>(25);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Solicita geolocalização SOMENTE após clique explícito do usuário
  const handleActivateGeofence = () => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocalização não suportada pelo seu navegador. Utilize a busca por cidade.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        setActive(true);

        await executeGeofenceQuery(lat, lng, selectedRadius);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMsg('Acesso à localização negado. Você ainda pode pesquisar por cidade e estado normalmente.');
        } else {
          setErrorMsg('Não foi possível obter sua posição atual. Tente novamente ou busque por cidade.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const executeGeofenceQuery = async (lat: number, lng: number, radiusKm: number) => {
    setLoading(true);
    try {
      const res = await searchBusinessesByGeofenceAction({
        userLat: lat,
        userLng: lng,
        radiusKm,
        page: 1,
        pageSize: 20,
      });

      onResultsUpdated(res.items, radiusKm, lat, lng);
    } catch (_err) {
      setErrorMsg('Erro ao consultar estabelecimentos no raio informado.');
    } finally {
      setLoading(false);
    }
  };

  const handleRadiusChange = (newRadius: number) => {
    setSelectedRadius(newRadius);
    if (coords) {
      void executeGeofenceQuery(coords.lat, coords.lng, newRadius);
    }
  };

  const handleDisableGeofence = () => {
    setActive(false);
    setCoords(null);
    setErrorMsg(null);
    onResetFilter();
  };

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-[#C9A227]" />
          <span className="font-serif font-bold text-sm text-white">Explorar por Proximidade</span>
        </div>

        {!active ? (
          <button
            type="button"
            onClick={handleActivateGeofence}
            disabled={loading}
            className="px-4 py-2 bg-[#3B0B14] hover:bg-[#4B161B] text-[#C9A227] font-bold text-xs rounded-xl border border-[#C9A227]/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C9A227]" />
                <span>Buscando sua localização...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4 h-4" />
                <span>Perto de mim</span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleDisableGeofence}
            className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Desativar Raio
          </button>
        )}
      </div>

      {/* Opções de Raio quando ativo */}
      {active && (
        <div className="space-y-2 pt-2 border-t border-stone-800 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-stone-400">Selecione o Raio de Distância:</span>
            {loading && <span className="text-[10px] text-amber-300 font-mono animate-pulse">Atualizando mapa...</span>}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {RADIUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleRadiusChange(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedRadius === opt.value
                    ? 'bg-[#C9A227] text-[#3B0B14] shadow-md font-extrabold'
                    : 'bg-stone-950 text-stone-400 hover:text-white border border-stone-800'
                }`}
              >
                {selectedRadius === opt.value && <Check className="w-3.5 h-3.5" />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Erro ou Fallback para busca por Cidade */}
      {errorMsg && (
        <div className="p-3 bg-stone-950 border border-amber-800/60 rounded-xl text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}
