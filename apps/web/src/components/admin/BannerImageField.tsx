'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { uploadDirectoryBannerImageAction } from '@/app/actions/admin-directory-banner-upload';
import { optimizeImageForUpload } from '@/lib/media/optimize-image';

type Props = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  required?: boolean;
  hint?: string;
  /** Maior lado da imagem enviada (px). */
  maxDimension?: number;
  /** Peso máximo do arquivo enviado, em bytes (a imagem é reduzida até caber). */
  maxBytes?: number;
};

const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/**
 * Imagem de banner: envio de arquivo (com pré-visualização) ou, se preferir, colar uma URL já hospedada.
 * O arquivo é reduzido no navegador (WebP) para ficar leve antes de subir.
 */
export function BannerImageField({ label, value, onChange, required, hint, maxDimension = 1920, maxBytes = 450 * 1024 }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedInfo, setSavedInfo] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setSavedInfo(null);
    setUploading(true);
    try {
      // Reduz e converte para WebP no navegador, para nunca subir (nem carregar depois) uma imagem pesada.
      const optimized = await optimizeImageForUpload(file, { maxBytes, maxDimension, initialQuality: 0.82 });
      const body = new FormData();
      body.set('file', optimized);
      const result = await uploadDirectoryBannerImageAction(body);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onChange(result.url);
      setSavedInfo(`Imagem otimizada: ${formatSize(file.size)} → ${formatSize(optimized.size)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-gray-700">{label}</label>

      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Pré-visualização do banner" className="max-h-40 w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-rose-700 shadow hover:bg-white"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remover
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-1.5 rounded-md border border-amber-800 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ImagePlus className="h-3.5 w-3.5" aria-hidden />}
          {uploading ? 'Enviando…' : value ? 'Trocar imagem' : 'Enviar imagem do computador'}
        </button>
        <span className="text-[11px] text-gray-500">JPG, PNG ou WebP</span>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required && !value}
        placeholder="…ou cole o endereço (URL) de uma imagem já publicada"
        className="w-full rounded-md border px-3 py-1.5 text-sm"
      />
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {savedInfo && <p className="text-xs font-semibold text-emerald-700">{savedInfo}</p>}
      {error && <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p>}
    </div>
  );
}
