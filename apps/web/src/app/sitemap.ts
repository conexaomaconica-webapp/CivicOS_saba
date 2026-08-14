import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/seo/app-url';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = appUrl('');

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: appUrl('/guia'),
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: appUrl('/anunciar/passo-1'),
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];
}