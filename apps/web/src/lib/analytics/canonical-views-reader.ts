import { createClient } from '@supabase/supabase-js';

function getServiceReader(existingReader?: any): any {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  }
  return existingReader || null;
}

/**
 * Lê o contador oficial canônico de visualizações (`views_count`) para um conjunto de empresas.
 *
 * Estratégia resiliente em 3 níveis (imune ao limite de 1.000 linhas do PostgREST e imune a contador congelado pós-rollback):
 *   1. Primária (RPC `get_canonical_business_views_counts` da Migration 258):
 *      Verifica no catálogo do PostgreSQL (`pg_trigger`) se o trigger `trg_sync_business_views_count` está ativo.
 *      - Se ativo: lê `businesses.views_count` em O(1).
 *      - Se inativo (ex.: após rollback do trigger): calcula `COUNT(DISTINCT COALESCE(cycle_id, id))` dos eventos elegíveis em SQL!
 *   2. Secundária (Coluna `businesses.views_count` quando verificada como sincronizada):
 *      Lê `businesses.views_count` caso a RPC ainda não exista mas o trigger esteja ativo.
 *   3. Fallback Universal (pré-Migration 258 ou pós-rollback sem RPC):
 *      Executa `SELECT COUNT(*)` exato (`count: 'exact', head: true`) por empresa em paralelo em `analytics_events`,
 *      eliminando 100% o truncamento de 1.000 linhas do PostgREST.
 */
export async function resolveCanonicalViewsCountsMap(
  businessIds: string[],
  existingDbReader?: any
): Promise<Record<string, number>> {
  const uniqueIds = Array.from(
    new Set((businessIds || []).filter((id): id is string => typeof id === 'string' && id.trim().length > 0))
  );

  const countsMap: Record<string, number> = {};
  for (const id of uniqueIds) {
    countsMap[id] = 0;
  }

  if (uniqueIds.length === 0) {
    return countsMap;
  }

  const dbReader = getServiceReader(existingDbReader);
  if (!dbReader) {
    return countsMap;
  }

  // 1. Tenta a RPC canônica `get_canonical_business_views_counts` (que detecta automaticamente rollback de trigger no Postgres)
  try {
    if (typeof (dbReader as any).rpc === 'function') {
      const { data: rpcMap, error: rpcErr } = await (dbReader as any).rpc(
        'get_canonical_business_views_counts',
        { p_business_ids: uniqueIds }
      );
      if (!rpcErr && rpcMap && typeof rpcMap === 'object' && !Array.isArray(rpcMap)) {
        let applied = false;
        for (const id of uniqueIds) {
          const val = Number((rpcMap as Record<string, unknown>)[id]);
          if (Number.isFinite(val)) {
            countsMap[id] = Math.max(0, Math.trunc(val));
            applied = true;
          }
        }
        if (applied) {
          return countsMap;
        }
      }
    }
  } catch {
    // Segue para o fallback SQL exato por empresa
  }

  // 2. Fallback Universal: COUNT(*) exato no PostgreSQL (`head: true`) por empresa (sem teto de 1.000 linhas e nunca congelado)
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const { count } = await (dbReader as any)
          .from('analytics_events')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', id)
          .eq('event_name', 'view');

        if (typeof count === 'number' && Number.isFinite(count)) {
          countsMap[id] = Math.max(0, count);
        }
      } catch {
        countsMap[id] = countsMap[id] ?? 0;
      }
    })
  );

  return countsMap;
}

/**
 * Lê o contador oficial canônico de visualizações para uma única empresa.
 */
export async function resolveSingleBusinessCanonicalViewsCount(
  businessId: string,
  existingDbReader?: any
): Promise<number> {
  if (!businessId || typeof businessId !== 'string') return 0;
  const map = await resolveCanonicalViewsCountsMap([businessId], existingDbReader);
  return map[businessId] ?? 0;
}
