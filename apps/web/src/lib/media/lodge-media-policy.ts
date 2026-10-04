export const LODGE_GALLERY_MAX_PHOTOS = 12;
export const LODGE_IMAGE_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
export const LODGE_IMAGE_MAX_OPTIMIZED_BYTES = 1_500_000;
export const LODGE_GALLERY_MAX_DIMENSION = 1600;
export const LODGE_GALLERY_WEBP_QUALITY = 0.8;

export function validateLodgeGalleryCount(currentCount: number, incomingCount: number): string | null {
  if (incomingCount < 1) return 'Selecione pelo menos uma imagem.';
  if (currentCount + incomingCount > LODGE_GALLERY_MAX_PHOTOS) {
    return `A galeria permite no máximo ${LODGE_GALLERY_MAX_PHOTOS} fotos. Remova uma foto antes de adicionar outra.`;
  }
  return null;
}

export function validateLodgeSourceImage(file: File): string | null {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return `O arquivo "${file.name}" não é uma imagem JPG, PNG ou WebP válida.`;
  }
  if (file.size > LODGE_IMAGE_MAX_SOURCE_BYTES) {
    return `A imagem "${file.name}" ultrapassa o limite de 12 MB.`;
  }
  return null;
}
