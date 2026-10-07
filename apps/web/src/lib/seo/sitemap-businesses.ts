import type { MetadataRoute } from 'next';
import { businessCanonicalUrl } from '@/lib/seo/business-seo';

export type SitemapBusinessRow = {
  slug: string | null;
  updated_at?: string | null;
  seo_indexable?: boolean | null;
};

/** Só empresas publicadas e indexáveis, uma vez por slug, com lastmod real (updated_at). */
export function buildSitemapBusinessEntries(rows: SitemapBusinessRow[]): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];
  for (const row of rows) {
    const slug = (row.slug ?? '').trim();
    if (!slug || seen.has(slug) || row.seo_indexable === false) continue;
    seen.add(slug);
    const updated = row.updated_at ? new Date(row.updated_at) : null;
    entries.push({
      url: businessCanonicalUrl(slug),
      lastModified: updated && !Number.isNaN(updated.getTime()) ? updated : undefined,
      changeFrequency: 'weekly',
      priority: 0.7,
    });
  }
  return entries;
}
