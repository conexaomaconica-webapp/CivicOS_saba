import type { MetadataRoute } from 'next';
import { buildSitemapBusinessEntries } from '@/lib/seo/sitemap-businesses';
import { buildDirectoryIndex, buildDirectorySitemapUrls } from '@/lib/seo/directory-seo';
import { loadPublishedDirectoryRows } from '@/lib/seo/directory-seo-server';
import { loadPublicSeoEvents } from '@/lib/seo/public-events-server';
import { buildSitemapEventEntries, buildStaticSitemapEntries, latestDate } from '@/lib/seo/sitemap-entries';

// Sempre dinâmico: precisa do domínio da requisição para saber de qual tenant listar. As listas ficam em cache de
// 5 minutos (invalidado na hora quando uma empresa é publicada ou suspensa).
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Falha de leitura nunca derruba o sitemap: sem dados, ele devolve só as páginas fixas.
  const [rows, events] = await Promise.all([loadPublishedDirectoryRows(), loadPublicSeoEvents()]);

  const staticPages = buildStaticSitemapEntries(
    latestDate(rows.map((row) => row.updated_at)),
    latestDate(events.map((event) => event.updated_at))
  );
  const businesses = buildSitemapBusinessEntries(rows);
  const directoryPages: MetadataRoute.Sitemap = buildDirectorySitemapUrls(buildDirectoryIndex(rows)).map((page) => ({
    ...page,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));
  const eventPages = buildSitemapEventEntries(events);

  return [...staticPages, ...directoryPages, ...eventPages, ...businesses];
}
