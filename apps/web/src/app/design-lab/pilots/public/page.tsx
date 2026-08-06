'use client';

import React, { useState } from 'react';
import { Button, Input, Select, Badge, Drawer, Card } from '@saas/ui';
import { BusinessCard } from '../../_components/domain/BusinessCard';
import { MapProviderAdapter } from '../../_adapters/MapProviderAdapter';
import { MOCK_BUSINESSES } from '../../_mocks/businesses';
import { toBusinessCardViewModel, BusinessCardViewModel } from '../../_types/view-models';

export default function PublicPilotPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessCardViewModel | null>(null);

  const filteredBusinesses = MOCK_BUSINESSES.map(toBusinessCardViewModel).filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'all' || b.category.toLowerCase().includes(selectedCategory);
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span>🌐 Piloto 1</span>
            <span>•</span>
            <span>Experiência Pública do Guia Comercial</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Guia Comercial Fraterno da Comunidade
          </h2>
          <p className="text-xs text-slate-400 max-w-xl">
            Jornada do visitante: busca em lista, mapa vetorial sincronizado e perfil detalhado da empresa.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => setIsFilterDrawerOpen(true)}>
          🎛️ Filtros Avançados
        </Button>
      </div>

      {/* Hero & Search Box */}
      <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            placeholder="Buscar por nome da empresa, serviço ou palavra-chave..."
            leftIcon="🔍"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            options={[
              { label: 'Todas as Categorias', value: 'all' },
              { label: 'Serviços Automotivos', value: 'automotivo' },
              { label: 'Serviços Jurídicos', value: 'juridico' },
              { label: 'Alimentação', value: 'alimentacao' }
            ]}
          />

          <Button variant="primary" onClick={() => setSelectedCategory('all')}>
            Limpar Filtros
          </Button>
        </div>
      </div>

      {/* Main Split Layout: List + Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Business Cards List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Resultados Encontrados: ({filteredBusinesses.length})</span>
            <span>Ordenado por: Reputação</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBusinesses.map((b) => (
              <div key={b.id} onClick={() => setSelectedBusiness(b)} className="cursor-pointer">
                <BusinessCard viewModel={b} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: MapProviderAdapter */}
        <div className="lg:col-span-5 sticky top-4 space-y-4">
          <Card variant="bordered" className="p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300 font-bold">Mapa de Empresas Proximidade</span>
              <Badge variant="info">Modo Vetorial Neutral</Badge>
            </div>
            <MapProviderAdapter
              businesses={MOCK_BUSINESSES}
              selectedBusinessId={selectedBusiness?.id}
              onSelectBusiness={(id: string) => {
                const found = filteredBusinesses.find((x) => x.id === id);
                if (found) setSelectedBusiness(found);
              }}
            />
          </Card>
        </div>
      </div>

      {/* Internal Company Detail Drawer View */}
      {selectedBusiness && (
        <Drawer
          isOpen={Boolean(selectedBusiness)}
          onClose={() => setSelectedBusiness(null)}
          title={`Perfil de ${selectedBusiness.title}`}
          footer={
            <Button size="sm" onClick={() => setSelectedBusiness(null)}>
              Fechar Perfil
            </Button>
          }
        >
          <div className="space-y-4 text-xs text-slate-200">
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
              <div className="font-bold text-white text-sm">{selectedBusiness.title}</div>
              <div className="text-slate-400">{selectedBusiness.subtitle}</div>
              <div className="text-amber-400 font-mono font-bold">{selectedBusiness.ratingFormatted} ({selectedBusiness.reviewCount} avaliações)</div>
            </div>

            <div className="space-y-1">
              <div className="font-mono text-slate-400">Localização (Endereço Protegido):</div>
              <div className="font-semibold text-white">{selectedBusiness.locationMasked}</div>
            </div>

            <div className="space-y-1">
              <div className="font-mono text-slate-400">Contato Comercial:</div>
              <div className="font-semibold text-emerald-400">{selectedBusiness.contactMasked}</div>
            </div>
          </div>
        </Drawer>
      )}

      {/* Filter Drawer */}
      <Drawer
        isOpen={isFilterDrawerOpen}
        onClose={() => setIsFilterDrawerOpen(false)}
        title="Filtros Avançados do Guia Comercial"
        footer={
          <Button size="sm" onClick={() => setIsFilterDrawerOpen(false)}>
            Aplicar Filtros
          </Button>
        }
      >
        <div className="space-y-4">
          <Input label="Cidade ou Bairro" placeholder="Digite a localização..." />
          <Select
            label="Tipo de Membro"
            options={[
              { label: 'Todos os Anunciantes', value: 'all' },
              { label: 'Apenas Membros Verificados', value: 'verified' }
            ]}
          />
        </div>
      </Drawer>
    </div>
  );
}
