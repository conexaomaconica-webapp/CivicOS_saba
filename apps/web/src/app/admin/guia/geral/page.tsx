'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, ArrowUp, ArrowDown, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';

type SectionConfig = {
  id: string;
  enabled: boolean;
  order: number;
};

const SECTION_LABELS: Record<string, string> = {
  hero: '1. Topo Hero & Busca Inteligente',
  carousel: '2. Banner Carrossel (Destaque da Semana)',
  categories: '3. Categorias em Destaque',
  sponsored: '4. Empresas Patrocinadas',
  all_businesses: '5. Diretório "Todas as Empresas" (Com Paginação)',
  map: '6. Mapa "Explore perto de você"',
  lodges: '7. Guia de Lojas Maçônicas',
};

const DEFAULT_SECTIONS: SectionConfig[] = [
  { id: 'hero', enabled: true, order: 1 },
  { id: 'carousel', enabled: true, order: 2 },
  { id: 'categories', enabled: true, order: 3 },
  { id: 'sponsored', enabled: true, order: 4 },
  { id: 'all_businesses', enabled: true, order: 5 },
  { id: 'map', enabled: true, order: 6 },
  { id: 'lodges', enabled: true, order: 7 },
];

export default function AdminGuiaGeralPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [heroTitle, setHeroTitle] = useState('Encontre empresas, serviços e conexões de confiança');
  const [heroSubtitle, setHeroSubtitle] = useState('Descubra oportunidades dentro de uma rede que valoriza relacionamento, credibilidade e propósito.');
  const [heroSearchPlaceholder, setHeroSearchPlaceholder] = useState('Pergunte à busca inteligente...');
  const [defaultPageSize, setDefaultPageSize] = useState(12);
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient();
        const { data: profileData } = await (supabase as any).from('profiles').select('tenant_id').maybeSingle();
        const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';
        setTenantId(tid);

        const { data } = await (supabase as any)
          .from('directory_home_settings')
          .select('*')
          .eq('tenant_id', tid)
          .maybeSingle();

        if (data) {
          if (data.hero_title) setHeroTitle(data.hero_title);
          if (data.hero_subtitle) setHeroSubtitle(data.hero_subtitle);
          if (data.hero_search_placeholder) setHeroSearchPlaceholder(data.hero_search_placeholder);
          if (data.default_page_size) setDefaultPageSize(data.default_page_size);
          if (Array.isArray(data.sections_config) && data.sections_config.length > 0) {
            setSections(data.sections_config as SectionConfig[]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleToggleSection = (id: string) => {
    setSections((prev) =>
      prev.map((sec) => (sec.id === id ? { ...sec, enabled: !sec.enabled } : sec))
    );
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === sections.length - 1)) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newSections = [...sections];
    const temp = newSections[index]!;
    newSections[index] = newSections[targetIndex]!;
    newSections[targetIndex] = temp;
    // Reassign order
    setSections(newSections.map((sec, i) => ({ ...sec, order: i + 1 })));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    setSuccessMessage(null);
    try {
      const supabase = createClient();
      const payload = {
        tenant_id: tenantId,
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        hero_search_placeholder: heroSearchPlaceholder,
        default_page_size: defaultPageSize,
        sections_config: sections,
        updated_at: new Date().toISOString(),
      };

      const { error } = await (supabase as any)
        .from('directory_home_settings')
        .upsert(payload, { onConflict: 'tenant_id' });

      if (error) throw error;
      setSuccessMessage('Configurações salvas com sucesso!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido ao salvar';
      alert(`Falha ao salvar: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando configurações...
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          {successMessage}
        </div>
      )}

      {/* Configurações de Texto do Hero */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <h2 className="text-lg font-bold text-gray-900 border-b pb-2">Seção Hero & Busca</h2>
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Título de Impacto (Hero)</label>
          <input
            type="text"
            value={heroTitle}
            onChange={(e) => setHeroTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Subtítulo / Descrição da Rede</label>

          <textarea
            value={heroSubtitle}
            onChange={(e) => setHeroSubtitle(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Placeholder da Busca Inteligente</label>
            <input
              type="text"
              value={heroSearchPlaceholder}
              onChange={(e) => setHeroSearchPlaceholder(e.target.value)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Qtd. de Cards por Página (Diretório)</label>
            <input
              type="number"
              min={4}
              max={48}
              value={defaultPageSize}
              onChange={(e) => setDefaultPageSize(parseInt(e.target.value) || 12)}
              className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-800"
            />
          </div>
        </div>
      </div>

      {/* Ordem e Visibilidade das Seções */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <div className="border-b pb-2">
          <h2 className="text-lg font-bold text-gray-900">Ordem e Ativação das Seções na Home</h2>
          <p className="text-xs text-gray-500">Altere a visibilidade ou a sequência em que os blocos serão renderizados na página pública do Guia.</p>
        </div>

        <div className="space-y-2">
          {sections.map((sec, index) => (
            <div
              key={sec.id}
              className={`flex items-center justify-between p-3 border rounded-lg transition-colors ${
                sec.enabled ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleToggleSection(sec.id)}
                  className={`p-1.5 rounded-md transition-colors ${
                    sec.enabled ? 'bg-amber-100 text-amber-900' : 'bg-gray-200 text-gray-500'
                  }`}
                  title={sec.enabled ? 'Seção visível' : 'Seção oculta'}
                >
                  {sec.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <span className="text-sm font-medium text-gray-900">
                  {SECTION_LABELS[sec.id] || sec.id}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMoveSection(index, 'up')}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="Mover para cima"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={index === sections.length - 1}
                  onClick={() => handleMoveSection(index, 'down')}
                  className="p-1 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30"
                  title="Mover para baixo"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-amber-900 text-white px-6 py-2.5 rounded-md font-semibold text-sm hover:bg-amber-800 transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar Parâmetros
        </button>
      </div>
    </form>
  );
}
