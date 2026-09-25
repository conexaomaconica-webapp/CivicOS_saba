'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation, MapPin, ExternalLink, ShieldCheck, Compass, ChevronDown, ChevronUp } from 'lucide-react';
import type { PublicSearchResultItem } from './DirectoryAllBusinesses';

type DirectoryMapExploreProps = {
  businesses?: PublicSearchResultItem[];
  selectedCity?: string | null;
};

export function DirectoryMapExplore({ businesses = [], selectedCity }: DirectoryMapExploreProps) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'beneficios' | 'eventos'>('empresas');
  const [selectedBizId, setSelectedBizId] = useState<string | null>(businesses[0]?.id || null);
  const [isCardMinimized, setIsCardMinimized] = useState(false);

  // Filter businesses by active tab
  const displayList = businesses.filter((b) => {
    if (activeTab === 'beneficios') return Boolean(b.has_benefits);
    return true;
  });

  const selectedBiz =
    displayList.find((b) => b.id === selectedBizId) ||
    businesses.find((b) => b.id === selectedBizId) ||
    displayList[0] ||
    businesses[0] ||
    null;

  const mapQuery = selectedBiz
    ? `${selectedBiz.name}, ${selectedBiz.city || selectedCity || 'Brasil'}`
    : selectedCity
    ? `Empresas em ${selectedCity}`
    : 'Brasil';

  const embedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&t=&z=14&ie=UTF8&iwloc=&output=embed`;

  const handleTravarRota = (b: PublicSearchResultItem) => {
    const query = `${b.name}, ${b.city || ''} ${b.state || ''}`;
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
            Localização geográfica e raio de atuação das empresas cadastradas na nossa rede.
          </p>
        </div>
        {selectedCity && (
          <div className="text-xs font-semibold text-amber-900 bg-amber-900/10 border border-amber-900/20 px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 self-start sm:self-auto">
            <MapPin className="w-3.5 h-3.5" />
            <span>Filtrado por: {selectedCity}</span>
          </div>
        )}
      </div>

      <div className="dh-map-box shadow-md rounded-2xl overflow-hidden border border-amber-900/10 mt-5">
        {/* Container do Mapa Interativo com Iframe */}
        <div className="relative min-h-[460px] bg-slate-100 flex flex-col justify-between p-0 border-r border-gray-200">
          {/* Iframe Google Maps */}
          <iframe
            title="Mapa de empresas e parceiros"
            width="100%"
            height="100%"
            style={{ border: 0, minHeight: '460px' }}
            loading="lazy"
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            src={embedUrl}
            className="w-full h-full absolute inset-0"
          />

          {/* Badge Minimizado da Empresa Selecionada */}
          {selectedBiz && isCardMinimized && (
            <div className="relative z-20 m-3 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full border border-amber-900/15 shadow-lg flex items-center gap-2 self-end mt-auto transition-all animate-fade-in">
              <MapPin className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="text-xs font-bold text-gray-900 truncate max-w-[140px]">{selectedBiz.name}</span>
              <button
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
            <div className="relative z-20 m-3 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-amber-900/15 shadow-xl max-w-[310px] self-end mt-auto transition-all animate-fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl border border-gray-200 bg-white text-amber-950 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs shadow-2xs">
                    {selectedBiz.logo_url ? (
                      <img src={selectedBiz.logo_url} alt={selectedBiz.name} className="w-full h-full object-contain p-0.5" />
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
                  </div>
                </div>

                <button
                  onClick={() => setIsCardMinimized(true)}
                  className="p-1 hover:bg-amber-100/60 rounded-lg text-gray-400 hover:text-amber-900 transition-colors shrink-0"
                  title="Minimizar janela"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center gap-2">
                <button
                  onClick={() => handleTravarRota(selectedBiz)}
                  className="flex-1 inline-flex items-center justify-center gap-1 bg-amber-50 text-amber-900 border border-amber-900/20 px-2.5 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-amber-700" />
                  <span>Traçar Rota</span>
                </button>
                <Link
                  href={`/guia/${selectedBiz.slug}`}
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
        <div className="p-5 bg-white flex flex-col justify-between border-l border-gray-100">
          <div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-bold text-gray-700">
                <strong className="text-amber-900 text-sm">{businesses.length}</strong> empresas na região
              </span>
            </div>

            {/* Abas de Filtro da Sidebar */}
            <div className="flex gap-1 my-3 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('empresas')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'empresas' ? 'bg-amber-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Todas
              </button>
              <button
                onClick={() => setActiveTab('beneficios')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'beneficios' ? 'bg-amber-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Com Benefícios
              </button>
              <button
                onClick={() => setActiveTab('eventos')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  activeTab === 'eventos' ? 'bg-amber-900 text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Eventos
              </button>
            </div>

            {/* Lista Scrollável de Empresas */}
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {displayList.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed">
                  Nenhum resultado para este filtro no momento.
                </div>
              ) : (
                displayList.slice(0, 10).map((b) => {
                  const isSelected = selectedBiz?.id === b.id;
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
                        <div className="w-9 h-9 rounded-lg border border-gray-200 bg-white text-amber-950 font-bold flex items-center justify-center shrink-0 overflow-hidden text-[11px]">
                          {b.logo_url ? (
                            <img src={b.logo_url} alt={b.name} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            b.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="min-w-0">
                          <h5 className="font-bold text-gray-900 text-xs truncate flex items-center gap-1">
                            <span className="truncate">{b.name}</span>
                            {b.is_verified && <ShieldCheck className="w-3 h-3 text-amber-600 shrink-0" />}
                          </h5>
                          <p className="text-[11px] text-gray-500 truncate">
                            {b.category_name || 'Serviços'} {b.city ? `· ${b.city}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className={`text-[11px] font-bold shrink-0 ml-2 ${isSelected ? 'text-amber-900' : 'text-gray-400'}`}>
                        {isSelected ? 'No Mapa' : 'Ver'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 mt-3">
            <Link
              href="#todas"
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