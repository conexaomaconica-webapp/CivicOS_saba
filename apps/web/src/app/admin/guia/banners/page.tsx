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
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [contentMode, setContentMode] = useState<BannerContentMode>('image_text');
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
      setTitle(banner.title || '');
      setSubtitle(banner.subtitle || '');
      setCtaText(banner.cta_text || '');
      setCtaUrl(banner.cta_url || '');
      setImageDesktopUrl(banner.image_desktop_url);
      setImageMobileUrl(banner.image_mobile_url || '');
      setCity(banner.city || '');
      setDisplayOrder(banner.display_order);
      setIsActive(banner.is_active);
      setStartAt(banner.start_at ? banner.start_at.slice(0, 16) : '');
      setEndAt(banner.end_at ? banner.end_at.slice(0, 16) : '');
      setContentMode(!banner.subtitle?.trim() && !banner.cta_text?.trim() ? 'image_only' : 'image_text');
    } else {
      setEditingBanner(null);
      setTitle('');
      setSubtitle('');
      setCtaText('');
      setCtaUrl('/guia');
      setImageDesktopUrl('');
      setImageMobileUrl('');
      setCity('');
      setDisplayOrder(banners.length + 1);
      setIsActive(true);
      setStartAt('');
      setEndAt('');
      setContentMode('image_only');
    }
    setModalOpen(true);
  };

  const handleToggleActive = async (banner: Banner) => {
    setTogglingId(banner.id);
    const newActive = !banner.is_active;
    try {
      const supabase = createClient();
      const { error } = await (supabase as any)
        .from('directory_banners')
        .update({
          is_active: newActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', banner.id);

      if (error) throw error;

      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, is_active: newActive } : b))
      );
      systemNotify({
        type: 'success',
        message: newActive ? `Banner "${banner.title}" ativado com sucesso!` : `Banner "${banner.title}" desativado!`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao alterar status do banner';
      systemNotify({ type: 'danger', message: msg });
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !imageDesktopUrl) return;

    if (!title.trim()) {
      systemNotify({ type: 'warning', message: 'Preencha o título ou identificação do banner.' });
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        tenant_id: tenantId,
        title: title.trim(),
        subtitle: contentMode === 'image_only' ? null : subtitle.trim() || null,
        cta_text: contentMode === 'image_only' ? null : ctaText.trim() || null,
        cta_url: ctaUrl.trim() || null,
        image_desktop_url: imageDesktopUrl,
        image_mobile_url: imageMobileUrl || null,
        city: city || null,
        display_order: displayOrder,
        is_active: isActive,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
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
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b font-semibold">
                <tr>
                  <th className="p-3 w-16">Ordem</th>
                  <th className="p-3 w-28">Miniatura</th>
                  <th className="p-3">Título / Identificação</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Cidade</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y text-gray-800">
                {banners.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="p-3 font-semibold text-amber-900">{b.display_order}</td>
                    <td className="p-3">
                      <div className="w-24 h-12 rounded border bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center relative shadow-2xs">
                        {b.image_desktop_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={b.image_desktop_url}
                            alt={b.title || 'Banner'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">Sem foto</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 font-medium">
                      <div className="text-gray-900 font-semibold">{b.title || 'Banner sem título'}</div>
                      {b.subtitle && <div className="text-xs text-gray-500">{b.subtitle}</div>}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {b.subtitle || b.cta_text ? 'Imagem com texto' : 'Somente imagem'}
                        </span>
                        {b.cta_url && (
                          <span className="text-[10px] font-medium text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 truncate max-w-[200px]" title={b.cta_url}>
                            Link: {b.cta_url}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {b.image_mobile_url ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium">
                          <div className="w-9 h-9 rounded border overflow-hidden shrink-0 shadow-2xs">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.image_mobile_url} alt="Mobile" className="w-full h-full object-cover" />
                          </div>
                          <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                            Mobile ✓
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                          Auto (Desktop)
                        </span>
                      )}
                    </td>
                    <td className="p-3">{b.city || 'Todas as Cidades'}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-1 items-start">
                        <button
                          type="button"
                          disabled={togglingId === b.id}
                          onClick={() => handleToggleActive(b)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer shadow-2xs hover:opacity-90 disabled:opacity-50 ${
                            b.is_active
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                              : 'bg-stone-100 text-stone-600 border border-stone-300 hover:bg-stone-200'
                          }`}
                          title="Clique para alternar o status do banner diretamente"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              b.is_active ? 'bg-emerald-600' : 'bg-stone-400'
                            }`}
                          />
                          {togglingId === b.id ? (
                            <span className="flex items-center gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" /> ...
                            </span>
                          ) : b.is_active ? (
                            'Ativo'
                          ) : (
                            'Inativo'
                          )}
                        </button>

                        {/* Indicador de Desativação Automática ou Expiração */}
                        {b.end_at && (
                          <span
                            className={`text-[10px] ${
                              new Date(b.end_at).getTime() < Date.now()
                                ? 'text-rose-600 font-semibold'
                                : 'text-stone-500'
                            }`}
                            title={`Data de desativação: ${new Date(b.end_at).toLocaleString('pt-BR')}`}
                          >
                            {new Date(b.end_at).getTime() < Date.now() ? (
                              '⚠️ Expirado em ' +
                              new Date(b.end_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              })
                            ) : (
                              'Desativa: ' +
                              new Date(b.end_at).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                              }) +
                              ' às ' +
                              new Date(b.end_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            )}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => handleOpenModal(b)} className="p-1.5 hover:bg-gray-100 rounded text-gray-700" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(b.id)} className="p-1.5 hover:bg-red-50 text-red-600 rounded" title="Excluir">
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
                  <button type="button" onClick={() => setContentMode('image_only')} className={`rounded-md border px-3 py-2 text-sm font-medium ${contentMode === 'image_only' ? 'border-amber-800 bg-amber-50 text-amber-900' : 'border-gray-200 text-gray-600'}`}>
                    Somente imagem (Arte Pronta)
                  </button>
                  <button type="button" onClick={() => setContentMode('image_text')} className={`rounded-md border px-3 py-2 text-sm font-medium ${contentMode === 'image_text' ? 'border-amber-800 bg-amber-50 text-amber-900' : 'border-gray-200 text-gray-600'}`}>
                    Imagem com texto sobreposto
                  </button>
                </div>
              </fieldset>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Título / Identificação do Banner *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="Ex: 51º Retrô Mega Flash Back, Palestra Dr. Lucas Almeida..."
                  className="w-full px-3 py-1.5 border rounded-md text-sm"
                />
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Serve para identificar o banner no painel e como texto alternativo (Alt/Acessibilidade/SEO).
                </p>
              </div>

              {contentMode === 'image_text' ? (
                <div className="space-y-3 bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Subtítulo / Tag</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      placeholder="Ex: DESTAQUE DA SEMANA, NOVIDADE..."
                      className="w-full px-3 py-1.5 border rounded-md text-sm bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Texto do Botão CTA</label>
                      <input
                        type="text"
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        placeholder="Ex: Conhecer empresas"
                        className="w-full px-3 py-1.5 border rounded-md text-sm bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Link do CTA (URL)</label>
                      <input
                        type="text"
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="Ex: /guia ou /eventos/..."
                        className="w-full px-3 py-1.5 border rounded-md text-sm bg-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Link de Destino ao Clicar no Banner (URL) (Opcional)</label>
                  <input
                    type="text"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    placeholder="Ex: /guia/empresa-slug ou /eventos/meu-evento ou https://..."
                    className="w-full px-3 py-1.5 border rounded-md text-sm"
                  />
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Ao tocar ou clicar no banner, o usuário será direcionado para este endereço.
                  </p>
                </div>
              )}

              <BannerImageField
                label="Imagem Desktop (Horizontal / Panorâmica) *"
                value={imageDesktopUrl}
                onChange={setImageDesktopUrl}
                required
                hint="Imagem horizontal larga (ex.: 851×207 ou 1200×400). Reduzida e otimizada automaticamente."
              />

              <BannerImageField
                label="Imagem Mobile (Específica para Celular - Opcional)"
                value={imageMobileUrl}
                onChange={setImageMobileUrl}
                maxDimension={960}
                maxBytes={220 * 1024}
                hint="Recomendado: Proporção 16:9 ou 4:3 (ex.: 800×450). Se não enviar, a imagem desktop será adaptada automaticamente sem cortes no celular."
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

              <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 space-y-2.5">
                <span className="block text-xs font-semibold text-stone-800">
                  Agendamento e Desativação Automática
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Data/Hora de Desativação Automática
                    </label>
                    <input
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-md text-xs bg-white text-stone-900"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Ao atingir esta data e hora, o banner sairá automaticamente da página inicial.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Data/Hora de Início da Exibição (Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="w-full px-2.5 py-1.5 border rounded-md text-xs bg-white text-stone-900"
                    />
                    <p className="text-[10px] text-stone-500 mt-0.5">
                      Se preenchido, o banner só passará a ser exibido a partir deste momento.
                    </p>
                  </div>
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
