'use server';

import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { buildDirectoryIndex, isCategoryIndexable, isCityIndexable, type DirectoryRow } from '@/lib/seo/directory-seo';
import { findDuplicateDescriptions, scoreBusinessSeo, type SeoScoreResult } from '@/lib/seo/seo-score';

export type SeoCenterBusiness = {
  id: string;
  slug: string | null;
  name: string;
  category: string | null;
  city: string | null;
  state: string | null;
  indexable: boolean;
  duplicateDescription: boolean;
  score: SeoScoreResult;
};

export type SeoCenterData = {
  averageScore: number;
  totals: {
    published: number;
    indexable: number;
    noindex: number;
    complete: number;
    incomplete: number;
    cities: number;
    indexableCities: number;
    indexableCategories: number;
    withoutDescription: number;
    withoutLogo: number;
    withoutCover: number;
    duplicateDescriptions: number;
    withoutSlug: number;
  };
  businesses: SeoCenterBusiness[];
  seoColumnsAvailable: boolean;
};

const SELECT_BASE =
  'id, slug, name, category, description, logo_url, phone, website, ' +
  'business_locations(city, state, street, number, latitude, longitude, is_headquarters), ' +
  'business_contacts(type, value, is_public), business_services(id), business_media(media_type, url), business_hours(is_closed)';

const contactValue = (contacts: any[], type: string): string | null =>
  contacts.find((c) => c?.type === type && c?.value)?.value ?? null;

/**
 * Painel SEO Center: saúde de SEO de todas as empresas publicadas do tenant. Calculado na hora a partir do cadastro:
 * não há resultado gravado que possa ficar desatualizado.
 */
export async function getSeoCenterDataAction(): Promise<{ success: true; data: SeoCenterData } | { success: false; error: string }> {
  try {
    const { supabase, tenantId } = await resolveCanonicalAdminTenant();

    const query = (columns: string) =>
      (supabase as any)
        .from('businesses')
        .select(columns)
        .eq('tenant_id', tenantId)
        .eq('publication_status', 'published')
        .eq('is_active', true)
        .order('name')
        .limit(5000);

    let seoColumnsAvailable = true;
    let { data, error } = await query(`${SELECT_BASE}, seo_indexable`);
    if (error) {
      // Migration 196 ainda não aplicada.
      seoColumnsAvailable = false;
      ({ data, error } = await query(SELECT_BASE));
    }
    if (error) return { success: false, error: `Não foi possível carregar as empresas: ${error.message}` };

    const rows: any[] = data ?? [];
    const duplicates = findDuplicateDescriptions(rows.map((r) => ({ slug: r.slug ?? r.id, description: r.description })));

    const businesses: SeoCenterBusiness[] = rows.map((row) => {
      const locations: any[] = row.business_locations ?? [];
      const loc = locations.find((l) => l?.is_headquarters) ?? locations[0] ?? null;
      const contacts: any[] = row.business_contacts ?? [];
      const media: any[] = row.business_media ?? [];
      const address = loc ? [loc.street, loc.number].filter(Boolean).join(', ') : '';
      const indexable = row.seo_indexable !== false;
      const cover = media.find((m) => m?.media_type === 'cover' || m?.media_type === 'banner')?.url ?? null;
      const gallery = media.filter((m) => m?.media_type === 'photo' || m?.media_type === 'gallery' || m?.media_type === 'image');

      const score = scoreBusinessSeo({
        name: row.name,
        category: row.category,
        description: row.description,
        slug: row.slug,
        city: loc?.city ?? null,
        state: loc?.state ?? null,
        address,
        hasCoordinates: loc?.latitude != null && loc?.longitude != null,
        hoursCount: (row.business_hours ?? []).filter((h: any) => !h?.is_closed).length,
        phone: row.phone || contactValue(contacts, 'phone'),
        whatsapp: contactValue(contacts, 'whatsapp'),
        website: row.website || contactValue(contacts, 'website'),
        instagram: contactValue(contacts, 'instagram'),
        logoUrl: row.logo_url,
        coverUrl: cover,
        galleryCount: gallery.length,
        servicesCount: (row.business_services ?? []).length,
        seoIndexable: indexable,
      });

      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        city: loc?.city ?? null,
        state: loc?.state ?? null,
        indexable,
        duplicateDescription: duplicates.has(row.slug ?? row.id),
        score,
      };
    });

    const directory = buildDirectoryIndex(
      rows.map<DirectoryRow>((r) => ({
        slug: r.slug,
        name: r.name,
        category: r.category,
        seo_indexable: r.seo_indexable,
        business_locations: r.business_locations,
      }))
    );

    const total = businesses.length;
    const average = total ? Math.round(businesses.reduce((sum, b) => sum + b.score.score, 0) / total) : 0;
    const missing = (label: string) => businesses.filter((b) => b.score.issues.some((i) => i.label === label)).length;

    return {
      success: true,
      data: {
        averageScore: average,
        seoColumnsAvailable,
        businesses: businesses.sort((a, b) => a.score.score - b.score.score),
        totals: {
          published: total,
          indexable: businesses.filter((b) => b.indexable && b.slug).length,
          noindex: businesses.filter((b) => !b.indexable).length,
          complete: businesses.filter((b) => b.score.score >= 85).length,
          incomplete: businesses.filter((b) => b.score.score < 70).length,
          cities: directory.length,
          indexableCities: directory.filter((c) => isCityIndexable(c)).length,
          indexableCategories: directory.reduce((sum, c) => sum + c.categories.filter((g) => isCategoryIndexable(g)).length, 0),
          withoutDescription: missing('Escrever uma descrição (mínimo 50 caracteres)'),
          withoutLogo: missing('Enviar o logo'),
          withoutCover: missing('Enviar a imagem de capa'),
          duplicateDescriptions: businesses.filter((b) => b.duplicateDescription).length,
          withoutSlug: businesses.filter((b) => !b.slug).length,
        },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao carregar o SEO Center.' };
  }
}
