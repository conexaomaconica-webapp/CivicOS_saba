/**
 * business-media-helpers.ts
 * 
 * Centraliza a resolução de mídia de empresas.
 * FONTE CANÔNICA:
 *   - Logo: businesses.logo_url
 *   - Capa: business_media com display_order = 0
 *   - Galeria: business_media com display_order >= 1
 * 
 * NÃO existe businesses.cover_url nem businesses.banner_url.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface BusinessMediaResolved {
  logo_url: string | null;
  cover_url: string | null;
  gallery: Array<{
    id: string;
    url: string;
    title: string | null;
    display_order: number;
  }>;
}

const DEFAULT_LOGO = '/logoconexao_red_vert.png';
const DEFAULT_COVER = '/capa-padrao.jpg';

/**
 * Resolve logo, capa e galeria para uma empresa.
 * 
 * @param supabase - Cliente Supabase (browser ou server)
 * @param businessId - ID da empresa
 * @param opts.logoUrl - logo_url já obtido de businesses (evita query extra)
 * @returns BusinessMediaResolved com URLs reais ou defaults
 */
export async function resolveBusinessMedia(
  supabase: SupabaseClient,
  businessId: string,
  opts?: { logoUrl?: string | null }
): Promise<BusinessMediaResolved> {
  const logo_url = opts?.logoUrl ?? null;

  // Buscar toda mídia do tipo 'image' para esta empresa
  const { data: mediaItems, error } = await (supabase as any)
    .from('business_media')
    .select('id, url, title, display_order')
    .eq('business_id', businessId)
    .eq('media_type', 'image')
    .order('display_order', { ascending: true });

  if (error || !mediaItems) {
    return {
      logo_url,
      cover_url: null,
      gallery: [],
    };
  }

  // Separar capa (display_order = 0) e galeria (display_order >= 1)
  const coverItem = mediaItems.find((m: any) => m.display_order === 0);
  const galleryItems = mediaItems
    .filter((m: any) => m.display_order >= 1)
    .map((m: any) => ({
      id: m.id,
      url: m.url,
      title: m.title || null,
      display_order: m.display_order,
    }));

  return {
    logo_url,
    cover_url: coverItem?.url || null,
    gallery: galleryItems,
  };
}

/**
 * Retorna URL de logo com fallback.
 */
export function resolveLogoUrl(logoUrl: string | null | undefined): string {
  if (!logoUrl || logoUrl.startsWith('data:') || logoUrl.startsWith('blob:')) {
    return DEFAULT_LOGO;
  }
  return logoUrl;
}

/**
 * Retorna URL de capa com fallback.
 */
export function resolveCoverUrl(coverUrl: string | null | undefined): string {
  if (!coverUrl || coverUrl.startsWith('data:') || coverUrl.startsWith('blob:')) {
    return DEFAULT_COVER;
  }
  return coverUrl;
}
