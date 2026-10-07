import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/seo/app-url';

/** Data da alteração mais recente entre as linhas; null se nenhuma tiver data válida. */
export function latestDate(values: Array<string | null | undefined>): Date | null {
  let latest = 0;
  for (const value of values) {
    const time = value ? new Date(value).getTime() : NaN;
    if (!Number.isNaN(time) && time > latest) latest = time;
  }
  return latest > 0 ? new Date(latest) : null;
}

/**
 * Páginas fixas do sitemap. `lastModified` só existe quando há um dado real de alteração: /guia e /guia/empresas mudam
 * quando uma empresa é criada ou editada, então usam a edição mais recente. As demais não têm data confiável e a omitem
 * (o Google prefere nenhum lastmod a um que muda a cada requisição).
 */
export function buildStaticSitemapEntries(lastBusinessUpdate: Date | null, lastEventUpdate: Date | null): MetadataRoute.Sitemap {
  const withDate = (date: Date | null) => (date ? { lastModified: date } : {});
  return [
    { url: appUrl('/'), changeFrequency: 'weekly', priority: 1.0 },
    { url: appUrl('/guia'), ...withDate(lastBusinessUpdate), changeFrequency: 'daily', priority: 0.9 },
    { url: appUrl('/guia/empresas'), ...withDate(lastBusinessUpdate), changeFrequency: 'daily', priority: 0.8 },
    { url: appUrl('/guia/lojas'), changeFrequency: 'weekly', priority: 0.6 },
    { url: appUrl('/guia/eventos'), ...withDate(lastEventUpdate), changeFrequency: 'weekly', priority: 0.6 },
    { url: appUrl('/guia/beneficios'), changeFrequency: 'weekly', priority: 0.6 },
    { url: appUrl('/termos'), changeFrequency: 'yearly', priority: 0.2 },
    { url: appUrl('/privacidade'), changeFrequency: 'yearly', priority: 0.2 },
  ];
}

export type SitemapEventRow = { slug: string | null; updated_at?: string | null };

/** Eventos públicos publicados: uma entrada por slug, com a data real da última atualização. */
export function buildSitemapEventEntries(rows: SitemapEventRow[]): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];
  for (const row of rows) {
    const slug = (row.slug ?? '').trim().toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || seen.has(slug)) continue;
    seen.add(slug);
    const updated = latestDate([row.updated_at]);
    entries.push({
      url: appUrl(`/eventos/${slug}`),
      ...(updated ? { lastModified: updated } : {}),
      changeFrequency: 'weekly',
      priority: 0.6,
    });
  }
  return entries;
}
