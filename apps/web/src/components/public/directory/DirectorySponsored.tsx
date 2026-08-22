'use client';

import React from 'react';
import { BusinessCard, type BusinessCardData } from './BusinessCard';

export type DirectorySponsoredItem = BusinessCardData;

type DirectorySponsoredProps = {
  items?: DirectorySponsoredItem[];
};

export function DirectorySponsored({ items = [] }: DirectorySponsoredProps) {
  if (!items.length) return null;

  return (
    <section className="dh-container my-12" id="patrocinadas">
      <div>
        <h2 className="dh-section-title">Empresas Patrocinadas</h2>
        <p className="text-xs text-gray-500 mt-1">Destaques comerciais e empresas pilares da nossa rede.</p>
      </div>

      {/* Grid de 3 colunas para Empresas Patrocinadas (Cards maiores e mais destacados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {items.map((biz) => (
          <BusinessCard key={biz.id} data={biz} variant="featured" />
        ))}
      </div>
    </section>
  );
}
