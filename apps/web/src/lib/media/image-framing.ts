/**
 * Enquadramento de imagens no navegador (logomarca, capa e fotos): zoom, posição horizontal/vertical, ajuste
 * (preencher ou encaixar) e cor de fundo. A mesma função desenha a pré-visualização e gera o arquivo final, então o que o
 * anunciante vê é exatamente o que é enviado. Mesmas opções do Prontuário 360 (zoom de 0,4x a 3x, posição, fundo).
 */

export type FramingKind = 'logo' | 'cover' | 'gallery';
export type FramingFit = 'cover' | 'contain';

export interface FramingOptions {
  zoom: number;
  /** 0 = esquerda, 0,5 = centro, 1 = direita */
  offsetX: number;
  /** 0 = topo, 0,5 = centro, 1 = base */
  offsetY: number;
  fit: FramingFit;
  /** Cor de fundo (#rrggbb) ou null para fundo transparente (útil para logomarcas em PNG/WebP). */
  background: string | null;
}

export const FRAMING_SPEC: Record<FramingKind, { width: number; height: number; fit: FramingFit; background: string | null; label: string; ratio: string }> = {
  logo: { width: 1000, height: 1000, fit: 'contain', background: '#ffffff', label: 'Logomarca', ratio: 'quadrada (1:1)' },
  cover: { width: 1920, height: 720, fit: 'cover', background: '#f5f5f4', label: 'Imagem de capa', ratio: 'banner (8:3)' },
  gallery: { width: 1600, height: 1200, fit: 'cover', background: '#f5f5f4', label: 'Foto da galeria', ratio: 'padrão (4:3)' },
};

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 3;

export function defaultFraming(kind: FramingKind): FramingOptions {
  const spec = FRAMING_SPEC[kind];
  return { zoom: 1, offsetX: 0.5, offsetY: 0.5, fit: spec.fit, background: spec.background };
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Tamanho da imagem desenhada (px) para o quadro W x H com as opções dadas. */
export function framedSize(img: { naturalWidth: number; naturalHeight: number }, W: number, H: number, o: FramingOptions) {
  const base = o.fit === 'cover' ? Math.max(W / img.naturalWidth, H / img.naturalHeight) : Math.min(W / img.naturalWidth, H / img.naturalHeight);
  const scale = base * clamp(o.zoom, MIN_ZOOM, MAX_ZOOM);
  return { width: img.naturalWidth * scale, height: img.naturalHeight * scale };
}

export function drawFramed(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number, o: FramingOptions) {
  ctx.clearRect(0, 0, W, H);
  if (o.background && /^#[0-9a-f]{6}$/i.test(o.background)) {
    ctx.fillStyle = o.background;
    ctx.fillRect(0, 0, W, H);
  }
  const { width, height } = framedSize(img, W, H, o);
  const dx = (W - width) * clamp(o.offsetX, 0, 1);
  const dy = (H - height) * clamp(o.offsetY, 0, 1);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, width, height);
}

/** Carrega a imagem de um arquivo ou de um endereço (mesma origem ou com CORS liberado, como o armazenamento público). */
export function loadFramingImage(source: File | string): Promise<{ img: HTMLImageElement; dispose: () => void }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = typeof source === 'string' ? null : URL.createObjectURL(source);
    const dispose = () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
    if (typeof source === 'string') img.crossOrigin = 'anonymous';
    img.onload = () => resolve({ img, dispose });
    img.onerror = () => {
      dispose();
      reject(new Error('Não foi possível abrir esta imagem. Use um arquivo JPG, PNG ou WebP válido.'));
    };
    img.src = objectUrl ?? (source as string);
  });
}

/** Gera o arquivo final (WebP) já enquadrado, no tamanho do tipo de imagem. */
export function renderFramedFile(img: HTMLImageElement, kind: FramingKind, options: FramingOptions, baseName: string): Promise<File> {
  const spec = FRAMING_SPEC[kind];
  const canvas = document.createElement('canvas');
  canvas.width = spec.width;
  canvas.height = spec.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.reject(new Error('Seu navegador não conseguiu preparar a imagem.'));
  drawFramed(ctx, img, spec.width, spec.height, options);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Não foi possível gerar a imagem. Tente outra foto.'));
          return;
        }
        const safeName = baseName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9-_]/g, '_') || 'imagem';
        resolve(new File([blob], `${safeName}.webp`, { type: 'image/webp', lastModified: Date.now() }));
      },
      'image/webp',
      0.88
    );
  });
}
