'use client';

import { systemConfirm, systemNotify } from '@/components/system/SystemFeedback';
import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Edit2, Loader2, CheckCircle2, X } from 'lucide-react';
import { BannerImageField } from '@/components/admin/BannerImageField';
import { getCanonicalAdminTenantAction } from '@/app/actions/admin-tenant-context';

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

type BannerContentMode = 'image_text' | 'image_only';

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
  const [imageDesktopUrl, setImageDesktopUrl] = useState('');
  const [imageMobileUrl, setImageMobileUrl] = useState('');
  const [city, setCity] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [contentMode, setContentMode] = useState<BannerContentMode>('image_text');

  const fetchBanners = async () => {
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) throw new Error('Usuário não autenticado.');
      const tenantResult = await getCanonicalAdminTenantAction();
      const tid = tenantResult.tenantId;
      if (!tenantResult.success) throw new Error(tenantResult.error);
      if (!tid) throw new Error('Tenant do administrador não identificado.');
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
      setContentMode(!banner.title?.trim() && !banner.subtitle?.trim() && !banner.cta_text?.trim() ? 'image_only' : 'image_text');
    } else {
      setEditingBanner(null);
      setTitle('');
      setSubtitle('DESTAQUE DA SEMANA');
      setCtaText('Conhecer empresas');
      setCtaUrl('/guia');
      setImageDesktopUrl('');
      setImageMobileUrl('');
      setCity('');
      setDisplayOrder(banners.length + 1);
      setIsActive(true);
      setContentMode('image_text');
    }
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !imageDesktopUrl || (contentMode === 'image_text' && !title.trim())) return;

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        tenant_id: tenantId,
        title: contentMode === 'image_only' ? '' : title.trim(),
        subtitle: contentMode === 'image_only' ? null : subtitle || null,
        cta_text: contentMode === 'image_only' ? null : ctaText || null,
        cta_url: contentMode === 'image_only' ? null : ctaUrl || null,
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
      systemNotify({ type: 'danger', message: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await systemConfirm({ message: 'Deseja excluir este banner?', danger: true, confirmLabel: 'Excluir' }))) return;
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
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
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
                    <div>{b.title || 'Banner somente imagem'}</div>
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
          </div>
        )}
      </div>

      {/* Modal Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">{editingBanner ? 'Editar Banner' : 'Novo Banner'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3">
              <fieldset>
                <legend className="block text-xs font-semibold text-gray-700 mb-2">Formato do banner</legend>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setContentMode('image_text')} className={`rounded-md border px-3 py-2 text-sm font-medium ${contentMode === 'image_text' ? 'border-amber-800 bg-amber-50 text-amber-900' : 'border-gray-200 text-gray-600'}`}>
                    Imagem com texto
                  </button>
                  <button type="button" onClick={() => setContentMode('image_only')} className={`rounded-md border px-3 py-2 text-sm font-medium ${contentMode === 'image_only' ? 'border-amber-800 bg-amber-50 text-amber-900' : 'border-gray-200 text-gray-600'}`}>
                    Somente imagem
                  </button>
                </div>
              </fieldset>

              {contentMode === 'image_text' && <div className="space-y-3">
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

              </div>}

              <BannerImageField
                label="Imagem Desktop *"
                value={imageDesktopUrl}
                onChange={setImageDesktopUrl}
                required
                hint="Imagem larga (ex.: 1920×720). É reduzida automaticamente (WebP, até ~450 KB)."
              />

              <BannerImageField
                label="Imagem Mobile (opcional)"
                value={imageMobileUrl}
                onChange={setImageMobileUrl}
                maxDimension={960}
                maxBytes={220 * 1024}
                hint="Sem uma imagem mobile, a imagem desktop também será usada no celular."
              />

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
