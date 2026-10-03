'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateSponsoredSettingsAction } from '@/app/actions/directory-home-settings';
import { Plus, Trash2, Edit2, Loader2, CheckCircle2, X, Award, Gauge, Sparkles, LayoutGrid, Check } from 'lucide-react';

type SponsoredBusiness = {
  id: string;
  tenant_id: string;
  business_id: string;
  priority: number;
  city?: string | null;
  is_active: boolean;
  start_at?: string | null;
  end_at?: string | null;
  businesses?: {
    name: string;
    slug: string;
    logo_url?: string | null;
  };
};

type BaseBusiness = {
  id: string;
  name: string;
  slug: string;
};

export default function AdminGuiaDestaquesPage() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [sponsoredList, setSponsoredList] = useState<SponsoredBusiness[]>([]);
  const [allBusinesses, setAllBusinesses] = useState<BaseBusiness[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SponsoredBusiness | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedBusinessId, setSelectedBusinessId] = useState('');
  const [priority, setPriority] = useState(100);
  const [city, setCity] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [sponsoredDisplayMode, setSponsoredDisplayMode] = useState<'cards' | 'logos'>('cards');
  const [sponsoredSpeed, setSponsoredSpeed] = useState<number>(45);
  const [sponsoredLogoStyle, setSponsoredLogoStyle] = useState<'standard' | 'clean'>('standard');
  const [updatingMode, setUpdatingMode] = useState(false);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Usuário não autenticado.');
      const { data: profileData } = await (supabase as any)
        .from('profiles')
        .select('tenant_id')
        .eq('id', authData.user.id)
        .maybeSingle();
      const tid = profileData?.tenant_id;
      if (!tid) throw new Error('Tenant do administrador não identificado.');
      setTenantId(tid);

      // 1. Fetch available businesses
      const { data: bizData } = await supabase
        .from('businesses')
        .select('id, name, slug')
        .eq('tenant_id', tid)
        .eq('is_active', true)
        .eq('publication_status', 'published');

      setAllBusinesses((bizData as BaseBusiness[]) || []);

      // 2. Fetch sponsored overrides
      const { data: spData } = await (supabase as any)
        .from('directory_sponsored_businesses')
        .select('*, businesses(name, slug, logo_url)')
        .eq('tenant_id', tid)
        .order('priority', { ascending: false });

      setSponsoredList((spData as SponsoredBusiness[]) || []);

      const { data: settingsData } = await (supabase as any)
        .from('directory_home_settings')
        .select('sponsored_display_mode, sponsored_marquee_speed, sponsored_logo_style, sections_config')
        .eq('tenant_id', tid)
        .maybeSingle();

      if (settingsData) {
        if (settingsData.sponsored_display_mode === 'logos' || settingsData.sponsored_display_mode === 'cards') {
          setSponsoredDisplayMode(settingsData.sponsored_display_mode);
        }
        if (settingsData.sponsored_marquee_speed) {
          setSponsoredSpeed(Number(settingsData.sponsored_marquee_speed));
        }
        if (settingsData.sponsored_logo_style === 'clean' || settingsData.sponsored_logo_style === 'standard') {
          setSponsoredLogoStyle(settingsData.sponsored_logo_style);
        }

        // Fallback em sections_config
        if (Array.isArray(settingsData.sections_config)) {
          const spConfig = settingsData.sections_config.find((s: any) => s.id === 'sponsored');
          if (spConfig) {
            if (spConfig.display_mode === 'logos' || spConfig.display_mode === 'cards') {
              setSponsoredDisplayMode(spConfig.display_mode);
            }
            if (spConfig.speed && !settingsData.sponsored_marquee_speed) {
              setSponsoredSpeed(Number(spConfig.speed));
            }
            if (spConfig.logo_style && !settingsData.sponsored_logo_style) {
              setSponsoredLogoStyle(spConfig.logo_style);
            }
          }
        }
      }
    } catch (err) {
      console.error('Erro ao buscar empresas patrocinadas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSponsoredSettings = async (overrides: {
    mode?: 'cards' | 'logos';
    speed?: number;
    logoStyle?: 'standard' | 'clean';
  }) => {
    if (!tenantId) return;
    setUpdatingMode(true);
    const newMode = overrides.mode ?? sponsoredDisplayMode;
    const newSpeed = overrides.speed ?? sponsoredSpeed;
    const newStyle = overrides.logoStyle ?? sponsoredLogoStyle;

    try {
      const res = await updateSponsoredSettingsAction({
        mode: newMode,
        speed: newSpeed,
        logoStyle: newStyle,
      });

      if (res.success) {
        if (overrides.mode) setSponsoredDisplayMode(overrides.mode);
        if (overrides.speed !== undefined) setSponsoredSpeed(overrides.speed);
        if (overrides.logoStyle) setSponsoredLogoStyle(overrides.logoStyle);

        setSuccessMsg('Configurações da seção de empresas patrocinadas atualizadas com sucesso!');
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        alert(res.error || 'Erro ao atualizar configurações.');
      }
    } catch (err) {
      console.error('Erro ao salvar formato:', err);
      alert('Erro inesperado ao salvar formato.');
    } finally {
      setUpdatingMode(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item?: SponsoredBusiness) => {
    if (item) {
      setEditingItem(item);
      setSelectedBusinessId(item.business_id);
      setPriority(item.priority);
      setCity(item.city || '');
      setIsActive(item.is_active);
    } else {
      setEditingItem(null);
      setSelectedBusinessId(allBusinesses[0]?.id || '');
      setPriority(100);
      setCity('');
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !selectedBusinessId) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        tenant_id: tenantId,
        business_id: selectedBusinessId,
        priority,
        city: city || null,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await (supabase as any).from('directory_sponsored_businesses').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('directory_sponsored_businesses').insert(payload);
        if (error) throw error;
      }

      setSuccessMsg('Destaque patrocinado salvo com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar destaque';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover este destaque administrativo? (A empresa voltará para a regra comercial padrão do plano)')) return;
    try {
      const supabase = createClient();
      await (supabase as any).from('directory_sponsored_businesses').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando empresas patrocinadas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> {successMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Overrides de Empresas Patrocinadas</h2>
          <p className="text-xs text-gray-500">
            Destaque empresas manualmente na trilha "Empresas Patrocinadas" ou desative temporariamente a exibição sem alterar o plano comercial.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-amber-900 text-white px-4 py-2 rounded-md font-semibold text-sm hover:bg-amber-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Destacar Empresa
        </button>
      </div>

      {/* Formato e Comportamento de Exibição na Página Inicial */}
      <div className="bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 border border-amber-200/90 p-5 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-amber-200/60 pb-4">
          <div>
            <h3 className="text-base font-bold text-amber-950 flex items-center gap-2">
              <span>⚙️ Formato Exibido na Home Pública</span>
              {updatingMode && <Loader2 className="w-4 h-4 animate-spin text-amber-900" />}
            </h3>
            <p className="text-xs text-stone-600 mt-0.5">
              Escolha se as empresas patrocinadas são apresentadas em Cards Completos ou em Trilha Contínua de Logomarcas.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={updatingMode}
              onClick={() => handleUpdateSponsoredSettings({ mode: 'cards' })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                sponsoredDisplayMode === 'cards'
                  ? 'bg-amber-900 text-white border-amber-900 shadow-md ring-2 ring-amber-900/20'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Completos</span>
            </button>

            <button
              type="button"
              disabled={updatingMode}
              onClick={() => handleUpdateSponsoredSettings({ mode: 'logos' })}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                sponsoredDisplayMode === 'logos'
                  ? 'bg-amber-900 text-white border-amber-900 shadow-md ring-2 ring-amber-900/20'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <span>♾️ Logomarcas em Loop</span>
            </button>
          </div>
        </div>

        {sponsoredDisplayMode === 'logos' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
            {/* 1. Estilo das Logomarcas */}
            <div className="bg-white/90 border border-stone-200/80 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-800" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                  Estilo Visual das Marcas
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  disabled={updatingMode}
                  onClick={() => handleUpdateSponsoredSettings({ logoStyle: 'standard' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    sponsoredLogoStyle === 'standard'
                      ? 'border-amber-800 bg-amber-50/70 text-amber-950 ring-1 ring-amber-800 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Card com Borda</span>
                    {sponsoredLogoStyle === 'standard' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    Logo em caixinha com borda, exibindo nome e categoria sempre visíveis.
                  </p>
                </button>

                <button
                  type="button"
                  disabled={updatingMode}
                  onClick={() => handleUpdateSponsoredSettings({ logoStyle: 'clean' })}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    sponsoredLogoStyle === 'clean'
                      ? 'border-amber-800 bg-amber-50/70 text-amber-950 ring-1 ring-amber-800 shadow-sm'
                      : 'border-stone-200 hover:border-stone-300 bg-stone-50/50 text-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">✨ Só Logomarca Limpa</span>
                    {sponsoredLogoStyle === 'clean' && <Check className="w-3.5 h-3.5 text-amber-800" />}
                  </div>
                  <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">
                    Sem borda e sem textos fixos. Ao passar o mouse, revela o nome e a categoria.
                  </p>
                </button>
              </div>
            </div>

            {/* 2. Velocidade da Animação (Loop) */}
            <div className="bg-white/90 border border-stone-200/80 rounded-xl p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-amber-800" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">
                    Velocidade do Deslizamento
                  </h4>
                </div>
                <span className="text-xs font-extrabold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                  {sponsoredSpeed}s por volta
                </span>
              </div>

              {/* Presets táteis */}
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { label: 'Muito Lenta', sec: 70 },
                  { label: 'Lenta (Ideal)', sec: 50 },
                  { label: 'Moderada', sec: 35 },
                  { label: 'Rápida', sec: 20 },
                ].map((preset) => (
                  <button
                    key={preset.sec}
                    type="button"
                    disabled={updatingMode}
                    onClick={() => handleUpdateSponsoredSettings({ speed: preset.sec })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-semibold transition-all border text-center ${
                      sponsoredSpeed === preset.sec
                        ? 'bg-amber-900 text-white border-amber-900 shadow-xs'
                        : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Slider de ajuste fino */}
              <div className="pt-1 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-stone-500 font-medium">
                  <span>Mais rápido (15s)</span>
                  <span>Mais suave / calmo (90s)</span>
                </div>
                <input
                  type="range"
                  min="15"
                  max="90"
                  step="5"
                  value={sponsoredSpeed}
                  disabled={updatingMode}
                  onChange={(e) => setSponsoredSpeed(Number(e.target.value))}
                  onMouseUp={(e) => handleUpdateSponsoredSettings({ speed: Number((e.target as HTMLInputElement).value) })}
                  onTouchEnd={(e) => handleUpdateSponsoredSettings({ speed: Number((e.target as HTMLInputElement).value) })}
                  className="w-full accent-amber-900 h-2 bg-stone-200 rounded-lg cursor-pointer"
                />
                <p className="text-[10px] text-stone-400 text-center">
                  💡 Quanto maior o tempo em segundos, mais suave, calmo e legível será o movimento.
                </p>
              </div>

              <button
                type="button"
                disabled={updatingMode}
                onClick={() => handleUpdateSponsoredSettings({
                  mode: sponsoredDisplayMode,
                  speed: sponsoredSpeed,
                  logoStyle: sponsoredLogoStyle,
                })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3B0B14] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#54101d] disabled:cursor-wait disabled:opacity-60"
              >
                {updatingMode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {updatingMode ? 'Salvando…' : 'Salvar configurações do loop'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        {sponsoredList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nenhum override manual cadastrado. As empresas Acácia/Compasso estão sendo exibidas pela regra comercial padrão.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b font-semibold">
              <tr>
                <th className="p-3">Prioridade</th>
                <th className="p-3">Empresa</th>
                <th className="p-3">Cidade Alvo</th>
                <th className="p-3">Status Override</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-800">
              {sponsoredList.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="p-3 font-semibold text-amber-900 flex items-center gap-1">
                    <Award className="w-4 h-4 text-amber-600" /> {s.priority}
                  </td>
                  <td className="p-3 font-medium">
                    <div>{s.businesses?.name || s.business_id}</div>
                    <div className="text-xs text-gray-400">/{s.businesses?.slug}</div>
                  </td>
                  <td className="p-3">{s.city || 'Todas as Cidades'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {s.is_active ? 'Destaque Ativo' : 'Destaque Desativado'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => handleOpenModal(s)} className="p-1.5 hover:bg-gray-100 rounded text-gray-700">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">{editingItem ? 'Editar Destaque' : 'Novo Destaque Manual'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Empresa Anunciante *</label>
                <select
                  value={selectedBusinessId}
                  onChange={(e) => setSelectedBusinessId(e.target.value)}
                  disabled={Boolean(editingItem)}
                  required
                  className="w-full px-3 py-1.5 border rounded-md text-sm bg-white disabled:bg-gray-100"
                >
                  {allBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Prioridade de Exibição (Numérica)</label>
                <input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
                  className="w-full px-3 py-1.5 border rounded-md text-sm"
                />
                <span className="text-[11px] text-gray-400">Valores maiores aparecem primeiro no carrossel de patrocinadas.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade Específica (Opcional)</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Feira de Santana, BA"
                  className="w-full px-3 py-1.5 border rounded-md text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveSp"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isActiveSp" className="text-sm font-medium text-gray-700">Destaque Ativo</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-amber-900 text-white font-semibold rounded-md hover:bg-amber-800 flex items-center gap-1">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
