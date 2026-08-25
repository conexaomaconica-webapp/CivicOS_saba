'use client';

import React, { useState } from 'react';
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
  Loader2,
  Sparkles,
  Award,
  ArrowRight,
  X,
} from 'lucide-react';
import {
  AdvertiserProfileDTO,
  AdvertiserMediaItem,
  updateAdvertiserMediaAction,
} from '@/lib/advertiser/advertiser-profile-service';

export default function AdvertiserMediaManagementClient({ data }: { data: AdvertiserProfileDTO }) {
  const { business, quotas, gallery_photos: initialGallery } = data;

  const [logoUrl, setLogoUrl] = useState(business.logo_url || '/logoconexao_red_vert.png');
  const [coverUrl, setCoverUrl] = useState(business.cover_url || '/capa-padrao.jpg');
  const [gallery, setGallery] = useState<AdvertiserMediaItem[]>(initialGallery);

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'O arquivo excede o limite máximo de 5MB.' });
      return;
    }

    setUploadingLogo(true);
    setFeedback(null);

    // Simula upload com preview imediato
    setTimeout(async () => {
      const mockUrl = URL.createObjectURL(file);
      setLogoUrl(mockUrl);
      await updateAdvertiserMediaAction(business.id, 'logo', { url: mockUrl });
      setUploadingLogo(false);
      setFeedback({ type: 'success', message: 'Logotipo atualizado com sucesso.' });
    }, 1000);
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'O arquivo excede o limite máximo de 5MB.' });
      return;
    }

    setUploadingCover(true);
    setFeedback(null);

    setTimeout(async () => {
      const mockUrl = URL.createObjectURL(file);
      setCoverUrl(mockUrl);
      await updateAdvertiserMediaAction(business.id, 'cover', { url: mockUrl });
      setUploadingCover(false);
      setFeedback({ type: 'success', message: 'Imagem de capa atualizada com sucesso.' });
    }, 1000);
  };

  const handleAddGalleryPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (gallery.length >= quotas.photos_limit) {
      setFeedback({
        type: 'error',
        message: `Você utilizou todas as ${quotas.photos_limit} fotos disponíveis no seu Plano Ouro.`,
      });
      return;
    }

    setUploadingPhoto(true);
    setFeedback(null);

    setTimeout(async () => {
      const mockUrl = URL.createObjectURL(file);
      const newPhoto: AdvertiserMediaItem = {
        id: `photo-${Date.now()}`,
        url: mockUrl,
        title: newPhotoTitle || `Foto ${gallery.length + 1}`,
        display_order: gallery.length + 1,
      };

      const res = await updateAdvertiserMediaAction(business.id, 'gallery_add', {
        url: mockUrl,
        title: newPhoto.title,
      });

      if (res.success) {
        setGallery([...gallery, newPhoto]);
        setNewPhotoTitle('');
        setFeedback({ type: 'success', message: 'Foto adicionada à galeria com sucesso.' });
      } else {
        setFeedback({ type: 'error', message: res.message });
      }

      setUploadingPhoto(false);
    }, 1000);
  };

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
    setFeedback({ type: 'success', message: 'Ordem das fotos atualizada.' });
  };

  const isQuotaFull = gallery.length >= quotas.photos_limit;

  return (
    <div className="space-y-6 text-left">
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
              {uploadingLogo && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-amber-300 text-xs font-bold gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando...</span>
                </div>
              )}
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
                  disabled={uploadingLogo}
                />
              </label>
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
              {uploadingCover && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-amber-300 text-xs font-bold gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enviando Capa...</span>
                </div>
              )}
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
                  disabled={uploadingCover}
                />
              </label>
            </div>
          </div>
        </div>
      </div>

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
                {uploadingPhoto ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                ) : (
                  <Upload className="w-4 h-4 text-amber-400" />
                )}
                <span>Adicionar Foto</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAddGalleryPhoto}
                  disabled={uploadingPhoto}
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
                Você utilizou todas as {quotas.photos_limit} fotos disponíveis no seu Plano Ouro.
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
