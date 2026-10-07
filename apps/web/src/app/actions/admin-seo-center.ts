'use server';

import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { buildDirectoryIndex, isCategoryIndexable, isCityIndexable, type DirectoryRow } from '@/lib/seo/directory-seo';
import { findDuplicateDescriptions, scoreBusinessSeo, type SeoScoreResult } from '@/lib/seo/seo-score';
import { SEO_BUSINESS_SELECT, buildSeoRowFacts } from '@/lib/seo/seo-score-input';

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
    let { data, error } = await query(`${SEO_BUSINESS_SELECT}, seo_indexable`);
    if (error) {
      // Migration 196 ainda não aplicada.
      seoColumnsAvailable = false;
      ({ data, error } = await query(SEO_BUSINESS_SELECT));
    }
    if (error) return { success: false, error: `Não foi possível carregar as empresas: ${error.message}` };

    const rows: any[] = data ?? [];
    const duplicates = findDuplicateDescriptions(rows.map((r) => ({ slug: r.slug ?? r.id, description: r.description })));

    const businesses: SeoCenterBusiness[] = rows.map((row) => {
      const { scoreInput } = buildSeoRowFacts(row);
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category: row.category,
        city: scoreInput.city,
        state: scoreInput.state,
        indexable: scoreInput.seoIndexable,
        duplicateDescription: duplicates.has(row.slug ?? row.id),
        score: scoreBusinessSeo(scoreInput),
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
