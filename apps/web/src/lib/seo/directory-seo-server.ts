import { cache } from 'react';
import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { buildDirectoryIndex, type CityGroup, type DirectoryRow } from '@/lib/seo/directory-seo';

export const PUBLIC_SEO_CACHE_TAG = 'public-seo';

type DirectoryRpcRow = {
  slug: string | null;
  name: string | null;
  category: string | null;
  description: string | null;
  logo_url: string | null;
  updated_at: string | null;
  seo_indexable: boolean | null;
  city: string | null;
  state: string | null;
};

/**
 * Lista pública das empresas publicadas, via função do banco (public_seo_directory). O visitante anônimo e o Googlebot
 * não leem a tabela businesses diretamente. Usa um cliente sem cookies para o resultado poder ficar em cache
 * (5 minutos, e invalidado quando uma empresa é publicada, suspensa ou editada no SEO).
 */
const fetchDirectoryRows = unstable_cache(
  async (host: string): Promise<DirectoryRpcRow[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase não configurado');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.rpc('public_seo_directory' as never, { p_host: host } as never);
    // Lança para NÃO guardar falha no cache.
    if (error) throw new Error(error.message);
    return (data ?? []) as DirectoryRpcRow[];
  },
  ['public-seo-directory'],
  { revalidate: 300, tags: [PUBLIC_SEO_CACHE_TAG] }
);

/** Falha de leitura devolve lista vazia: o sitemap só traz as páginas fixas e as páginas de cidade dão 404. */
export async function loadPublishedDirectoryRows(): Promise<DirectoryRow[]> {
  try {
    const rawHost = (await headers()).get('host') ?? 'localhost:3000';
    const host = rawHost.split(':')[0]!.toLowerCase();
    const rows = await fetchDirectoryRows(host);
    return rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      category: row.category,
      description: row.description,
      logo_url: row.logo_url,
      updated_at: row.updated_at,
      seo_indexable: row.seo_indexable,
      business_locations: [{ city: row.city, state: row.state }],
    }));
  } catch {
    return [];
  }
}

export const getDirectoryIndex = cache(async (): Promise<CityGroup[]> => buildDirectoryIndex(await loadPublishedDirectoryRows()));
