import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { createServerSideClient } from '@/lib/supabase/server';
import type { BusinessCardData } from '@/components/public/directory/BusinessCard';

export type MasonicSearchResult = BusinessCardData & {
  category_slug?: string | null;
  responsible_name?: string | null;
  responsible_label?: string | null;
  reference_mason_name?: string | null;
  match_source?: 'responsible' | 'reference_mason' | 'relation';
};

interface SearchMasonicMemberOptions {
  query: string;
  tenantId?: string | null;
  city?: string | null;
  categorySlug?: string | null;
  limit?: number;
}

/**
 * Normaliza e decompõe a busca em termos relevantes, tratando prefixos comuns:
 * "Ir. Douglas", "Irmão Douglas", "Cunhada Melissa", "Sobrinho Luccas", etc.
 */
export function extractMasonicSearchKeywords(raw: string): string[] {
  if (!raw) return [];
  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (!normalized || normalized.length < 2) return [];

  const cleaned = normalized
    .replace(/\b(ir\.|irmao|cunhada|sobrinho|sobrinha)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const keywords = new Set<string>();
  keywords.add(normalized);
  if (cleaned.length >= 2) {
    keywords.add(cleaned);
  }

  // Adiciona palavras individuais com 3 ou mais letras (ex: "Eduardo", "Saba")
  cleaned.split(/\s+/).forEach((w) => {
    if (w.length >= 3) keywords.add(w);
  });

  return Array.from(keywords);
}

/**
 * Busca empresas publicadas no catálogo onde o responsável cadastrado ou o maçom de referência
 * corresponda ao nome do Irmão, Cunhada ou Sobrinho(a) informado na busca.
 */
export async function findBusinessesByMasonicMember({
  query,
  tenantId,
  city,
  categorySlug,
  limit = 10,
}: SearchMasonicMemberOptions): Promise<MasonicSearchResult[]> {
  const keywords = extractMasonicSearchKeywords(query);
  if (keywords.length === 0) return [];

  const supabase = createServiceRoleClient() || (await createServerSideClient());
  if (!supabase) return [];

  const matchedRespByBiz = new Map<string, { name: string; community_label?: string | null; organization?: string | null }>();
  const matchedLinksByBiz = new Map<string, { reference_mason_name?: string | null; link_type?: string | null; eligibility_type?: string | null; family_relationship?: string | null }>();

  // Realiza a busca para cada variação de termo extraído
  for (const kw of keywords) {
    // 1. Busca nos Responsáveis da empresa (business_responsibles)
    let respQuery = (supabase as any)
      .from('business_responsibles')
      .select('business_id, name, community_label, organization')
      .or(`name.ilike.%${kw}%,community_label.ilike.%${kw}%`)
      .limit(30);

    if (tenantId) {
      respQuery = respQuery.eq('tenant_id', tenantId);
    }

    const { data: respList } = await respQuery;
    if (Array.isArray(respList)) {
      for (const r of respList) {
        if (!matchedRespByBiz.has(r.business_id)) {
          matchedRespByBiz.set(r.business_id, r);
        }
      }
    }

    // 2. Busca no Maçom de Referência (business_masonic_links)
    let linkQuery = (supabase as any)
      .from('business_masonic_links')
      .select('business_id, reference_mason_name, link_type, eligibility_type, family_relationship')
      .or(`reference_mason_name.ilike.%${kw}%,family_relationship.ilike.%${kw}%`)
      .limit(30);

    if (tenantId) {
      linkQuery = linkQuery.eq('tenant_id', tenantId);
    }

    const { data: linkList } = await linkQuery;
    if (Array.isArray(linkList)) {
      for (const l of linkList) {
        if (!matchedLinksByBiz.has(l.business_id)) {
          matchedLinksByBiz.set(l.business_id, l);
        }
      }
    }
  }

  const allBizIds = Array.from(new Set([...matchedRespByBiz.keys(), ...matchedLinksByBiz.keys()]));
  if (allBizIds.length === 0) return [];

  // Busca os dados cadastrais das empresas publicadas
  let bizQuery = (supabase as any)
    .from('businesses')
    .select(`
      id,
      slug,
      name,
      description,
      logo_url,
      plan_tier,
      is_active,
      publication_status,
      business_locations(city, state, is_headquarters),
      business_categories(is_primary, category:categories(name, slug)),
      business_recognitions(recognition_key, is_active)
    `)
    .in('id', allBizIds)
    .eq('publication_status', 'published')
    .eq('is_active', true)
    .limit(limit);

  if (tenantId) {
    bizQuery = bizQuery.eq('tenant_id', tenantId);
  }

  const { data: bizList, error: bizError } = await bizQuery;
  if (bizError || !Array.isArray(bizList)) return [];

  const results: MasonicSearchResult[] = [];

  for (const b of bizList) {
    const locs = Array.isArray(b.business_locations) ? b.business_locations : [];
    const hq = locs.find((l: any) => l.is_headquarters) || locs[0] || null;

    // Filtro por cidade se solicitado
    if (city && city.trim()) {
      const normCity = city.trim().toLowerCase();
      const matchCity = locs.some((l: any) => l.city && l.city.toLowerCase().includes(normCity));
      if (!matchCity) continue;
    }

    const cats = Array.isArray(b.business_categories) ? b.business_categories : [];
    const primaryCat = cats.find((c: any) => c.is_primary) || cats[0] || null;
    const catSlug = primaryCat?.category?.slug || null;
    const catName = primaryCat?.category?.name || null;

    // Filtro por categoria se solicitado
    if (categorySlug && categorySlug.trim()) {
      const normCat = categorySlug.trim().toLowerCase();
      const matchCat = cats.some((c: any) => c.category?.slug && c.category.slug.toLowerCase() === normCat);
      if (!matchCat) continue;
    }

    const recognitions = Array.isArray(b.business_recognitions) ? b.business_recognitions : [];
    const isPedra = recognitions.some((r: any) => r.is_active && r.recognition_key === 'pedra_fundamental');
    const isFounder = recognitions.some((r: any) => r.is_active && r.recognition_key === 'coluna_de_honra');

    const resp = matchedRespByBiz.get(b.id);
    const link = matchedLinksByBiz.get(b.id);

    const responsibleLabel =
      resp?.community_label ||
      (link?.eligibility_type === 'mason_spouse' || link?.link_type === 'family_owner'
        ? 'Cunhada'
        : link?.eligibility_type === 'mason_family'
        ? 'Sobrinho(a)'
        : 'Irmão');

    const relationshipType =
      link?.eligibility_type === 'mason_spouse'
        ? 'cunhada'
        : link?.eligibility_type === 'mason_family'
        ? 'sobrinho'
        : 'brother';

    results.push({
      id: b.id,
      slug: b.slug,
      name: b.name,
      short_description: b.description ? b.description.slice(0, 200) : '',
      logo_url: b.logo_url || null,
      cover_url: null,
      category_name: catName,
      category_slug: catSlug,
      city: hq?.city || null,
      state: hq?.state || null,
      is_verified: true,
      is_pedra_fundamental: isPedra,
      is_founder: isFounder,
      effective_plan_code: b.plan_tier || 'ouro',
      responsible_name: resp?.name || null,
      responsible_label: responsibleLabel,
      responsible_lodge: resp?.organization || null,
      reference_mason_name: link?.reference_mason_name || null,
      masonic_member_name: resp?.name || null,
      masonic_relationship_type: relationshipType,
      masonic_brother_name: link?.reference_mason_name || null,
      masonic_lodge_name: resp?.organization || null,
      match_source: resp?.name ? 'responsible' : link?.reference_mason_name ? 'reference_mason' : 'relation',
    });
  }

  return results;
}
