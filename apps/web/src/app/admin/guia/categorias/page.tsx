'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Loader2, CheckCircle2, X } from 'lucide-react';

type FeaturedCategory = {
  id: string;
  tenant_id: string;
  category_id: string;
  custom_title?: string | null;
  icon_name?: string | null;
  display_order: number;
  is_active: boolean;
  categories?: {
    name: string;
    slug: string;
    icon?: string | null;
  };
};

type BaseCategory = {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
};

export default function AdminGuiaCategoriasPage() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [featured, setFeatured] = useState<FeaturedCategory[]>([]);
  const [allCategories, setAllCategories] = useState<BaseCategory[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeaturedCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [iconName, setIconName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const fetchData = async () => {
    try {
      const supabase = createClient();
      const { data: profileData } = await (supabase as any).from('user_profiles').select('tenant_id').maybeSingle();
      const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';
      setTenantId(tid);

      // 1. Fetch base categories
      const { data: catData } = await supabase.from('categories').select('id, name, slug, icon').eq('is_active', true);
      setAllCategories((catData as BaseCategory[]) || []);

      // 2. Fetch featured categories
      const { data: featData } = await (supabase as any)
        .from('directory_featured_categories')
        .select('*, categories(name, slug, icon)')
        .eq('tenant_id', tid)
        .order('display_order', { ascending: true });

      setFeatured((featData as FeaturedCategory[]) || []);
    } catch (err) {
      console.error('Erro ao carregar categorias em destaque:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (item?: FeaturedCategory) => {
    if (item) {
      setEditingItem(item);
      setSelectedCategoryId(item.category_id);
      setCustomTitle(item.custom_title || '');
      setIconName(item.icon_name || '');
      setDisplayOrder(item.display_order);
      setIsActive(item.is_active);
    } else {
      setEditingItem(null);
      setSelectedCategoryId(allCategories[0]?.id || '');
      setCustomTitle('');
      setIconName('');
      setDisplayOrder(featured.length + 1);
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !selectedCategoryId) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        tenant_id: tenantId,
        category_id: selectedCategoryId,
        custom_title: customTitle || null,
        icon_name: iconName || null,
        display_order: displayOrder,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await (supabase as any).from('directory_featured_categories').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('directory_featured_categories').insert(payload);
        if (error) throw error;
      }

      setSuccessMsg('Categoria em destaque salva com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setModalOpen(false);
      fetchData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar categoria';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja remover esta categoria do destaque?')) return;
    try {
      const supabase = createClient();
      await (supabase as any).from('directory_featured_categories').delete().eq('id', id);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando categorias em destaque...
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
          <h2 className="text-lg font-bold text-gray-900">Categorias em Destaque</h2>
          <p className="text-xs text-gray-500">Selecione quais categorias aparecerão no grid principal da Home do Guia e personalize o título ou ícone.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-amber-900 text-white px-4 py-2 rounded-md font-semibold text-sm hover:bg-amber-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Destacar Categoria
        </button>
      </div>

      {/* Lista */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        {featured.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Nenhuma categoria em destaque cadastrada.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b font-semibold">
              <tr>
                <th className="p-3">Ordem</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Título Exibido</th>
                <th className="p-3">Ícone</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-800">
              {featured.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="p-3 font-semibold text-amber-900">{f.display_order}</td>
                  <td className="p-3 font-medium">{f.categories?.name || f.category_id}</td>
                  <td className="p-3 text-gray-600">{f.custom_title || f.categories?.name || 'Padrão'}</td>
                  <td className="p-3 font-mono text-xs text-gray-500">{f.icon_name || f.categories?.icon || 'Padrão'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${f.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {f.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => handleOpenModal(f)} className="p-1.5 hover:bg-gray-100 rounded text-gray-700">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(f.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
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
              <h3 className="text-lg font-bold text-gray-900">{editingItem ? 'Editar Categoria em Destaque' : 'Nova Categoria em Destaque'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Categoria *</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={Boolean(editingItem)}
                  required
                  className="w-full px-3 py-1.5 border rounded-md text-sm bg-white disabled:bg-gray-100"
                >
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.slug})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título Personalizado (Opcional)</label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Deixe em branco para usar o nome oficial"
                  className="w-full px-3 py-1.5 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nome do Ícone Lucide (Opcional)</label>
                <input
                  type="text"
                  value={iconName}
                  onChange={(e) => setIconName(e.target.value)}
                  placeholder="Ex: briefcase, heart, building, utensils"
                  className="w-full px-3 py-1.5 border rounded-md text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ordem de Exibição</label>
                <input
                  type="number"
                  min={1}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border rounded-md text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveCat"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="isActiveCat" className="text-sm font-medium text-gray-700">Categoria Ativa no Destaque</label>
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
