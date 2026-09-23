'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Loader2, CheckCircle2, X, Star } from 'lucide-react';
import { CATEGORY_ICON_OPTIONS, isCategoryIcon, normalizeCategoryIcon, resolveCategoryIcon } from '@/lib/directory/category-icons';
import { deleteAdminGuideCategoryAction, listAdminGuideCategoriesAction, setAdminGuideCategoryStatusAction, updateAdminGuideCategoryAction } from '@/app/actions/admin-guide-categories';

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
  is_active: boolean;
  tenant_id?: string | null;
};

function dataErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object') {
    const value = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const message = typeof value.message === 'string' ? value.message : '';
    const details = typeof value.details === 'string' ? value.details : '';
    const hint = typeof value.hint === 'string' ? value.hint : '';
    const code = typeof value.code === 'string' ? `[${value.code}] ` : '';
    const description = [message, details, hint].filter(Boolean).join(' — ');
    if (description) return `${code}${description}`;
  }
  return 'Não foi possível carregar as categorias.';
}

export default function AdminGuiaCategoriasPage() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [featured, setFeatured] = useState<FeaturedCategory[]>([]);
  const [allCategories, setAllCategories] = useState<BaseCategory[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FeaturedCategory | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [featuredFilter, setFeaturedFilter] = useState<'all' | 'featured' | 'not_featured'>('all');
  const [nameOrder, setNameOrder] = useState<'asc' | 'desc'>('asc');
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);
  const [categoryEditor, setCategoryEditor] = useState<BaseCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryIcon, setCategoryIcon] = useState('briefcase');
  const [categoryActive, setCategoryActive] = useState(true);

  // Form State
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [iconName, setIconName] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const featuredCategoryIds = new Set(featured.map((item) => item.category_id));
  const filteredCategories = allCategories
    .filter((category) => {
      if (statusFilter === 'active' && !category.is_active) return false;
      if (statusFilter === 'inactive' && category.is_active) return false;
      const categoryIsFeatured = featuredCategoryIds.has(category.id);
      if (featuredFilter === 'featured' && !categoryIsFeatured) return false;
      if (featuredFilter === 'not_featured' && categoryIsFeatured) return false;
      return true;
    })
    .sort((left, right) => {
      const comparison = left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' });
      return nameOrder === 'asc' ? comparison : -comparison;
    });

  const fetchData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Sessão expirada. Entre novamente.');
      const requestHost = window.location.host.toLowerCase();
      const [{ data: profileData, error: profileError }, { data: hostTenantId, error: hostTenantError }, { data: enabledTenant, error: tenantError }] = await Promise.all([
        (supabase as any).from('profiles').select('tenant_id').eq('id', user.id).maybeSingle(),
        (supabase as any).rpc('_resolve_public_tenant_id', { p_host: requestHost }),
        (supabase as any).from('tenants').select('id').eq('public_access_status', 'enabled').order('created_at').limit(1).maybeSingle(),
      ]);
      if (profileError) throw profileError;
      if (hostTenantError) throw hostTenantError;
      if (tenantError) throw tenantError;
      const tid = hostTenantId || profileData?.tenant_id || enabledTenant?.id;
      if (!tid) throw new Error('Não foi possível resolver o tenant canônico da Conexão Maçônica.');
      setTenantId(tid);

      // 1. Fetch base categories
      const categoryResult = await listAdminGuideCategoriesAction();
      if (!categoryResult.success) throw new Error(categoryResult.error || 'Não foi possível carregar as categorias.');
      setAllCategories(categoryResult.categories as BaseCategory[]);

      // 2. Fetch featured categories
      const { data: featData, error: featuredError } = await (supabase as any)
        .from('directory_featured_categories')
        .select('*, categories(name, slug, icon)')
        .eq('tenant_id', tid)
        .order('display_order', { ascending: true });
      if (featuredError) throw featuredError;

      setFeatured((featData as FeaturedCategory[]) || []);
    } catch (err: unknown) {
      const errorMessage = dataErrorMessage(err);
      console.warn(`Erro ao carregar categorias em destaque: ${errorMessage}`);
      setLoadError(errorMessage);
      setAllCategories([]);
      setFeatured([]);
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
      const savedIcon = item.icon_name || item.categories?.icon || 'briefcase';
      setIconName(normalizeCategoryIcon(savedIcon));
      setDisplayOrder(item.display_order);
      setIsActive(item.is_active);
    } else {
      setEditingItem(null);
      const firstActiveCategory = allCategories.find((category) => category.is_active);
      setSelectedCategoryId(firstActiveCategory?.id || '');
      setCustomTitle('');
      const defaultIcon = firstActiveCategory?.icon || 'briefcase';
      setIconName(normalizeCategoryIcon(defaultIcon));
      setDisplayOrder(featured.length + 1);
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !selectedCategoryId) return;
    if (iconName && !isCategoryIcon(iconName)) {
      setLoadError('Selecione um ícone válido da biblioteca.');
      return;
    }

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

  const handleCategoryStatusToggle = async (category: BaseCategory) => {
    setUpdatingCategoryId(category.id);
    setLoadError(null);
    const result = await setAdminGuideCategoryStatusAction(category.id, !category.is_active);
    if (!result.success) {
      setLoadError(result.error || 'Não foi possível alterar o status da categoria.');
      setUpdatingCategoryId(null);
      return;
    }
    await fetchData();
    setUpdatingCategoryId(null);
  };

  const handleFeaturedToggle = async (category: BaseCategory) => {
    if (!tenantId) return;
    if (!category.is_active && !featuredCategoryIds.has(category.id)) {
      setLoadError('Ative a categoria antes de adicioná-la aos destaques do Guia.');
      return;
    }

    setUpdatingCategoryId(category.id);
    setLoadError(null);
    try {
      const supabase = createClient();
      if (featuredCategoryIds.has(category.id)) {
        const { error } = await (supabase as any)
          .from('directory_featured_categories')
          .delete()
          .eq('tenant_id', tenantId)
          .eq('category_id', category.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('directory_featured_categories').insert({
          tenant_id: tenantId,
          category_id: category.id,
          custom_title: null,
          icon_name: normalizeCategoryIcon(category.icon || 'briefcase'),
          display_order: featured.length + 1,
          is_active: true,
        });
        if (error) throw error;
      }
      await fetchData();
    } catch (error) {
      setLoadError(dataErrorMessage(error));
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  const openCategoryEditor = (category: BaseCategory) => {
    setCategoryEditor(category);
    setCategoryName(category.name);
    setCategorySlug(category.slug);
    setCategoryIcon(normalizeCategoryIcon(category.icon || 'briefcase'));
    setCategoryActive(category.is_active);
    setLoadError(null);
  };

  const handleCategoryEdit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!categoryEditor) return;
    setSaving(true);
    setLoadError(null);
    const result = await updateAdminGuideCategoryAction({
      id: categoryEditor.id,
      name: categoryName,
      slug: categorySlug,
      icon: categoryIcon || null,
      isActive: categoryActive,
    });
    if (!result.success) {
      setLoadError(result.error || 'Não foi possível editar a categoria.');
      setSaving(false);
      return;
    }
    setCategoryEditor(null);
    setSuccessMsg('Categoria atualizada com sucesso!');
    await fetchData();
    setSaving(false);
  };

  const handleCategoryDelete = async (category: BaseCategory) => {
    if (!confirm(`Excluir permanentemente a categoria “${category.name}”? Esta ação não pode ser desfeita.`)) return;
    setUpdatingCategoryId(category.id);
    setLoadError(null);
    const result = await deleteAdminGuideCategoryAction(category.id);
    if (!result.success) {
      setLoadError(result.error || 'Não foi possível excluir a categoria.');
      setUpdatingCategoryId(null);
      return;
    }
    setSuccessMsg('Categoria excluída com sucesso!');
    await fetchData();
    setUpdatingCategoryId(null);
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

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Categorias em Destaque</h2>
          <p className="text-xs text-gray-500">Selecione quais categorias aparecerão no grid principal da Home do Guia e personalize o título ou ícone.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          disabled={!tenantId || !allCategories.some((category) => category.is_active)}
          className="flex items-center gap-2 bg-amber-900 text-white px-4 py-2 rounded-md font-semibold text-sm hover:bg-amber-800 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="w-4 h-4" /> Criar Categoria
        </button>
      </div>

      {/* Catálogo canônico: todas as categorias globais, independentemente do status. */}
      <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-gray-50 px-4 py-3">
          <div>
            <h3 className="font-semibold text-gray-900">Catálogo completo de categorias</h3>
            <p className="text-xs text-gray-500">Categorias globais da tabela categories, incluindo registros inativos.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200">
            {filteredCategories.length} de {allCategories.length}
          </span>
        </div>

        <div className="grid gap-3 border-b bg-white p-4 sm:grid-cols-3">
          <label className="text-xs font-semibold text-gray-700">
            Status
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="all">Ativas e inativas</option>
              <option value="active">Somente ativas</option>
              <option value="inactive">Somente inativas</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Destaque
            <select
              value={featuredFilter}
              onChange={(event) => setFeaturedFilter(event.target.value as typeof featuredFilter)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="all">Todas</option>
              <option value="featured">Somente destacadas</option>
              <option value="not_featured">Não destacadas</option>
            </select>
          </label>

          <label className="text-xs font-semibold text-gray-700">
            Ordenar por nome
            <select
              value={nameOrder}
              onChange={(event) => setNameOrder(event.target.value as typeof nameOrder)}
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
            >
              <option value="asc">A–Z</option>
              <option value="desc">Z–A</option>
            </select>
          </label>
        </div>

        {allCategories.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Nenhuma categoria global encontrada.</div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">Nenhuma categoria corresponde aos filtros selecionados.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b bg-white font-semibold text-gray-700">
                <tr>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Slug</th>
                  <th className="p-3">Escopo</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Destaque</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-800">
                {filteredCategories.map((category) => {
                  const CategoryIcon = resolveCategoryIcon(category.icon);
                  const isFeatured = featuredCategoryIds.has(category.id);
                  return (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">
                        <span className="inline-flex items-center gap-2"><CategoryIcon className="h-4 w-4 text-amber-800" />{category.name}</span>
                      </td>
                      <td className="p-3 text-gray-500">{category.slug}</td>
                      <td className="p-3 text-gray-500">{category.tenant_id ? 'Tenant' : 'Global'}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleCategoryStatusToggle(category)}
                          disabled={updatingCategoryId === category.id}
                          aria-label={`${category.is_active ? 'Desativar' : 'Ativar'} categoria ${category.name}`}
                          className={`rounded-full px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${category.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          {updatingCategoryId === category.id ? 'Alterando…' : category.is_active ? 'Ativa' : 'Inativa'}
                        </button>
                      </td>
                      <td className="p-3">
                        <button
                          type="button"
                          onClick={() => handleFeaturedToggle(category)}
                          disabled={updatingCategoryId === category.id}
                          aria-label={`${isFeatured ? 'Remover' : 'Adicionar'} ${category.name} ${isFeatured ? 'dos' : 'aos'} destaques`}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-60 ${isFeatured ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                          <Star className={`h-4 w-4 ${isFeatured ? 'fill-current' : ''}`} />
                          {updatingCategoryId === category.id ? 'Alterando…' : isFeatured ? 'Destacada' : 'Não destacada'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap p-3 text-right">
                        <button
                          type="button"
                          onClick={() => openCategoryEditor(category)}
                          className="rounded p-1.5 text-gray-700 hover:bg-gray-100"
                          aria-label={`Editar categoria ${category.name}`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCategoryDelete(category)}
                          disabled={updatingCategoryId === category.id}
                          className="ml-1 rounded p-1.5 text-red-600 hover:bg-red-50 disabled:cursor-wait disabled:opacity-50"
                          aria-label={`Excluir categoria ${category.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {categoryEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Editar categoria</h3>
              <button type="button" onClick={() => setCategoryEditor(null)} className="text-gray-400 hover:text-gray-600" aria-label="Fechar edição">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCategoryEdit} className="space-y-4">
              <label className="block text-xs font-semibold text-gray-700">
                Nome
                <input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} required minLength={2} maxLength={100} className="mt-1 block w-full rounded-md border px-3 py-2 text-sm font-normal" />
              </label>
              <label className="block text-xs font-semibold text-gray-700">
                Slug
                <input value={categorySlug} onChange={(event) => setCategorySlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="mt-1 block w-full rounded-md border px-3 py-2 text-sm font-normal" />
              </label>
              <fieldset>
                <legend className="mb-2 text-xs font-semibold text-gray-700">Ícone</legend>
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-4">
                  {CATEGORY_ICON_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = categoryIcon === option.value;
                    return (
                      <button key={option.value} type="button" onClick={() => setCategoryIcon(option.value)} aria-pressed={selected} className={`flex flex-col items-center gap-1 rounded-md border p-2 text-[10px] ${selected ? 'border-amber-800 bg-amber-50 text-amber-950' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                        <Icon className="h-5 w-5" /><span className="w-full truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input type="checkbox" checked={categoryActive} onChange={(event) => setCategoryActive(event.target.checked)} className="rounded" /> Categoria ativa
              </label>
              <div className="flex justify-end gap-2 border-t pt-4">
                <button type="button" onClick={() => setCategoryEditor(null)} className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-amber-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista de destaques configurados para o tenant atual. */}
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
              {featured.map((f) => {
                const FeaturedIcon = resolveCategoryIcon(f.icon_name || f.categories?.icon);
                return (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-amber-900">{f.display_order}</td>
                    <td className="p-3 font-medium">{f.categories?.name || f.category_id}</td>
                    <td className="p-3 text-gray-600">{f.custom_title || f.categories?.name || 'Padrão'}</td>
                    <td className="p-3 text-gray-500"><span className="inline-flex items-center gap-2"><FeaturedIcon className="h-4 w-4" />{f.icon_name || f.categories?.icon || 'briefcase'}</span></td>
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
                )
              })}
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
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    const categoryIcon = allCategories.find((category) => category.id === e.target.value)?.icon || 'briefcase';
                    setIconName(normalizeCategoryIcon(categoryIcon));
                  }}
                  disabled={Boolean(editingItem)}
                  required
                  className="w-full px-3 py-1.5 border rounded-md text-sm bg-white disabled:bg-gray-100"
                >
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.is_active}>
                      {c.name} ({c.slug}){c.is_active ? '' : ' — inativa'}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-stone-500">Categorias inativas aparecem para administração, mas precisam ser ativadas antes de receber destaque no Guia.</p>
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

              <fieldset>
                <legend className="mb-2 block text-xs font-semibold text-gray-700">Ícone da categoria</legend>
                <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto rounded-lg border p-2 sm:grid-cols-4">
                  {CATEGORY_ICON_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const selected = iconName === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        title={option.label}
                        aria-pressed={selected}
                        onClick={() => setIconName(option.value)}
                        className={`flex flex-col items-center gap-1 rounded-md border p-2 text-[10px] transition-colors ${selected ? 'border-amber-800 bg-amber-50 text-amber-950' : 'border-stone-200 text-stone-600 hover:bg-stone-50'}`}
                      >
                        <Icon className="h-5 w-5" />
                        <span className="w-full truncate">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

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
