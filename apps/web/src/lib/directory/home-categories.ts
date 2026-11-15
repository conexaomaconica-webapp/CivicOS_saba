import type { DirectoryCategoryItem } from '@/components/public/directory/DirectoryCategories';
import type { FilterCategory } from './filter-categories';

export type FeaturedCategoryEntry = {
  category_id: string;
  custom_title?: string | null;
  icon_name?: string | null;
  display_order?: number | null;
};

/** Máximo de categorias principais exibidas no carrossel da home quando nenhuma está em destaque. */
export const HOME_MAIN_CATEGORIES_MAX = 10;

type PrimaryCategoryRef = { id?: string | null; slug?: string | null; name?: string | null; icon?: string | null } | null;
export type PrimaryCategoryBusinessRow = {
  business_categories?: Array<{ is_primary?: boolean | null; categories?: PrimaryCategoryRef | PrimaryCategoryRef[] }> | null;
};

const collator = new Intl.Collator('pt-BR');

/**
 * Categorias PRINCIPAIS: as marcadas como categoria principal no prontuário 360 de empresas publicadas
 * (business_categories.is_primary). Categorias apenas secundárias NÃO entram. Ordena pelas que têm mais empresas
 * (empate pelo nome).
 */
export function derivePrimaryCategories(rows: PrimaryCategoryBusinessRow[]): DirectoryCategoryItem[] {
  const counts = new Map<string, { item: DirectoryCategoryItem; count: number }>();
  for (const row of rows ?? []) {
    const seenInBusiness = new Set<string>();
    for (const bc of row.business_categories ?? []) {
      if (!bc?.is_primary) continue;
      const refs = Array.isArray(bc.categories) ? bc.categories : [bc.categories];
      for (const ref of refs) {
        if (!ref?.id || !ref.slug || !ref.name || seenInBusiness.has(ref.id)) continue;
        seenInBusiness.add(ref.id);
        const current = counts.get(ref.id);
        if (current) current.count += 1;
        else counts.set(ref.id, { item: { id: ref.id, slug: ref.slug, name: ref.name, icon_name: ref.icon ?? null }, count: 1 });
      }
    }
  }
  return Array.from(counts.values())
    .sort((x, y) => y.count - x.count || collator.compare(x.item.name, y.item.name))
    .map((x) => x.item);
}

/**
 * Categorias para o carrossel "Explore por Categoria" da home:
 * 1. com categorias em destaque no painel (e com empresas): somente elas, na ordem do painel;
 * 2. sem nenhuma em destaque: as categorias PRINCIPAIS do prontuário 360, no máximo `max` (10);
 * 3. sem categorias principais conhecidas: as primeiras `max` da lista resolvida (nunca todas).
 * As demais continuam acessíveis em "Ver todas" e nos filtros.
 */
export function selectMainHomeCategories(
  resolved: DirectoryCategoryItem[],
  featuredCategoryIds: Array<string | null | undefined>,
  primaryCategories: DirectoryCategoryItem[] = [],
  max: number = HOME_MAIN_CATEGORIES_MAX,
): DirectoryCategoryItem[] {
  const limit = Math.max(1, max);
  const featured = new Set(featuredCategoryIds.filter((id): id is string => Boolean(id)));
  const featuredResolved = resolved.filter((c) => featured.has(c.id));
  if (featuredResolved.length > 0) return featuredResolved;

  const byId = new Map(resolved.map((c) => [c.id, c]));
  const primaryResolved = primaryCategories.map((c) => byId.get(c.id)).filter((c): c is DirectoryCategoryItem => Boolean(c));
  if (primaryResolved.length > 0) return primaryResolved.slice(0, limit);

  return resolved.slice(0, limit);
}

/**
 * Resolve as categorias a serem exibidas na página principal do Guia.
 *
 * REGRA DE NEGÓCIO:
 * 1. Exibe apenas categorias que possuem empresas cadastradas/publicadas (originadas de `categoriesWithBusinesses`).
 * 2. Se a categoria com empresas cadastradas estiver configurada como destaque no painel administrativo,
 *    ela tem prioridade de exibição (ordenada pelo `display_order`), utilizando o título e ícone customizados caso definidos.
 * 3. Categorias em destaque que NÃO possuem empresas cadastradas são OMITIDAS.
 * 4. As demais categorias com empresas cadastradas completam a lista (ordenadas por nome alfabeticamente).
 * 5. Se nenhuma categoria tiver empresas (banco vazio / mock), utiliza `fallbackCategories` para resiliência.
 */
export function resolveHomeCategories(params: {
  categoriesWithBusinesses: FilterCategory[];
  featuredCategories?: FeaturedCategoryEntry[];
  fallbackCategories?: DirectoryCategoryItem[];
}): DirectoryCategoryItem[] {
  const { categoriesWithBusinesses, featuredCategories = [], fallbackCategories = [] } = params;

  if (!categoriesWithBusinesses || categoriesWithBusinesses.length === 0) {
    return fallbackCategories;
  }

  const featMap = new Map<string, FeaturedCategoryEntry>();
  for (const fc of featuredCategories) {
    if (fc.category_id) {
      featMap.set(fc.category_id, fc);
    }
  }

  const featuredWithBiz: Array<DirectoryCategoryItem & { display_order: number }> = [];
  const regularWithBiz: DirectoryCategoryItem[] = [];

  for (const cat of categoriesWithBusinesses) {
    const feat = featMap.get(cat.id);
    if (feat) {
      featuredWithBiz.push({
        id: cat.id,
        slug: cat.slug,
        name: feat.custom_title?.trim() || cat.name,
        icon_name: feat.icon_name || cat.icon_name,
        display_order: typeof feat.display_order === 'number' ? feat.display_order : 9999,
      });
    } else {
      regularWithBiz.push({
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        icon_name: cat.icon_name,
      });
    }
  }

  // Ordena os destaques pelo display_order crescente
  featuredWithBiz.sort((a, b) => a.display_order - b.display_order);

  // Retorna os destaques que têm empresas, seguidos pelas demais categorias com empresas
  return [
    ...featuredWithBiz.map(({ display_order: _, ...item }) => item),
    ...regularWithBiz,
  ];
}
