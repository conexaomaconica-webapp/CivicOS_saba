import { derivePrimaryCategories, resolveHomeCategories, selectMainHomeCategories, type FeaturedCategoryEntry } from './home-categories';
import type { FilterCategory } from './filter-categories';

export type MainHomeCategory = { id: string; slug: string; name: string; icon_name: string | null; business_count: number };

/**
 * Categorias principais da home para o app (BFF): mesma regra da home web.
 *   1. categorias em destaque no painel (com empresas);
 *   2. sem destaque: categorias PRINCIPAIS do prontuário 360 (is_primary), no máximo 10;
 *   3. sem principais conhecidas: as 10 primeiras da lista.
 * `db` deve ser um cliente com leitura das tabelas do tenant; TODAS as consultas filtram pelo tenant.
 * Nunca lança: em qualquer falha devolve lista vazia (o app usa a própria regra de reserva).
 */
export async function fetchMainHomeCategories(db: any, tenantId: string, available: FilterCategory[]): Promise<MainHomeCategory[]> {
  try {
    if (!tenantId || !Array.isArray(available) || available.length === 0) return [];

    const [{ data: featRows }, { data: primaryRows }] = await Promise.all([
      db
        .from('directory_featured_categories')
        .select('category_id, custom_title, icon_name, display_order, categories(id)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .then((r: any) => r, () => ({ data: [] })),
      db
        .from('businesses')
        .select('id, business_categories!inner(is_primary, categories(id, slug, name, icon))')
        .eq('tenant_id', tenantId)
        .eq('publication_status', 'published')
        .eq('is_active', true)
        .eq('business_categories.is_primary', true)
        .then((r: any) => r, () => ({ data: [] })),
    ]);

    const featured: FeaturedCategoryEntry[] = (Array.isArray(featRows) ? featRows : []).map((fc: any) => ({
      category_id: fc.category_id || fc.categories?.id,
      custom_title: fc.custom_title,
      icon_name: fc.icon_name,
      display_order: fc.display_order,
    }));

    const resolved = resolveHomeCategories({ categoriesWithBusinesses: available, featuredCategories: featured, fallbackCategories: [] });
    const main = selectMainHomeCategories(
      resolved,
      featured.map((f) => f.category_id),
      derivePrimaryCategories(Array.isArray(primaryRows) ? primaryRows : []),
    );

    const countById = new Map(available.map((c) => [c.id, c.business_count ?? 0]));
    return main.map((c) => ({ id: c.id, slug: c.slug, name: c.name, icon_name: c.icon_name ?? null, business_count: countById.get(c.id) ?? 0 }));
  } catch {
    return [];
  }
}
