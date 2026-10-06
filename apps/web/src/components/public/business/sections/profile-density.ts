import type { PublicBusinessPresentation } from '@/lib/business/public-business-presentation';

/**
 * Quantas seções do conteúdo principal têm algo para mostrar (sobre, serviços, vídeo, fotos, benefícios,
 * eventos, publicações). Perfis com 0 ou 1 seção deixam a coluna central quase vazia e usam o layout compacto.
 */
export function countMainSections(profile: PublicBusinessPresentation): number {
  return [
    Boolean(profile.identity.description),
    profile.services.length > 0,
    Boolean(profile.media.video),
    profile.media.gallery.length > 0,
    profile.benefits.length > 0,
    profile.events.length > 0,
    profile.posts.length > 0,
  ].filter(Boolean).length;
}

export function isSparseProfile(profile: PublicBusinessPresentation): boolean {
  return countMainSections(profile) <= 1;
}
