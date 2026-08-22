'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navigation, Compass } from 'lucide-react';
import type { PublicSearchResultItem } from './DirectoryAllBusinesses';

type DirectoryMapExploreProps = {
  businesses?: PublicSearchResultItem[];
  selectedCity?: string | null;
};

export function DirectoryMapExplore({ businesses = [], selectedCity }: DirectoryMapExploreProps) {
  const [activeTab, setActiveTab] = useState<'empresas' | 'beneficios' | 'eventos'>('empresas');

  return (
    <section className="dh-container my-14" id="mapa">
      <div>
        <h2 className="dh-section-title">Explore perto de você</h2>
        <p className="text-xs text-gray-500 mt-1">
          Localização geográfica e raio de atuação das empresas cadastradas.
        </p>
      </div>

      <div className="dh-map-box">
        {/* Visual Map Render Container */}
        <div className="relative bg-slate-200 overflow-hidden flex items-center justify-center p-6 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
          {/* Simulated Map Visual Structure */}
          <div className="absolute inset-0 bg-cover bg-center opacity-75" style={{ backgroundImage: 'url(/visual-lab/assets/map-reference.png)' }} />
          
          {/* Pins overlay */}
          <div className="relative z-10 text-center bg-white/90 backdrop-blur-md p-6 rounded-xl border shadow-lg max-w-sm">
            <Compass className="w-8 h-8 text-amber-900 mx-auto mb-2 animate-pulse" />
            <h4 className="font-bold text-gray-900 text-sm">Visualização de Mapa Interativo</h4>
            <p className="text-xs text-gray-600 mt-1">
              Exibindo empresas e parceiros {selectedCity ? `em ${selectedCity}` : 'na sua região'}.
            </p>
            <button className="mt-4 text-xs font-bold bg-amber-900 text-white px-4 py-2 rounded-md hover:bg-amber-800 transition-colors flex items-center justify-center gap-2 mx-auto">
              <Navigation className="w-3.5 h-3.5" /> Explorar no mapa
            </button>
          </div>
        </div>

        {/* Sidebar Results */}
        <div className="p-6 bg-white flex flex-col justify-between border-l border-gray-200">
          <div>
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-sm font-bold text-gray-900">
                <strong className="text-amber-900">{businesses.length}</strong> resultados nesta região
              </span>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 my-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('empresas')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'empresas' ? 'bg-amber-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Empresas
              </button>
              <button
                onClick={() => setActiveTab('beneficios')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'beneficios' ? 'bg-amber-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Benefícios
              </button>
              <button
                onClick={() => setActiveTab('eventos')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === 'eventos' ? 'bg-amber-900 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Eventos
              </button>
            </div>

            {/* List */}
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {businesses.slice(0, 4).map((b) => (
                <div key={b.id} className="p-3 border rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md border bg-amber-950 text-amber-400 font-bold flex items-center justify-center shrink-0 overflow-hidden text-xs">
                      {b.logo_url ? <img src={b.logo_url} alt={b.name} className="w-full h-full object-cover" /> : b.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="font-bold text-gray-900 text-xs">{b.name}</h5>
                      <p className="text-[11px] text-gray-500">{b.category_name || 'Serviços'}</p>
                    </div>
                  </div>
                  <Link href={`/guia/${b.slug}`} className="text-[11px] font-bold text-amber-900 hover:underline">
                    Ver &gt;
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t mt-4">
            <Link
              href="#todas"
              className="w-full text-center block text-xs font-bold bg-amber-900 text-white py-2.5 rounded-md hover:bg-amber-800 transition-colors"
            >
              Explorar no mapa
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
