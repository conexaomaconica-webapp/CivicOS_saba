'use client';

import { useState } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { uploadPlatformEventMediaAction } from '@/app/actions/platform-events';
import { optimizeImageForUpload } from '@/lib/media/optimize-image';

type Props = {
  mediaType: 'logo' | 'banner';
  mediaSize: 'small' | 'medium' | 'large' | 'full';
  mediaPosition: 'left' | 'center' | 'right';
  imageUrl: string;
  onMediaTypeChange: (value: 'logo' | 'banner') => void;
  onMediaSizeChange: (value: 'small' | 'medium' | 'large' | 'full') => void;
  onMediaPositionChange: (value: 'left' | 'center' | 'right') => void;
  onImageUrlChange: (value: string) => void;
};

export function EventHeaderMediaField({ mediaType, mediaSize, mediaPosition, imageUrl, onMediaTypeChange, onMediaSizeChange, onMediaPositionChange, onImageUrlChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const previewWidth = { small: '35%', medium: '55%', large: '80%', full: '100%' }[mediaSize];
  const previewAlignment = { left: 'flex-start', center: 'center', right: 'flex-end' }[mediaPosition];

  async function handleFile(file?: File) {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const optimized = await optimizeImageForUpload(file, {
        maxBytes: 4.5 * 1024 * 1024,
        maxDimension: mediaType === 'logo' ? 1400 : 2400,
      });
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
        reader.readAsDataURL(optimized);
      });
      const result = await uploadPlatformEventMediaAction(dataUrl);
      if (!result.success || !result.data) throw new Error(result.error || 'Falha no upload.');
      onImageUrlChange(result.data.url);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Falha no upload.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <div>
        <span className="mb-2 block text-sm font-semibold text-gray-800">Imagem no topo do evento</span>
        <div className="grid grid-cols-2 gap-2">
          {(['logo', 'banner'] as const).map((type) => (
            <button key={type} type="button" onClick={() => onMediaTypeChange(type)} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${mediaType === type ? 'border-[#4B161B] bg-[#4B161B] text-white' : 'border-gray-300 bg-white text-gray-700'}`}>
              {type === 'logo' ? 'Logomarca' : 'Banner'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-gray-800">
          Tamanho na página RSVP
          <select value={mediaSize} onChange={(event) => onMediaSizeChange(event.target.value as Props['mediaSize'])} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-700">
            <option value="small">Pequeno</option>
            <option value="medium">Médio</option>
            <option value="large">Grande</option>
            <option value="full">Largura máxima</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-800">
          Posição na página RSVP
          <select value={mediaPosition} onChange={(event) => onMediaPositionChange(event.target.value as Props['mediaPosition'])} className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal text-gray-700">
            <option value="left">Esquerda</option>
            <option value="center">Centralizada</option>
            <option value="right">Direita</option>
          </select>
        </label>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 bg-white px-4 py-5 text-sm font-semibold text-gray-700 hover:border-[#4B161B]">
        {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
        {uploading ? 'Enviando imagem...' : `Fazer upload da ${mediaType === 'logo' ? 'logomarca' : 'imagem do banner'}`}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={uploading} onChange={(event) => void handleFile(event.target.files?.[0])} />
      </label>

      {imageUrl && (
        <div>
          <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-600">Prévia antes de salvar</span>
          <div className="flex min-h-44 rounded-xl border border-[#6B1E25] bg-gradient-to-br from-[#1A0507] via-[#4B161B] to-[#6B1E25] p-4" style={{ justifyContent: previewAlignment }}>
            <div className="flex items-center" style={{ width: previewWidth, justifyContent: previewAlignment }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="Prévia da imagem do evento" className={`block h-auto w-full max-w-full object-contain ${mediaType === 'logo' ? 'max-h-40' : 'max-h-72 rounded-lg'}`} />
            </div>
          </div>
          <p className="mt-2 text-xs text-gray-500">A imagem inteira será exibida, sem recorte. A prévia acompanha o tamanho e a posição selecionados.</p>
        </div>
      )}
      {!imageUrl && <p className="flex items-center gap-2 text-xs text-gray-500"><ImageIcon className="h-4 w-4" />Se nenhuma imagem for enviada, será usada a identidade visual padrão da plataforma.</p>}
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
