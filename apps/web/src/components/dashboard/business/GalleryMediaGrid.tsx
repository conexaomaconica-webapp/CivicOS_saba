'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { addGalleryMediaAction, deleteGalleryMediaAction } from '@/app/actions/business-profile-actions';

export interface GalleryMediaItem {
  id: string;
  url: string;
  title?: string | null;
  displayOrder?: number;
}

interface GalleryMediaGridProps {
  businessId: string;
  initialItems: GalleryMediaItem[];
  maxPhotosLimit: number;
}

export function GalleryMediaGrid({
  businessId,
  initialItems,
  maxPhotosLimit,
}: GalleryMediaGridProps) {
  const [items, setItems] = useState<GalleryMediaItem[]>(initialItems);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canAddMore = maxPhotosLimit === 0 ? false : items.length < maxPhotosLimit;

  const handleAddPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!canAddMore) {
      setErrorMsg(`O limite do seu plano é de no máximo ${maxPhotosLimit} foto(s) na galeria.`);
      return;
    }

    setIsUploading(true);
    setErrorMsg(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        const res = await addGalleryMediaAction(businessId, { url: fileDataUrl });
        setItems(prev => [...prev, { id: res.item.id, url: res.item.url, displayOrder: res.item.display_order }]);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao adicionar foto.');
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover esta imagem da galeria?')) return;
    try {
      await deleteGalleryMediaAction(businessId, id);
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao remover foto.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-slate-900">Galeria de Fotos Comercial</h4>
          <p className="text-xs text-slate-500">
            {items.length} de {maxPhotosLimit === 0 ? '0 (Plano Bronze)' : `${maxPhotosLimit} fotos permitidas no seu plano`}
          </p>
        </div>

        {canAddMore && (
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow transition-colors inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Adicionar Foto
            <input
              type="file"
              accept="image/*"
              onChange={handleAddPhoto}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        )}
      </div>

      {errorMsg && <p className="text-xs text-red-600 font-medium">{errorMsg}</p>}

      {maxPhotosLimit === 0 ? (
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          O plano Bronze não inclui galeria de fotos comercial. Faça upgrade para o plano Prata ou Ouro para publicar imagens do seu estabelecimento.
        </div>
      ) : items.length === 0 ? (
        <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
          <p className="text-xs text-slate-500">Nenhuma foto cadastrada na galeria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((item, index) => (
            <div key={item.id} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
              <Image
                src={item.url}
                alt={item.title || `Foto ${index + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="absolute top-2 right-2 bg-red-600/90 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700 shadow"
                title="Remover foto"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
