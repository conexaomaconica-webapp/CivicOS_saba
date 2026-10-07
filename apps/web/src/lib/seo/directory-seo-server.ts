import { cache } from 'react';
import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import { buildDirectoryIndex, type CityGroup, type DirectoryRow } from '@/lib/seo/directory-seo';

const PAGE_SIZE = 1000;
const MAX_ROWS = 20000;

async function fetchPage(supabase: any, tenantId: string, columns: string, from: number) {
  return supabase
    .from('businesses')
    .select(columns)
    .eq('tenant_id', tenantId)
    .eq('publication_status', 'published')
    .eq('is_active', true)
    .order('slug')
    .range(from, from + PAGE_SIZE - 1);
}

/**
 * Empresas publicadas do tenant do domínio, com cidade/estado e categoria. Se a migration 196 ainda não foi aplicada,
 * repete a consulta sem seo_indexable. Qualquer falha devolve lista vazia (as páginas viram 404, o sitemap só as fixas).
 */
export async function loadPublishedDirectoryRows(): Promise<DirectoryRow[]> {
  try {
    const supabase = await createServerSideClient();
    const host = (await headers()).get('host') ?? 'localhost:3000';
    const { data: tenantId } = await (supabase as any).rpc('_resolve_public_tenant_id', { p_host: host });
    if (!tenantId) return [];

    const rows: DirectoryRow[] = [];
    let columns = 'slug, name, category, description, logo_url, updated_at, seo_indexable, business_locations(city, state)';
    for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
      let result = await fetchPage(supabase, tenantId, columns, from);
      if (result.error && columns.includes('seo_indexable')) {
        columns = columns.replace(' seo_indexable,', '');
        result = await fetchPage(supabase, tenantId, columns, from);
      }
      if (result.error || !result.data?.length) break;
      rows.push(...result.data);
      if (result.data.length < PAGE_SIZE) break;
    }
    return rows;
  } catch {
    return [];
  }
}

export const getDirectoryIndex = cache(async (): Promise<CityGroup[]> => buildDirectoryIndex(await loadPublishedDirectoryRows()));
