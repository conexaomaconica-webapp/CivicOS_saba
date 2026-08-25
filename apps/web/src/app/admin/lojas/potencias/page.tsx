'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Scroll, ArrowLeft, Plus, Edit, Trash2, Loader2, Save } from 'lucide-react';

type PotencyItem = {
  id: string;
  name: string;
  abbreviation: string;
  slug: string;
  is_active: boolean;
};

export default function AdminPotenciasPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [potencies, setPotencies] = useState<PotencyItem[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PotencyItem | null>(null);
  const [name, setName] = useState('');
  const [abbreviation, setAbbreviation] = useState('');

  const fetchPotencies = async () => {
    try {
      const supabase = createClient();
      const { data: profileData } = await (supabase as any).from('profiles').select('tenant_id').maybeSingle();
      const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';
      setTenantId(tid);

      const { data } = await (supabase as any).from('masonic_potencies').select('*').eq('tenant_id', tid).order('name', { ascending: true });
      setPotencies((data as PotencyItem[]) || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPotencies();
  }, []);

  const handleOpenModal = (item?: PotencyItem) => {
    if (item) {
      setEditingItem(item);
      setName(item.name);
      setAbbreviation(item.abbreviation);
    } else {
      setEditingItem(null);
      setName('');
      setAbbreviation('');
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !name || !abbreviation) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const slug = abbreviation.toLowerCase().replace(/[^a-z0-9]+/g, '-');

      const payload = {
        tenant_id: tenantId,
        name,
        abbreviation,
        slug,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        const { error } = await (supabase as any).from('masonic_potencies').update(payload).eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('masonic_potencies').insert(payload);
        if (error) throw error;
      }

      setModalOpen(false);
      fetchPotencies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar potência';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deseja remover a potência "${name}"?`)) return;
    try {
      const supabase = createClient();
      await (supabase as any).from('masonic_potencies').delete().eq('id', id);
      fetchPotencies();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando potências...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/lojas" className="flex items-center gap-1 text-xs font-bold text-stone-600 hover:text-amber-900">
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lojas Maçônicas</span>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border shadow-2xs">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 flex items-center gap-2">
            <Scroll className="w-6 h-6 text-amber-900" />
            <span>Potências Maçônicas (Obediências)</span>
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Cadastro normalizado de Grandes Orientes, Grandes Lojas e Confederações.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 bg-[#3b0b14] text-white px-4 py-2.5 rounded-xl font-bold text-xs hover:bg-[#5d1523] transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Potência</span>
        </button>
      </div>

      <div className="bg-white border rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-stone-50 border-b text-stone-700 font-bold uppercase">
              <th className="p-4">Sigla</th>
              <th className="p-4">Nome Completo da Obediência</th>
              <th className="p-4">Slug</th>
              <th className="p-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {potencies.map((p) => (
              <tr key={p.id} className="hover:bg-stone-50">
                <td className="p-4 font-bold text-amber-900">{p.abbreviation}</td>
                <td className="p-4 font-semibold text-gray-900">{p.name}</td>
                <td className="p-4 text-stone-500 font-mono text-[11px]">{p.slug}</td>
                <td className="p-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleOpenModal(p)}
                      className="p-1.5 text-stone-600 hover:text-amber-900 hover:bg-stone-100 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal CRUD */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-gray-900">
              {editingItem ? 'Editar Potência' : 'Nova Potência Maçônica'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Sigla / Abreviação *</label>
                <input
                  type="text"
                  value={abbreviation}
                  onChange={(e) => setAbbreviation(e.target.value)}
                  placeholder="Ex: GOB, GLBA, COMAB"
                  className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 uppercase font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-800 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Grande Oriente do Brasil"
                  className="w-full px-3 py-2 border rounded-xl text-xs text-gray-900 bg-stone-50 outline-none focus:ring-2 focus:ring-amber-900 font-semibold"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-[#3b0b14] text-white px-5 py-2 rounded-xl text-xs font-bold hover:bg-[#5d1523]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 inline mr-1" />}
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
