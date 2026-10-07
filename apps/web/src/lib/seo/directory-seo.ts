import { appUrl } from '@/lib/seo/app-url';
import { categorySlug, resolveState, slugify, stateFromSlug } from '@/lib/seo/geo-slugs';

/**
 * Páginas de cidade e de cidade + categoria do guia. Só existem quando há empresas publicadas de verdade, e só são
 * indexáveis quando atingem o mínimo abaixo (abaixo disso: noindex, follow). Nada é gerado "por antecipação".
 */
export const MIN_BUSINESSES_CITY_INDEXABLE = 3;
export const MIN_BUSINESSES_CITY_CATEGORY_INDEXABLE = 2;

export type DirectoryRow = {
  slug: string | null;
  name: string | null;
  category: string | null;
  description?: string | null;
  logo_url?: string | null;
  updated_at?: string | null;
  seo_indexable?: boolean | null;
  business_locations?: Array<{ city?: string | null; state?: string | null }> | { city?: string | null; state?: string | null } | null;
};

export type DirectoryBusiness = {
  slug: string;
  name: string;
  category: string | null;
  categorySlug: string | null;
  description: string | null;
  logoUrl: string | null;
  updatedAt: string | null;
  indexable: boolean;
};

export type CategoryGroup = { slug: string; name: string; businesses: DirectoryBusiness[] };

export type CityGroup = {
  stateSlug: string;
  stateName: string;
  uf: string;
  citySlug: string;
  cityName: string;
  businesses: DirectoryBusiness[];
  categories: CategoryGroup[];
};

function firstLocation(row: DirectoryRow) {
  const loc = row.business_locations;
  return Array.isArray(loc) ? loc[0] : (loc ?? undefined);
}

/** Agrupa as empresas publicadas por cidade e categoria. Empresa sem cidade/estado reconhecível fica de fora. */
export function buildDirectoryIndex(rows: DirectoryRow[]): CityGroup[] {
  const cities = new Map<string, CityGroup>();
  const seen = new Set<string>();

  for (const row of rows) {
    const slug = (row.slug ?? '').trim();
    const name = (row.name ?? '').trim();
    const loc = firstLocation(row);
    const state = resolveState(loc?.state);
    const cityName = (loc?.city ?? '').trim();
    const citySlug = slugify(cityName);
    if (!slug || !name || !state || !citySlug || seen.has(slug)) continue;
    seen.add(slug);

    const category = (row.category ?? '').trim() || null;
    const business: DirectoryBusiness = {
      slug,
      name,
      category,
      categorySlug: category ? categorySlug(category) || null : null,
      description: row.description?.trim() || null,
      logoUrl: row.logo_url ?? null,
      updatedAt: row.updated_at ?? null,
      indexable: row.seo_indexable !== false,
    };

    const key = `${state.slug}/${citySlug}`;
    let city = cities.get(key);
    if (!city) {
      city = { stateSlug: state.slug, stateName: state.name, uf: state.uf, citySlug, cityName, businesses: [], categories: [] };
      cities.set(key, city);
    }
    city.businesses.push(business);

    if (category && business.categorySlug) {
      let group = city.categories.find((c) => c.slug === business.categorySlug);
      if (!group) {
        group = { slug: business.categorySlug, name: category, businesses: [] };
        city.categories.push(group);
      }
      group.businesses.push(business);
    }
  }

  for (const city of cities.values()) {
    city.businesses.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    city.categories.sort((a, b) => b.businesses.length - a.businesses.length || a.name.localeCompare(b.name, 'pt-BR'));
    city.categories.forEach((c) => c.businesses.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
  }
  return Array.from(cities.values()).sort((a, b) => a.cityName.localeCompare(b.cityName, 'pt-BR'));
}

export function findCity(index: CityGroup[], stateSlug: string, citySlug: string): CityGroup | null {
  if (!stateFromSlug(stateSlug)) return null;
  return index.find((c) => c.stateSlug === stateSlug && c.citySlug === citySlug) ?? null;
}

export function findCategory(city: CityGroup, categorySlug: string): CategoryGroup | null {
  return city.categories.find((c) => c.slug === categorySlug) ?? null;
}

/** Empresas que contam para o critério: só as que podem ser indexadas. */
function countIndexable(list: DirectoryBusiness[]): number {
  return list.filter((b) => b.indexable).length;
}

export function isCityIndexable(city: CityGroup, min = MIN_BUSINESSES_CITY_INDEXABLE): boolean {
  return countIndexable(city.businesses) >= min;
}

export function isCategoryIndexable(group: CategoryGroup, min = MIN_BUSINESSES_CITY_CATEGORY_INDEXABLE): boolean {
  return countIndexable(group.businesses) >= min;
}

export function cityPath(city: Pick<CityGroup, 'stateSlug' | 'citySlug'>): string {
  return `/guia/${city.stateSlug}/${city.citySlug}`;
}

export function categoryPath(city: Pick<CityGroup, 'stateSlug' | 'citySlug'>, categorySlug: string): string {
  return `${cityPath(city)}/${categorySlug}`;
}

/** URLs de cidade e categoria que entram no sitemap (apenas as indexáveis). */
export function buildDirectorySitemapUrls(index: CityGroup[]): Array<{ url: string; lastModified?: Date }> {
  const out: Array<{ url: string; lastModified?: Date }> = [];
  const latest = (list: DirectoryBusiness[]) => {
    const times = list.map((b) => (b.updatedAt ? new Date(b.updatedAt).getTime() : NaN)).filter((t) => !Number.isNaN(t));
    return times.length ? new Date(Math.max(...times)) : undefined;
  };
  for (const city of index) {
    if (isCityIndexable(city)) out.push({ url: appUrl(cityPath(city)), lastModified: latest(city.businesses) });
    for (const group of city.categories) {
      if (isCategoryIndexable(group)) out.push({ url: appUrl(categoryPath(city, group.slug)), lastModified: latest(group.businesses) });
    }
  }
  return out;
}
