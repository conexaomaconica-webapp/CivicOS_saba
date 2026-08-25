'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Loader2, CheckCircle2, X } from 'lucide-react';

type Banner = {
  id: string;
  tenant_id: string;
  title: string;
  subtitle?: string | null;
  cta_text?: string | null;
  cta_url?: string | null;
  image_desktop_url: string;
  image_mobile_url?: string | null;
  city?: string | null;
  display_order: number;
  is_active: boolean;
  start_at?: string | null;
  end_at?: string | null;
};

export default function AdminGuiaBannersPage() {
  const [loading, setLoading] = useState(true);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('DESTAQUE DA SEMANA');
  const [ctaText, setCtaText] = useState('Conhecer empresas');
  const [ctaUrl, setCtaUrl] = useState('/guia');
  const [imageDesktopUrl, setImageDesktopUrl] = useState('/visual-lab/assets/banner-reference');
  const [imageMobileUrl, setImageMobileUrl] = useState('');
  const [city, setCity] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const fetchBanners = async () => {
    try {
      const supabase = createClient();
      const { data: profileData } = await (supabase as any).from('profiles').select('tenant_id').maybeSingle();
      const tid = profileData?.tenant_id || '00000000-0000-0000-0000-000000000010';
      setTenantId(tid);

      const { data } = await (supabase as any)
        .from('directory_banners')
        .select('*')
        .eq('tenant_id', tid)
        .order('display_order', { ascending: true });

      setBanners((data as Banner[]) || []);
    } catch (err) {
      console.error('Erro ao buscar banners:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setTitle(banner.title);
      setSubtitle(banner.subtitle || '');
      setCtaText(banner.cta_text || '');
      setCtaUrl(banner.cta_url || '');
      setImageDesktopUrl(banner.image_desktop_url);
      setImageMobileUrl(banner.image_mobile_url || '');
      setCity(banner.city || '');
      setDisplayOrder(banner.display_order);
      setIsActive(banner.is_active);
    } else {
      setEditingBanner(null);
      setTitle('');
      setSubtitle('DESTAQUE DA SEMANA');
      setCtaText('Conhecer empresas');
      setCtaUrl('/guia');
      setImageDesktopUrl('/visual-lab/assets/banner-reference');
      setImageMobileUrl('');
      setCity('');
      setDisplayOrder(banners.length + 1);
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !title || !imageDesktopUrl) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        tenant_id: tenantId,
        title,
        subtitle: subtitle || null,
        cta_text: ctaText || null,
        cta_url: ctaUrl || null,
        image_desktop_url: imageDesktopUrl,
        image_mobile_url: imageMobileUrl || null,
        city: city || null,
        display_order: displayOrder,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editingBanner) {
        const { error } = await (supabase as any).from('directory_banners').update(payload).eq('id', editingBanner.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('directory_banners').insert(payload);
        if (error) throw error;
      }

      setSuccessMsg('Banner salvo com sucesso!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setModalOpen(false);
      fetchBanners();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar banner';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este banner?')) return;
    try {
      const supabase = createClient();
      await (supabase as any).from('directory_banners').delete().eq('id', id);
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando banners...
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
          <h2 className="text-lg font-bold text-gray-900">Banners do Carrossel</h2>
          <p className="text-xs text-gray-500">Cadastre e ordene os destaques da semana exibidos na Home do Guia.</p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-amber-900 text-white px-4 py-2 rounded-md font-semibold text-sm hover:bg-amber-800 transition-colors"
        >
          <Plus className="w-4 h-4" /> Novo Banner
        </button>
      </div>

      {/* Lista de Banners */}
      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        {banners.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">Nenhum banner cadastrado. Clique no botão acima para adicionar o primeiro.</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-700 border-b font-semibold">
              <tr>
                <th className="p-3">Ordem</th>
                <th className="p-3">Título</th>
                <th className="p-3">Cidade</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y text-gray-800">
              {banners.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-3 font-semibold text-amber-900">{b.display_order}</td>
                  <td className="p-3 font-medium">
                    <div>{b.title}</div>
                    <div className="text-xs text-gray-400">{b.subtitle}</div>
                  </td>
                  <td className="p-3">{b.city || 'Todas as Cidades'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${b.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                      {b.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <button onClick={() => handleOpenModal(b)} className="p-1.5 hover:bg-gray-100 rounded text-gray-700">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">{editingBanner ? 'Editar Banner' : 'Novo Banner'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título Principal *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full px-3 py-1.5 border rounded-md text-sm" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Subtítulo / Tag</label>
                <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full px-3 py-1.5 border rounded-md text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Texto do Botão CTA</label>
                  <input type="text" value={ctaText} onChange={(e) => setCtaText(e.target.value)} className="w-full px-3 py-1.5 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Link do CTA (URL)</label>
                  <input type="text" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} className="w-full px-3 py-1.5 border rounded-md text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">URL Imagem Desktop *</label>
                <input type="text" value={imageDesktopUrl} onChange={(e) => setImageDesktopUrl(e.target.value)} required className="w-full px-3 py-1.5 border rounded-md text-sm" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Cidade (Opcional)</label>
                  <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ex: Salvador, BA" className="w-full px-3 py-1.5 border rounded-md text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Ordem de Exibição</label>
                  <input type="number" min={1} value={displayOrder} onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 1)} className="w-full px-3 py-1.5 border rounded-md text-sm" />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input type="checkbox" id="isActive" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="rounded" />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Banner Ativo</label>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">Cancelar</button>
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
