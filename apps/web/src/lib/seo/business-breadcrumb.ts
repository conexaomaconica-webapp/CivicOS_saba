import { appUrl } from '@/lib/seo/app-url';
import { businessCanonicalUrl } from '@/lib/seo/business-seo';
import { categoryPath, cityPath, findCategory, findCity, type CityGroup } from '@/lib/seo/directory-seo';
import { categorySlug, resolveState, slugify } from '@/lib/seo/geo-slugs';

export type BreadcrumbItem = { name: string; href?: string };

type BreadcrumbBusiness = {
  name: string;
  slug: string;
  city?: string | null;
  state?: string | null;
  category?: string | null;
};

/**
 * Caminho da empresa: Início > Guia > Cidade > Categoria > Empresa.
 * Cidade e categoria só entram quando a página correspondente EXISTE (está no índice do guia): assim o link nunca leva a
 * um 404. A empresa (último item) é a página atual e não tem link.
 */
export function buildBusinessBreadcrumb(business: BreadcrumbBusiness, index: CityGroup[]): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { name: 'Início', href: '/' },
    { name: 'Guia', href: '/guia' },
  ];

  const state = resolveState(business.state);
  const citySlug = slugify(business.city);
  const city = state && citySlug ? findCity(index, state.slug, citySlug) : null;
  if (city) {
    items.push({ name: city.cityName, href: cityPath(city) });
    const slug = categorySlug(business.category);
    const group = slug ? findCategory(city, slug) : null;
    if (group) items.push({ name: group.name, href: categoryPath(city, group.slug) });
  }

  items.push({ name: business.name });
  return items;
}

/**
 * JSON-LD BreadcrumbList idêntico ao que aparece na tela (mesmos itens, mesma ordem). O último item aponta para a URL
 * canônica da empresa.
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[], currentSlug: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.href ? appUrl(item.href === '/' ? '' : item.href) || appUrl('/') : businessCanonicalUrl(currentSlug),
    })),
  };
}
