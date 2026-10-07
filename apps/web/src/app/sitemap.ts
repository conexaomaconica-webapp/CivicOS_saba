import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/seo/app-url';
import { buildSitemapBusinessEntries } from '@/lib/seo/sitemap-businesses';
import { buildDirectoryIndex, buildDirectorySitemapUrls } from '@/lib/seo/directory-seo';
import { loadPublishedDirectoryRows } from '@/lib/seo/directory-seo-server';

// Sempre dinâmico: precisa do domínio da requisição para saber de qual tenant listar as empresas. A lista em si fica em
// cache de 5 minutos (e é invalidada na hora quando uma empresa é publicada ou suspensa).
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = [
    { url: appUrl('/'), lastModified: now, changeFrequency: 'weekly', priority: 1.0 },
    { url: appUrl('/guia'), lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: appUrl('/guia/empresas'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: appUrl('/guia/lojas'), lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
    { url: appUrl('/termos'), changeFrequency: 'yearly', priority: 0.2 },
    { url: appUrl('/privacidade'), changeFrequency: 'yearly', priority: 0.2 },
  ];

  // Falha de leitura nunca derruba o sitemap: sem empresas, ele devolve só as páginas fixas.
  const rows = await loadPublishedDirectoryRows();
  const businesses = buildSitemapBusinessEntries(rows);
  const directoryPages: MetadataRoute.Sitemap = buildDirectorySitemapUrls(buildDirectoryIndex(rows)).map((page) => ({
    ...page,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));
  return [...staticPages, ...directoryPages, ...businesses];
}
