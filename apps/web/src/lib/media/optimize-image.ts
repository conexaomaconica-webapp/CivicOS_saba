export type ImageOptimizationOptions = {
  maxBytes: number;
  maxDimension?: number;
  initialQuality?: number;
};

function webpName(name: string): string {
  const base = name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]+/g, '-');
  return `${base || 'imagem'}.webp`;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('O navegador não conseguiu converter a imagem para WebP.')), 'image/webp', quality);
  });
}

export async function optimizeImageForUpload(file: File, options: ImageOptimizationOptions): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Selecione um arquivo de imagem válido.');
  if (file.size > 25 * 1024 * 1024) throw new Error('A imagem original deve possuir no máximo 25 MB.');
  if (file.type === 'image/svg+xml') {
    if (file.size > options.maxBytes) throw new Error('O SVG excede o limite permitido. Otimize o arquivo vetorial antes do envio.');
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = options.maxDimension ?? 2048;
    const initialScale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    let width = Math.max(1, Math.round(bitmap.width * initialScale));
    let height = Math.max(1, Math.round(bitmap.height * initialScale));
    let quality = options.initialQuality ?? 0.86;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d', { alpha: true });
      if (!context) throw new Error('Não foi possível processar a imagem neste navegador.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= options.maxBytes) {
        return new File([blob], webpName(file.name), { type: 'image/webp', lastModified: Date.now() });
      }
      if (quality > 0.56) quality -= 0.08;
      else {
        width = Math.max(1, Math.round(width * 0.85));
        height = Math.max(1, Math.round(height * 0.85));
      }
    }
    throw new Error('Não foi possível reduzir a imagem ao limite permitido.');
  } finally {
    bitmap.close();
  }
}
