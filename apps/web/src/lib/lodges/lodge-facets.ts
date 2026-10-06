import { unstable_cache } from 'next/cache';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { getRequestHost, resolveStrictDomainTenantId } from '@/lib/tenant/tenant-policy';
import { buildLodgeFacets, fetchLodgeFacets, type LodgeGuideFacets } from '@/lib/lodges/facets';

export type LodgeFacetRow = { city: string | null; state: string | null; potency: string | null; rite: string | null };

const PAGE = 1000;
const MAX_ROWS = 20000;

/**
 * Valores distintos de cidade/UF/potência/rito das lojas publicadas, para montar as opções dos filtros de /guia/lojas.
 * Lê TODAS as lojas (o limite padrão do banco é 1000 linhas e deixava as opções incompletas) e guarda o resultado em
 * cache por uma hora. Só dados públicos (colunas já exibidas no Guia), lidos no servidor.
 */
const loadFacetRows = unstable_cache(
  async (tenantId: string): Promise<LodgeFacetRow[]> => {
    const db = createServiceRoleClient();
    if (!db) return [];
    const distinct = new Map<string, LodgeFacetRow>();
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await db
        .from('organizations')
        .select('city, state, potency, rite')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .eq('is_published', true)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) break;
      const rows = (data || []) as LodgeFacetRow[];
      for (const row of rows) {
        distinct.set(`${row.city}|${row.state}|${row.potency}|${row.rite}`, {
          city: row.city, state: row.state, potency: row.potency, rite: row.rite,
        });
      }
      if (rows.length < PAGE) break;
    }
    return [...distinct.values()];
  },
  ['lodge-filter-facets-v1'],
  { revalidate: 3600 },
);

/** Opções dos filtros do tenant do domínio; devolve [] se não for possível ler (a página usa então o que já tinha). */
export async function getLodgeFacetRows(supabase: unknown, host: string): Promise<LodgeFacetRow[]> {
  try {
    const tenantId = await resolveStrictDomainTenantId(supabase, host);
    return await loadFacetRows(tenantId);
  } catch {
    return [];
  }
}

/**
 * Opções dos filtros da seção "Guia de Lojas" da página principal (/guia): todas as lojas publicadas, em cache.
 * Se a leitura completa não for possível, usa a leitura direta antiga.
 */
export async function fetchLodgeGuideFacets(supabase: unknown): Promise<LodgeGuideFacets> {
  const rows = await getLodgeFacetRows(supabase, await getRequestHost());
  return rows.length > 0 ? buildLodgeFacets(rows) : fetchLodgeFacets(supabase);
}
