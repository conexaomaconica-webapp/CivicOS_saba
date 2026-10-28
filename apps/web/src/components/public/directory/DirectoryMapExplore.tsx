'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  Navigation,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Compass,
  ChevronDown,
  ChevronUp,
  X,
  Gift,
} from 'lucide-react';
import type { PublicSearchResultItem } from './DirectoryAllBusinesses';

const DirectoryLeafletMap = dynamic(
  () => import('./DirectoryLeafletMap').then((m) => m.DirectoryLeafletMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[460px] flex flex-col items-center justify-center bg-slate-100 text-amber-900 gap-2 p-6 text-center">
        <Compass className="w-8 h-8 text-amber-800 animate-spin" />
        <span className="text-xs font-semibold">Carregando mapa interativo com as empresas...</span>
      </div>
    ),
  }
);

type DirectoryMapExploreProps = {
  businesses?: PublicSearchResultItem[];
  selectedCity?: string | null;
};

export function DirectoryMapExplore({ businesses = [], selectedCity }: DirectoryMapExploreProps) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'beneficios' | 'eventos'>('empresas');
  const [selectedBizId, setSelectedBizId] = useState<string | null>(businesses[0]?.id || null);
  const [isCardMinimized, setIsCardMinimized] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fecha tela cheia ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 150);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 150);
      return next;
    });
  };

  const totalCount = businesses.length;
  const benefitsCount = businesses.filter((b) => Boolean(b.has_benefits)).length;
  const eventsCount = businesses.filter((b) => Boolean(b.has_events)).length;

  // Filter businesses by active tab
  const displayList = businesses.filter((b) => {
    if (activeTab === 'beneficios') return Boolean(b.has_benefits);
    if (activeTab === 'eventos') return Boolean(b.has_events);
    return true;
  });

  const selectedBiz =
    displayList.find((b) => b.id === selectedBizId) ||
    businesses.find((b) => b.id === selectedBizId) ||
    displayList[0] ||
    businesses[0] ||
    null;

  const locationQuery = (b: PublicSearchResultItem): string => {
    if (b.latitude != null && b.longitude != null) return `${b.latitude},${b.longitude}`;
    if (b.address_line) return b.address_line;
    return `${b.name}, ${[b.city, b.state].filter(Boolean).join(' - ') || selectedCity || 'Brasil'}`;
  };

  const handleTravarRota = (b: PublicSearchResultItem) => {
    const query = locationQuery(b);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`, '_blank');
  };

  const handleSelectBiz = (id: string) => {
    setSelectedBizId(id);
    setIsCardMinimized(false);
  };

  return (
    <section className="dh-container py-4" id="mapa">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h2 className="dh-section-title flex items-center gap-2">
            <Compass className="w-7 h-7 text-amber-900" />
            <span>Explore no Mapa</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Encontre empresas da Conexão Maçônica por localização e descubra quem está mais perto de você.
          </p>
        </div>
        {selectedCity && (
          <div className="text-xs font-semibold text-amber-900 bg-amber-900/10 border border-amber-900/20 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start sm:self-auto">
            <MapPin className="w-3.5 h-3.5" />
            <span>Filtrado por: {selectedCity}</span>
          </div>
        )}
      </div>

      <div
        className={
          isFullscreen
            ? 'fixed inset-0 z-[9999] w-screen h-screen bg-slate-900 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 overflow-hidden'
            : 'dh-map-box shadow-md rounded-2xl overflow-hidden border border-amber-900/10 mt-5'
        }
      >
        {/* Banner Indicador de Tela Cheia */}
        {isFullscreen && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[500] bg-slate-900/90 text-white border border-amber-500/40 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md animate-fade-in">
            <span className="text-xs font-semibold text-amber-200">⛶ Modo Tela Cheia — Pressione ESC para sair</span>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-1 hover:bg-white/20 rounded-full text-white transition-colors"
              title="Fechar tela cheia"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Container do Mapa Interativo com Leaflet e Pins com Balões */}
        <div
          className={`relative h-full bg-slate-100 flex flex-col justify-between p-0 border-r border-gray-200 overflow-hidden ${
            isFullscreen ? 'md:col-span-2 lg:col-span-3 min-h-[460px]' : 'min-h-[460px]'
          }`}
        >
          <DirectoryLeafletMap
            businesses={displayList}
            selectedId={selectedBiz?.id || null}
            onSelect={handleSelectBiz}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />

          {/* Badge Minimizado da Empresa Selecionada */}
          {selectedBiz && isCardMinimized && (
            <div className="relative z-20 m-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-amber-900/15 shadow-lg flex items-center gap-2 self-end mt-auto transition-all animate-fade-in pointer-events-auto">
              <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="text-xs font-bold text-gray-900 truncate max-w-[140px]">{selectedBiz.name}</span>
              <button
                type="button"
                onClick={() => setIsCardMinimized(false)}
                className="p-1 hover:bg-amber-100 rounded-full text-amber-950 transition-colors flex items-center gap-1 text-[11px] font-bold"
                title="Expandir detalhes da rota"
              >
                <span>Expandir</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Card Flutuante de Detalhes da Empresa Selecionada no Canto Inferior Direito do Mapa */}
          {selectedBiz && !isCardMinimized && (
            <div className="relative z-20 m-3 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-amber-900/15 shadow-xl max-w-[310px] self-end mt-auto transition-all animate-fade-in pointer-events-auto">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-amber-950 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs shadow-2xs p-1">
                    {selectedBiz.logo_url ? (
                      <img src={selectedBiz.logo_url} alt={selectedBiz.name} className="max-w-full max-h-full object-contain object-center" />
                    ) : (
                      selectedBiz.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-xs truncate flex items-center gap-1">
                      <span className="truncate">{selectedBiz.name}</span>
                      {selectedBiz.is_verified && (
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                      {selectedBiz.category_name || 'Serviços'} {selectedBiz.city ? `· ${selectedBiz.city}` : ''}
                    </p>
                    {selectedBiz.has_benefits && (
                      <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/80">
                        <Gift className="w-3 h-3 text-amber-700 shrink-0" />
                        <span>Benefício Exclusivo</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCardMinimized(true)}
                  className="p-1 hover:bg-amber-100/60 rounded-lg text-gray-400 hover:text-amber-900 transition-colors shrink-0"
                  title="Minimizar janela"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTravarRota(selectedBiz)}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-50 text-amber-900 border border-amber-900/20 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-700" />
                  <span>Traçar Rota</span>
                </button>
                <Link
                  href={`/guia/${selectedBiz.slug}?src=map`}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-800 transition-colors shadow-2xs"
                >
                  <span>Ver Perfil</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar com Lista Interativa de Empresas */}
        <div
          className={`p-5 bg-white flex flex-col justify-between border-l border-gray-100 ${
            isFullscreen ? 'md:col-span-1 h-full overflow-y-auto' : ''
          }`}
        >
          <div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-gray-700">
                <strong className="text-amber-900 text-sm">{displayList.length}</strong> de {businesses.length} empresas
              </span>
              {isFullscreen && (
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="text-xs text-amber-900 font-bold hover:underline flex items-center gap-1"
                >
                  <span>Fechar</span>
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Abas de Filtro da Sidebar com Contadores */}
            <div className="flex gap-1 my-3 bg-gray-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('empresas')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'empresas' ? 'bg-amber-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Todas</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'empresas' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {totalCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('beneficios')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'beneficios' ? 'bg-amber-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Benefícios</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === 'beneficios' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                  }`}
                >
                  {benefitsCount}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('eventos')}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'eventos' ? 'bg-amber-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Eventos</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    activeTab === 'eventos' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {eventsCount}
                </span>
              </button>
            </div>

            {/* Lista Scrollável de Empresas */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {displayList.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  {activeTab === 'beneficios'
                    ? 'Nenhuma empresa com benefício exclusivo cadastrado nesta região no momento.'
                    : activeTab === 'eventos'
                    ? 'Nenhum evento fraterno agendado nesta região no momento.'
                    : 'Nenhuma empresa encontrada nesta região.'}
                </div>
              ) : (
                displayList.map((b) => {
                  const isSelected = selectedBiz?.id === b.id;
                  const hasCoordinates = typeof b.latitude === 'number' && typeof b.longitude === 'number';
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleSelectBiz(b.id)}
                      className={`p-2.5 border rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-1 ring-amber-400'
                          : 'hover:bg-gray-50 border-gray-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-amber-950 font-bold flex items-center justify-center shrink-0 overflow-hidden text-[11px] p-0.5">
                          {b.logo_url ? (
                            <img src={b.logo_url} alt={b.name} className="max-w-full max-h-full object-contain object-center" />
                          ) : (
                            b.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-gray-900 text-xs truncate flex items-center gap-1">
                            <span className="truncate">{b.name}</span>
                            {b.is_verified && <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />}
                          </h5>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <p className="text-[11px] text-gray-500 truncate">
                              {b.category_name || 'Serviços'} {b.city ? `· ${b.city}` : ''}
                            </p>
                            {b.has_benefits && (
                              <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/90 px-1.5 py-0.2 rounded border border-amber-300/60 shrink-0">
                                🎁 Benefício
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold shrink-0 ml-2 ${isSelected ? 'text-amber-900' : 'text-gray-500'}`}>
                        {isSelected ? 'No Mapa' : hasCoordinates ? 'Ver' : 'Sem GPS'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 mt-3">
            <Link
              href="/guia/empresas"
              className="w-full text-center block text-xs font-bold bg-amber-900 text-white py-2.5 rounded-xl hover:bg-amber-800 transition-colors shadow-2xs"
            >
              Ver todas as empresas da rede
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

