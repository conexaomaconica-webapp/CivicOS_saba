import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/seo/app-url';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = appUrl('');

  const privatePaths = ['/admin/', '/dashboard/', '/api/', '/diagnostics/'];

  const crawlers = ['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];

  return {
    rules: crawlers.map((userAgent) => ({
      userAgent,
      allow: '/',
      disallow: privatePaths,
    })),
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}