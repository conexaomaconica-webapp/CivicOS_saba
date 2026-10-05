'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Save, ArrowUp, ArrowDown, Eye, EyeOff, Loader2, CheckCircle2, Gauge, Sparkles } from 'lucide-react';
import { saveDirectoryHomeSettingsAction } from '@/app/actions/directory-home-settings';
import { getCanonicalAdminTenantAction } from '@/app/actions/admin-tenant-context';

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

  const [heroTitle, setHeroTitle] = useState('Encontre empresas, serviços e conexões de confiança');
  const [heroSubtitle, setHeroSubtitle] = useState('Descubra oportunidades dentro de uma rede que valoriza relacionamento, credibilidade e propósito.');
  const [heroSearchPlaceholder, setHeroSearchPlaceholder] = useState('Pergunte à busca inteligente...');
  const [defaultPageSize, setDefaultPageSize] = useState(12);
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
  const [sponsoredDisplayMode, setSponsoredDisplayMode] = useState<'cards' | 'logos'>('cards');
  const [sponsoredSpeed, setSponsoredSpeed] = useState<number>(45);
  const [sponsoredLogoStyle, setSponsoredLogoStyle] = useState<'standard' | 'clean'>('standard');

  useEffect(() => {
    async function loadSettings() {
      try {
        const supabase = createClient();
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) throw new Error('Usuário não autenticado.');

        const tenantResult = await getCanonicalAdminTenantAction();
        const tid = tenantResult.tenantId;
        if (!tenantResult.success) throw new Error(tenantResult.error);
        if (!tid) throw new Error('Tenant do administrador não identificado.');

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
          if (data.sponsored_display_mode === 'logos' || data.sponsored_display_mode === 'cards') {
            setSponsoredDisplayMode(data.sponsored_display_mode);
          }
          if (data.sponsored_marquee_speed) {
            setSponsoredSpeed(Number(data.sponsored_marquee_speed));
          }
          if (data.sponsored_logo_style === 'clean' || data.sponsored_logo_style === 'standard') {
            setSponsoredLogoStyle(data.sponsored_logo_style);
          }
          if (Array.isArray(data.sections_config) && data.sections_config.length > 0) {
            setSections(data.sections_config as SectionConfig[]);
            const spConfig = (data.sections_config as any[]).find((s) => s.id === 'sponsored');
            if (spConfig) {
              if (spConfig.display_mode === 'logos' || spConfig.display_mode === 'cards') {
                setSponsoredDisplayMode(spConfig.display_mode);
              }
              if (Number(spConfig.speed) > 0) {
                setSponsoredSpeed(Number(spConfig.speed));
              }
              if (spConfig.logo_style === 'clean' || spConfig.logo_style === 'standard') {
                setSponsoredLogoStyle(spConfig.logo_style);
              }
            }
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
    setSaving(true);
    setSuccessMessage(null);
    try {
      const res = await saveDirectoryHomeSettingsAction({
        hero_title: heroTitle,
        hero_subtitle: heroSubtitle,
        hero_search_placeholder: heroSearchPlaceholder,
        default_page_size: defaultPageSize,
        sections_config: sections,
        sponsored_display_mode: sponsoredDisplayMode,
        sponsored_marquee_speed: sponsoredSpeed,
        sponsored_logo_style: sponsoredLogoStyle,
      });

      if (!res.success) throw new Error(res.error);
      setSuccessMessage('Configurações salvas com sucesso! A página pública do Guia foi atualizada em tempo real.');
      setTimeout(() => setSuccessMessage(null), 5000);
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

      {/* Formato de Exibição de Empresas Patrocinadas */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-5">
        <div className="border-b pb-2">
          <h2 className="text-lg font-bold text-gray-900">Formato de Exibição de Empresas Patrocinadas</h2>
          <p className="text-xs text-gray-500">Escolha como o bloco de empresas patrocinadas/destacadas será apresentado na página principal pública do Guia.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            onClick={() => setSponsoredDisplayMode('cards')}
            className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
              sponsoredDisplayMode === 'cards'
                ? 'border-amber-700 bg-amber-50/60 text-amber-950 shadow-sm ring-1 ring-amber-700/20'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
            }`}
          >
            <input
              type="radio"
              name="sponsoredDisplayMode"
              checked={sponsoredDisplayMode === 'cards'}
              onChange={() => setSponsoredDisplayMode('cards')}
              className="mt-1 accent-amber-800"
            />
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>🎴 Cards Completos</span>
                {sponsoredDisplayMode === 'cards' && (
                  <span className="text-[10px] bg-amber-800 text-white px-2 py-0.5 rounded-full font-semibold">Ativo</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Exibe as empresas em grade de 3 colunas com cards completos (imagem de capa, descrição, endereço e categorias).
              </p>
            </div>
          </div>

          <div
            onClick={() => setSponsoredDisplayMode('logos')}
            className={`p-4 border-2 rounded-xl cursor-pointer transition-all flex items-start gap-3 ${
              sponsoredDisplayMode === 'logos'
                ? 'border-amber-700 bg-amber-50/60 text-amber-950 shadow-sm ring-1 ring-amber-700/20'
                : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700'
            }`}
          >
            <input
              type="radio"
              name="sponsoredDisplayMode"
              checked={sponsoredDisplayMode === 'logos'}
              onChange={() => setSponsoredDisplayMode('logos')}
              className="mt-1 accent-amber-800"
            />
            <div>
              <div className="font-bold text-sm flex items-center gap-2">
                <span>♾️ Logomarcas em Loop Infinito</span>
                {sponsoredDisplayMode === 'logos' && (
                  <span className="text-[10px] bg-amber-800 text-white px-2 py-0.5 rounded-full font-semibold">Ativo</span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Exibe uma trilha contínua com logomarcas deslizando em loop suave com velocidade e estilo configuráveis.
              </p>
            </div>
          </div>
        </div>

        {sponsoredDisplayMode === 'logos' && (
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-xl p-4 mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estilo das Logomarcas */}
            <div className="bg-white p-3.5 rounded-lg border border-amber-200/60 space-y-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-800" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Estilo Visual das Marcas
                </h4>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                  <input
                    type="radio"
                    name="sponsoredLogoStyle"
                    checked={sponsoredLogoStyle === 'standard'}
                    onChange={() => setSponsoredLogoStyle('standard')}
                    className="mt-0.5 accent-amber-800"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Card com Borda</span>
                    <span className="text-[11px] text-gray-500 block leading-tight">
                      Logo dentro de caixinha com borda, com nome e categoria visíveis.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg border border-stone-200 cursor-pointer hover:bg-stone-50 transition-colors">
                  <input
                    type="radio"
                    name="sponsoredLogoStyle"
                    checked={sponsoredLogoStyle === 'clean'}
                    onChange={() => setSponsoredLogoStyle('clean')}
                    className="mt-0.5 accent-amber-800"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">✨ Só Logomarca Limpa</span>
                    <span className="text-[11px] text-gray-500 block leading-tight">
                      Sem borda e sem textos fixos. Revela nome e categoria no hover (ao passar o mouse).
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Velocidade do Loop */}
            <div className="bg-white p-3.5 rounded-lg border border-amber-200/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-800" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                    Velocidade do Deslizamento
                  </h4>
                </div>
                <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                  {sponsoredSpeed}s por volta
                </span>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: 'Muito Lenta', sec: 70 },
                  { label: 'Lenta (Ideal)', sec: 50 },
                  { label: 'Moderada', sec: 35 },
                  { label: 'Rápida', sec: 20 },
                ].map((p) => (
                  <button
                    key={p.sec}
                    type="button"
                    onClick={() => setSponsoredSpeed(p.sec)}
                    className={`py-1 rounded text-[10px] font-semibold border transition-all ${
                      sponsoredSpeed === p.sec
                        ? 'bg-amber-900 text-white border-amber-900'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Mais rápido (15s)</span>
                  <span>Mais suave / calmo (90s)</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={sponsoredSpeed}
                  onChange={(e) => setSponsoredSpeed(Number(e.target.value))}
                  className="w-full accent-amber-900 h-2 bg-stone-200 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-stone-400 text-center">
                  💡 Valores maiores tornam o movimento mais suave e calmo para os visitantes.
                </p>
              </div>
            </div>
          </div>
        )}
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
