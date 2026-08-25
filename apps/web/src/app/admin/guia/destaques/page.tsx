'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Loader2, CheckCircle2, X, Award } from 'lucide-react';

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

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: profileData } = await (supabase as any).from('profiles').select('tenant_id').maybeSingle();
      const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';
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
    } catch (err) {
      console.error('Erro ao buscar empresas patrocinadas:', err);
    } finally {
      setLoading(false);
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

      {/* Lista */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        {sponsoredList.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nenhum override manual cadastrado. As empresas Ouro/Prata estão sendo exibidas pela regra comercial padrão.
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
