'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Landmark, Plus, Upload, Search, Edit, Trash2, Eye, EyeOff, Loader2, Scroll } from 'lucide-react';

type LodgeItem = {
  id: string;
  slug?: string | null;
  name: string;
  code_number?: number | null;
  potency?: string | null;
  rite?: string | null;
  city?: string | null;
  state?: string | null;
  worshipful_master_name?: string | null;
  is_published: boolean;
  is_featured: boolean;
  created_at: string;
};

export default function AdminLojasPage() {
  const [loading, setLoading] = useState(true);
  const [lodges, setLodges] = useState<LodgeItem[]>([]);
  const [search, setSearch] = useState('');

  const fetchLodges = async () => {
    try {
      const supabase = createClient();
      const { data: profileData } = await (supabase as any).from('user_profiles').select('tenant_id').maybeSingle();
      const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';

      const { data, error } = await (supabase as any)
        .from('organizations')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLodges((data as LodgeItem[]) || []);
    } catch (err) {
      console.error('Erro ao buscar lojas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLodges();
  }, []);

  const handleTogglePublished = async (id: string, currentStatus: boolean) => {
    try {
      const supabase = createClient();
      await (supabase as any).from('organizations').update({ is_published: !currentStatus }).eq('id', id);
      fetchLodges();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja excluir a loja "${name}"? Esta ação removerá a loja, contatos e reuniões associados.`)) return;
    try {
      const supabase = createClient();
      await (supabase as any).from('organizations').delete().eq('id', id);
      fetchLodges();
    } catch (err) {
      console.error('Erro ao excluir loja:', err);
    }
  };

  const filteredLodges = lodges.filter((l) => {
    const matchSearch =
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.code_number && l.code_number.toString().includes(search)) ||
      (l.city && l.city.toLowerCase().includes(search.toLowerCase()));
    return matchSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando lojas maçônicas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-2xs">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-amber-900" />
            <span>Lojas Maçônicas</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Gerenciamento de oficinas, potências, ritos, reuniões e importação por planilha Excel.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/admin/lojas/importar"
            className="flex items-center gap-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Importar Excel</span>
          </Link>

          <Link
            href="/admin/lojas/potencias"
            className="flex items-center gap-1.5 bg-stone-100 text-stone-800 border border-stone-200 px-3.5 py-2.5 rounded-xl font-bold text-xs hover:bg-stone-200 transition-colors"
          >
            <Scroll className="w-4 h-4 text-amber-900" />
            <span>Potências</span>
          </Link>

          <Link
            href="/admin/lojas/nova"
            className="flex items-center gap-1.5 bg-[#3b0b14] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-[#5d1523] transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Loja</span>
          </Link>
        </div>
      </div>

      {/* Toolbar & Filtros */}
      <div className="bg-white p-4 rounded-2xl border shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, número ou cidade..."
            className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-amber-900 bg-stone-50"
          />
        </div>

        <div className="text-xs font-semibold text-stone-500">
          Mostrando <strong className="text-gray-900">{filteredLodges.length}</strong> de <strong>{lodges.length}</strong> lojas
        </div>
      </div>

      {/* Tabela de Lojas */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-stone-50 border-b text-stone-700 font-bold uppercase tracking-wider">
              <th className="p-4">Loja / Número</th>
              <th className="p-4">Potência & Rito</th>
              <th className="p-4">Oriente / Cidade</th>
              <th className="p-4">Venerável</th>
              <th className="p-4">Publicada</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredLodges.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-stone-500">
                  Nenhuma loja maçônica cadastrada. Clique em "Nova Loja" ou "Importar Excel" para começar.
                </td>
              </tr>
            ) : (
              filteredLodges.map((lodge) => (
                <tr key={lodge.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-4 font-bold text-gray-900">
                    <div className="flex items-center gap-2">
                      <Landmark className="w-4 h-4 text-amber-900 shrink-0" />
                      <span>{lodge.name} {lodge.code_number ? `nº ${lodge.code_number}` : ''}</span>
                    </div>
                  </td>
                  <td className="p-4 text-stone-600">
                    <div className="flex items-center gap-1.5 flex-wrap font-semibold">
                      {lodge.potency && <span className="bg-amber-50 border border-amber-200 text-amber-900 px-2 py-0.5 rounded text-[11px]">{lodge.potency}</span>}
                      {lodge.rite && <span className="bg-stone-100 border border-stone-200 text-stone-700 px-2 py-0.5 rounded text-[11px]">{lodge.rite}</span>}
                    </div>
                  </td>
                  <td className="p-4 text-stone-700">
                    {lodge.city}{lodge.state ? `, ${lodge.state}` : ''}
                  </td>
                  <td className="p-4 text-stone-700 font-medium">
                    {lodge.worshipful_master_name || '-'}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleTogglePublished(lodge.id, lodge.is_published)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 transition-colors ${
                        lodge.is_published ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      }`}
                    >
                      {lodge.is_published ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      <span>{lodge.is_published ? 'Publicada' : 'Oculta'}</span>
                    </button>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {lodge.slug && (
                        <Link
                          href={`/guia/lojas/${lodge.slug}`}
                          target="_blank"
                          className="p-1.5 text-amber-900 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Visualizar página institucional pública"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}
                      <Link
                        href={`/admin/lojas/editar/${lodge.id}`}
                        className="p-1.5 text-stone-600 hover:text-amber-900 hover:bg-stone-100 rounded-lg transition-colors"
                        title="Editar loja"
                      >
                        <Edit className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(lodge.id, lodge.name)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir loja"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
