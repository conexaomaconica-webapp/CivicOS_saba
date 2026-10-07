import type { SeoScoreInput } from '@/lib/seo/seo-score';

/** Colunas lidas para pontuar o SEO de uma empresa (usada pelo SEO Center e pela tela de SEO da empresa). */
export const SEO_BUSINESS_SELECT =
  'id, slug, name, category, description, logo_url, phone, website, ' +
  'business_locations(city, state, street, number, latitude, longitude, is_headquarters), ' +
  'business_contacts(type, value, is_public), business_services(name, is_active), business_media(media_type, url), business_hours(is_closed)';

const contactValue = (contacts: any[], type: string): string | null =>
  contacts.find((c) => c?.type === type && c?.value)?.value ?? null;

const IMAGE_TYPES = new Set(['cover', 'banner', 'image', 'photo', 'gallery']);

export type SeoRowFacts = {
  scoreInput: SeoScoreInput;
  serviceNames: string[];
  hoursCount: number;
};

/**
 * Converte a linha do banco no que a pontuação e o gerador de sugestões precisam.
 * Capa = primeira imagem da empresa (é assim que a página pública monta); galeria = as demais.
 */
export function buildSeoRowFacts(row: any): SeoRowFacts {
  const locations: any[] = row.business_locations ?? [];
  const loc = locations.find((l) => l?.is_headquarters) ?? locations[0] ?? null;
  const contacts: any[] = row.business_contacts ?? [];
  const images: any[] = (row.business_media ?? []).filter((m: any) => IMAGE_TYPES.has(m?.media_type) && m?.url);
  const services: any[] = (row.business_services ?? []).filter((s: any) => s?.is_active !== false && s?.name);
  const hoursCount = (row.business_hours ?? []).filter((h: any) => !h?.is_closed).length;

  return {
    serviceNames: services.map((s) => String(s.name).trim()).filter(Boolean),
    hoursCount,
    scoreInput: {
      name: row.name ?? null,
      category: row.category ?? null,
      description: row.description ?? null,
      slug: row.slug ?? null,
      city: loc?.city ?? null,
      state: loc?.state ?? null,
      address: loc ? [loc.street, loc.number].filter(Boolean).join(', ') : '',
      hasCoordinates: loc?.latitude != null && loc?.longitude != null,
      hoursCount,
      phone: row.phone || contactValue(contacts, 'phone'),
      whatsapp: contactValue(contacts, 'whatsapp'),
      website: row.website || contactValue(contacts, 'website'),
      instagram: contactValue(contacts, 'instagram'),
      logoUrl: row.logo_url ?? null,
      coverUrl: images[0]?.url ?? null,
      galleryCount: Math.max(0, images.length - 1),
      servicesCount: services.length,
      seoIndexable: row.seo_indexable !== false,
    },
  };
}
