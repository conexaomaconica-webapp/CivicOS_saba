import type { DirectoryCategoryItem } from '@/components/public/directory/DirectoryCategories';
import type { FilterCategory } from './filter-categories';

export type FeaturedCategoryEntry = {
  category_id: string;
  custom_title?: string | null;
  icon_name?: string | null;
  display_order?: number | null;
};

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
