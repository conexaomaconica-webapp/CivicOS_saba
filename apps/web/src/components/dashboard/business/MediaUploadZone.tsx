'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { uploadBusinessAssetAction } from '@/app/actions/business-profile-actions';

interface MediaUploadZoneProps {
  businessId: string;
  assetType: 'logo' | 'cover';
  currentUrl?: string | null;
  label: string;
  aspectRatioClass?: string;
  onSuccess?: (newUrl: string) => void;
}

export function MediaUploadZone({
  businessId,
  assetType,
  currentUrl,
  label,
  aspectRatioClass = 'aspect-square',
  onSuccess,
}: MediaUploadZoneProps) {
  const [url, setUrl] = useState<string | null>(currentUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Por favor selecione um arquivo de imagem válido (PNG, JPEG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('O tamanho da imagem não deve exceder 5MB.');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const fileDataUrl = reader.result as string;
        const res = await uploadBusinessAssetAction(businessId, assetType, fileDataUrl);
        setUrl(res.url);
        if (onSuccess) onSuccess(res.url);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar imagem.');
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-800">{label}</label>
      <div className={`relative flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors overflow-hidden ${aspectRatioClass}`}>
        {url ? (
          <div className="relative w-full h-full min-h-[140px]">
            <Image
              src={url}
              alt={label}
              fill
              className="object-cover rounded-lg"
              unoptimized
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <label className="cursor-pointer bg-white text-slate-900 px-3 py-1.5 rounded-md text-xs font-semibold shadow hover:bg-slate-100">
                Alterar Imagem
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        ) : (
          <label className="cursor-pointer text-center space-y-2">
            <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-slate-600 block">
              {isUploading ? 'Enviando imagem...' : 'Clique para selecionar arquivo'}
            </span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
          </label>
        )}
      </div>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
    </div>
  );
}
