'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ChangeRequestItem } from '@/lib/advertiser/change-requests-service';
import { PendingChangesNotice } from '@/components/advertiser/PendingChangesNotice';
import { ImageFramingModal } from '@/components/advertiser/ImageFramingModal';
import type { FramingKind } from '@/lib/media/image-framing';
import Link from 'next/link';
import {
  Image as ImageIcon,
  Camera,
  Upload,
  Trash2,
  MoveLeft,
  MoveRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Award,
  ArrowRight,
  X,
  Video,
} from 'lucide-react';
import {
  AdvertiserProfileDTO,
  AdvertiserMediaItem,
  updateAdvertiserMediaAction,
  uploadAdvertiserAssetAction,
} from '@/lib/advertiser/advertiser-profile-service';

export default function AdvertiserMediaManagementClient({
  data,
  requests,
}: {
  data: AdvertiserProfileDTO;
  requests: { pending: ChangeRequestItem[]; recent: ChangeRequestItem[] };
}) {
  const { business, quotas, gallery_photos: initialGallery } = data;
  const router = useRouter();
  const mediaTypes = ['logo', 'cover', 'gallery', 'video'];

  const [logoUrl] = useState(business.logo_url || '/logoconexao_red_vert.png');
  const [coverUrl] = useState(business.cover_url || '/capa-padrao.jpg');
  const [gallery, setGallery] = useState<AdvertiserMediaItem[]>(initialGallery);
  const [videoUrl, setVideoUrl] = useState(data.business_video?.url || '');
  const [hasVideo, setHasVideo] = useState(Boolean(data.business_video));
  const [savingVideo, setSavingVideo] = useState(false);


  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Enquadramento (zoom, posição, ajuste e fundo) antes de enviar: igual ao Prontuário 360.
  const [framing, setFraming] = useState<{ kind: FramingKind; source: File | string; title: string } | null>(null);

  const FRAMING_TITLE: Record<FramingKind, string> = {
    logo: 'Ajustar logomarca',
    cover: 'Ajustar imagem de capa',
    gallery: 'Ajustar foto da galeria',
  };

  const openFraming = (kind: FramingKind, source: File | string) => {
    setFeedback(null);
    setFraming({ kind, source, title: FRAMING_TITLE[kind] });
  };

  const pickFile = (kind: FramingKind) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Selecione um arquivo de imagem (JPG, PNG ou WebP).' });
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'A imagem excede 15 MB. Escolha um arquivo menor.' });
      return;
    }
    if (kind === 'gallery' && gallery.length + pendingGallery >= quotas.photos_limit) {
      setFeedback({ type: 'error', message: `Você utilizou todas as ${quotas.photos_limit} fotos disponíveis no seu plano.` });
      return;
    }
    openFraming(kind, file);
  };

  const handleLogoChange = pickFile('logo');
  const handleCoverChange = pickFile('cover');
  const handleAddGalleryPhoto = pickFile('gallery');

  /** Recebe a imagem já enquadrada e envia. Devolve o erro (o editor continua aberto) ou nada (fecha). */
  const submitFramed = async (file: File): Promise<string | void> => {
    if (!framing) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('businessId', business.id);
    formData.append('assetType', framing.kind);
    if (framing.kind === 'gallery' && newPhotoTitle) formData.append('title', newPhotoTitle);

    const res = await uploadAdvertiserAssetAction(formData);
    if (!res.success) return res.message || 'Não foi possível enviar a imagem.';

    // Fica em análise; o que está publicado continua sendo exibido até a aprovação.
    if (framing.kind === 'gallery') setNewPhotoTitle('');
    setFeedback({ type: 'success', message: res.message });
    setFraming(null);
    router.refresh();
  };

  const hasRealLogo = Boolean(business.logo_url) && !/logofallback|logoconexao/i.test(business.logo_url ?? '');
  const hasRealCover = Boolean(business.cover_url) && !/capafallback|capa-padrao/i.test(business.cover_url ?? '');

  const handleDeletePhoto = async (photoId: string) => {
    setGallery(gallery.filter((p) => p.id !== photoId));
    await updateAdvertiserMediaAction(business.id, 'gallery_delete', { photoId });
    setFeedback({ type: 'success', message: 'Foto removida da galeria.' });
  };

  const handleMovePhoto = (index: number, direction: 'left' | 'right') => {
    const newIdx = direction === 'left' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= gallery.length) return;

    const updated = [...gallery];
    const temp = updated[index]!;
    updated[index] = updated[newIdx]!;
    updated[newIdx] = temp;

    setGallery(updated);
    void updateAdvertiserMediaAction(business.id, 'gallery_reorder', { order: updated.map((photo) => photo.id) }).then((result) => {
      setFeedback({ type: result.success ? 'success' : 'error', message: result.success ? 'Ordem das fotos atualizada.' : result.message });
    });
  };

  const pendingGallery = requests.pending.filter((r) => r.entityType === 'gallery').length;
  const isQuotaFull = gallery.length + pendingGallery >= quotas.photos_limit;

  const handleSaveVideo = async () => {
    setSavingVideo(true);
    const result = await updateAdvertiserMediaAction(business.id, 'video_set', { url: videoUrl });
    // O vídeo novo fica em análise: o que está publicado não muda até a aprovação.
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    if (result.success) router.refresh();
    setSavingVideo(false);
  };

  const handleDeleteVideo = async () => {
    const result = await updateAdvertiserMediaAction(business.id, 'video_delete', {});
    if (result.success) {
      setVideoUrl('');
      setHasVideo(false);
    }
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
  };

  return (
    <div className="space-y-6 text-left">
      {framing && (
        <ImageFramingModal
          kind={framing.kind}
          source={framing.source}
          title={framing.title}
          onConfirm={submitFramed}
          onCancel={() => setFraming(null)}
        />
      )}

      <PendingChangesNotice pending={requests.pending.filter((r) => mediaTypes.includes(r.entityType))} recent={requests.recent.filter((r) => mediaTypes.includes(r.entityType))} />

      {/* HEADER DA TELA & PRÉ-VISUALIZAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
            Minha Empresa • Identidade Visual
          </span>
          <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">
            Fotos e Mídias do Anúncio
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Gerencie o logotipo, a imagem de capa e a galeria de fotos exibidas no seu anúncio público.
          </p>
        </div>

        <Link
          href={`/guia/${business.slug}`}
          target="_blank"
          className="px-4 py-2.5 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-2xl border border-[#C9A227]/40 transition-all flex items-center gap-2 self-start sm:self-auto shadow-md"
        >
          <Eye className="w-4 h-4 text-[#C9A227]" />
          <span>Ver como minha empresa aparece no Guia</span>
        </Link>
      </div>

      {/* FEEDBACK DE AÇÃO */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50 border-amber-200 text-amber-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* SEÇÃO 1: LOGOTIPO & CAPA CORPORATIVA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LOGOTIPO */}
        <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#C9A227]" /> Logotipo Comercial
          </h2>

          <div className="space-y-4 text-center">
            <div className="w-32 h-32 mx-auto rounded-2xl bg-stone-100 border border-stone-300 p-2 overflow-hidden flex items-center justify-center shadow-inner relative">
              <img
                src={logoUrl}
                alt="Logotipo da Empresa"
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-stone-500 font-mono">
                Recomendação: Formato quadrado (400x400px), PNG ou WEBP com fundo transparente ou branco. Máx 5MB.
              </p>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors">
                <Upload className="w-4 h-4 text-[#C9A227]" />
                <span>Substituir Logo</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </label>
              {hasRealLogo && (
                <button
                  type="button"
                  onClick={() => openFraming('logo', logoUrl)}
                  className="ml-2 inline-flex min-h-9 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  Ajustar a logo atual
                </button>
              )}
            </div>
          </div>
        </div>

        {/* CAPA CORPORATIVA (PROPORÇÃO DO PERFIL PÚBLICO) */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-base font-serif font-bold text-stone-900 border-b border-stone-100 pb-3 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-600" /> Imagem de Capa Corporativa (Banner)
          </h2>

          <div className="space-y-4">
            <div className="w-full h-44 rounded-2xl bg-stone-100 border border-stone-300 overflow-hidden relative shadow-inner">
              <img
                src={coverUrl}
                alt="Capa da Empresa"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <p className="text-[11px] text-stone-500 font-mono">
                Recomendação: Proporção horizontal banner (1200x400px), JPG ou WEBP. A capa é o primeiro elemento visual visto pelos clientes.
              </p>

              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#3B0B14] hover:bg-[#520f1c] text-[#C9A227] text-xs font-bold rounded-xl border border-[#C9A227]/40 cursor-pointer transition-colors shrink-0">
                <Upload className="w-4 h-4 text-[#C9A227]" />
                <span>Substituir Capa</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleCoverChange}
                />
              </label>
              {hasRealCover && (
                <button
                  type="button"
                  onClick={() => openFraming('cover', coverUrl)}
                  className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-stone-300 px-3 text-xs font-bold text-stone-700 hover:bg-stone-50"
                >
                  Ajustar a capa atual
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {quotas.videos_limit > 0 && (
        <section className="rounded-3xl border border-[#C9A227]/40 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 font-serif text-lg font-bold text-stone-900"><Video className="h-5 w-5 text-[#C9A227]" /> Vídeo institucional</h2>
          <p className="mt-1 text-xs text-stone-500">Benefício do Plano Acácia: publique um link HTTPS de vídeo hospedado, YouTube ou Vimeo.</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." className="min-w-0 flex-1 rounded-xl border border-stone-300 bg-stone-50 px-3 py-2.5 text-sm outline-none focus:border-[#C9A227]" />
            <button type="button" onClick={handleSaveVideo} disabled={savingVideo || !videoUrl.trim()} className="rounded-xl bg-[#3B0B14] px-4 py-2.5 text-xs font-bold text-[#C9A227] disabled:opacity-50">{savingVideo ? 'Salvando...' : 'Salvar vídeo'}</button>
            {hasVideo && <button type="button" onClick={handleDeleteVideo} className="rounded-xl border border-red-300 px-4 py-2.5 text-xs font-bold text-red-700">Remover</button>}
          </div>
        </section>
      )}

      {/* SEÇÃO 2: GALERIA DE FOTOS (COM COTA NUMÉRICA DO PLANO OURO) */}
      <div className="bg-white border border-stone-200 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <div>
            <span className="text-[11px] font-mono font-bold text-stone-500 uppercase tracking-wider block">
              Galeria de Fotos da Empresa
            </span>
            <h2 className="text-lg font-serif font-bold text-stone-900 mt-0.5">
              {gallery.length} de {quotas.photos_limit} fotos utilizadas
            </h2>
          </div>

          {!isQuotaFull ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newPhotoTitle}
                onChange={(e) => setNewPhotoTitle(e.target.value)}
                placeholder="Título da foto (opcional)"
                className="px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:border-[#C9A227]"
              />
              <label className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 shrink-0">
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Adicionar Foto</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAddGalleryPhoto}
                />
              </label>
            </div>
          ) : (
            <Link
              href="/anunciante/plano"
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Award className="w-4 h-4 text-amber-700" />
              <span>Conhecer outros planos</span>
              <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
            </Link>
          )}
        </div>

        {/* ALERTA DE COTA TOTALMENTE UTILIZADA */}
        {isQuotaFull && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="font-semibold">
                Você utilizou todas as {quotas.photos_limit} fotos disponíveis no seu Plano Acácia.
              </span>
            </div>
            <Link
              href="/anunciante/plano"
              className="px-3 py-1.5 bg-[#3B0B14] text-[#C9A227] font-bold rounded-xl text-xs shrink-0"
            >
              Fazer Upgrade
            </Link>
          </div>
        )}

        {/* GRID DE FOTOS DA GALERIA */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {gallery.map((photo, idx) => (
            <div
              key={photo.id}
              className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden group space-y-2 relative shadow-xs"
            >
              <div className="h-36 bg-stone-200 overflow-hidden relative">
                <img
                  src={photo.url}
                  alt={photo.title || `Foto ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setLightboxImage(photo.url)}
                />
                <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-xs text-white text-[10px] font-mono font-bold rounded-md">
                  #{idx + 1}
                </span>
              </div>

              <div className="p-3 space-y-2">
                <span className="font-bold text-xs text-stone-900 block truncate">
                  {photo.title || `Foto ${idx + 1}`}
                </span>

                <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-stone-600">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMovePhoto(idx, 'left')}
                      disabled={idx === 0}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 disabled:opacity-30"
                      title="Mover para a esquerda"
                    >
                      <MoveLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMovePhoto(idx, 'right')}
                      disabled={idx === gallery.length - 1}
                      className="p-1 hover:bg-stone-200 rounded text-stone-600 disabled:opacity-30"
                      title="Mover para a direita"
                    >
                      <MoveRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="p-1 hover:bg-red-50 text-stone-400 hover:text-red-600 rounded transition-colors"
                    title="Excluir foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIGHTBOX MODAL PARA PRÉ-VISUALIZAÇÃO AMPLIADA */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-amber-400 p-2"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={lightboxImage}
              alt="Ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
