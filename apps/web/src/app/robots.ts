import type { MetadataRoute } from 'next';
import { appUrl } from '@/lib/seo/app-url';

/**
 * Áreas que não têm valor para busca e exigem login ou usam link com token. O bloqueio aqui NÃO substitui o noindex:
 * o funil /anunciar e as pesquisas ficam de fora da lista de propósito, para o Google conseguir ler o noindex delas.
 */
const PRIVATE_PATHS = [
  '/admin/',
  '/dashboard/',
  '/api/',
  '/diagnostics/',
  '/anunciante/',
  '/minha-conta/',
  '/usuario/',
  '/master/',
  '/platform/',
  '/auth/',
  '/c/',
  '/cadastro/',
  '/contratacao/',
  '/adesao/',
];

const ROBOTS_CRAWLERS = ['*', 'GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot'];

export default function robots(): MetadataRoute.Robots {
  const baseUrl = appUrl('');

  return {
    rules: ROBOTS_CRAWLERS.map((userAgent) => ({
      userAgent,
      allow: '/',
      disallow: PRIVATE_PATHS,
    })),
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
