import { headers } from 'next/headers';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export const PUBLIC_SEO_EVENTS_TAG = 'public-seo';

export type PublicSeoEventRow = {
  slug: string | null;
  updated_at: string | null;
  event_date: string | null;
};

/**
 * Eventos publicados do tenant do domínio, pela função pública public_seo_events (migration 201). Usa cliente sem
 * cookies para poder ficar em cache de 5 minutos. Falha ao ler (ex.: migration ainda não aplicada) nunca derruba o
 * sitemap: devolve lista vazia.
 */
const fetchPublicEvents = unstable_cache(
  async (host: string): Promise<PublicSeoEventRow[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase não configurado');
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const result = await client.rpc('public_seo_events', { p_host: host });
    if (result.error) throw new Error(result.error.message); // não guarda falha no cache
    return (result.data ?? []) as PublicSeoEventRow[];
  },
  ['public-seo-events'],
  { revalidate: 300, tags: [PUBLIC_SEO_EVENTS_TAG] }
);

export async function loadPublicSeoEvents(): Promise<PublicSeoEventRow[]> {
  try {
    const rawHost = (await headers()).get('host') ?? 'localhost:3000';
    return await fetchPublicEvents(rawHost.split(':')[0]!.toLowerCase());
  } catch {
    return [];
  }
}
