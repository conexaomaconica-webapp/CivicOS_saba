'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, revalidateTag, unstable_cache } from 'next/cache';
import { resolveCanonicalAdminTenant } from './admin-tenant-context';
import { canonicalPotencyCode, potencyLabel } from '@/lib/lodges/potency';
import { formatMeetingDay, formatMeetingTime } from '@/lib/lodges/format';

/**
 * Listagem administrativa de Lojas Maçônicas com paginação no servidor, filtros, KPIs reais e ações em massa.
 *
 * Todas as funções exigem admin da plataforma e trabalham SOMENTE no tenant administrado. O cliente de serviço é usado
 * depois dessa checagem, para não esbarrar no limite de 1000 linhas nem em RLS durante operações em lote.
 */

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export type LodgeListFilters = {
  q?: string;
  state?: string;
  city?: string;
  potency?: string;
  rite?: string;
  status?: 'all' | 'published' | 'inactive';
  logo?: 'all' | 'missing' | 'has';
  coords?: 'all' | 'missing';
};

export type LodgeListSort = 'recent' | 'name' | 'number';

export type AdminLodgeRow = {
  id: string;
  name: string;
  slug: string;
  code_number: number | null;
  potency: string;
  rite: string;
  city: string;
  state: string;
  meeting: string;
  has_logo: boolean;
  logo_url: string | null;
  has_coords: boolean;
  is_active: boolean;
  is_published: boolean;
  is_featured: boolean;
  provenance: string;
  completeness_percent: number;
  created_at: string;
};

export type AdminLodgeKpis = {
  total: number;
  published: number;
  inactive: number;
  missing_logo: number;
  missing_coords: number;
};

const PAGE_SIZES = [25, 50, 100, 200];
const IDS_PAGE = 1000; // limite do PostgREST por requisição
const MAX_BULK = 20000;

// ---------------------------------------------------------------------------
// Filtros
// ---------------------------------------------------------------------------
/** Remove caracteres que quebrariam a sintaxe de .or(...) do PostgREST. */
const clean = (value: string) => value.replace(/[,()*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

export async function normalizeLodgeFilters(raw: Partial<LodgeListFilters> | undefined): Promise<LodgeListFilters> {
  const f = raw || {};
  return {
    q: f.q ? clean(f.q) : undefined,
    state: f.state && /^[A-Za-z]{2}$/.test(f.state.trim()) ? f.state.trim().toUpperCase() : undefined,
    city: f.city ? clean(f.city) : undefined,
    potency: f.potency ? clean(f.potency) : undefined,
    rite: f.rite ? clean(f.rite) : undefined,
    status: f.status === 'published' || f.status === 'inactive' ? f.status : 'all',
    logo: f.logo === 'missing' || f.logo === 'has' ? f.logo : 'all',
    coords: f.coords === 'missing' ? 'missing' : 'all',
  };
}

function applyFilters(query: any, f: LodgeListFilters) {
  if (f.q) {
    const like = `%${f.q}%`;
    const parts = [`name.ilike.${like}`, `city.ilike.${like}`, `slug.ilike.${like}`, `worshipful_master_name.ilike.${like}`];
    if (/^\d{1,6}$/.test(f.q)) parts.push(`code_number.eq.${f.q}`);
    query = query.or(parts.join(','));
  }
  if (f.state) query = query.eq('state', f.state);
  if (f.city) query = query.ilike('city', f.city);
  if (f.potency) {
    // "CMSB" também traz as variantes por estado: CMSB/BA, CMSB-RJ, "CMSB SP".
    const p = f.potency;
    query = query.or([`potency.ilike.${p}`, `potency.ilike.${p}/%`, `potency.ilike.${p}-%`, `potency.ilike.${p} %`].join(','));
  }
  if (f.rite) query = query.ilike('rite', `%${f.rite}%`);
  if (f.status === 'published') query = query.eq('is_active', true).eq('is_published', true);
  if (f.status === 'inactive') query = query.or('is_active.eq.false,is_published.eq.false');
  if (f.logo === 'missing') query = query.or('logo_url.is.null,logo_url.eq.').or('emblem_url.is.null,emblem_url.eq.');
  if (f.logo === 'has') query = query.or('logo_url.neq.,emblem_url.neq.');
  if (f.coords === 'missing') query = query.or('latitude.is.null,longitude.is.null');
  return query;
}

// ---------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------
const LIST_COLUMNS =
  'id, name, slug, code_number, potency, rite, city, state, address, latitude, longitude, logo_url, emblem_url, meeting_schedule, is_active, is_published, is_featured, provenance, created_at';

function completeness(o: any): number {
  const checks = [
    Boolean(o.name),
    Boolean(o.potency),
    Boolean(o.city && o.state),
    Boolean(o.address),
    o.latitude != null && o.longitude != null,
    Boolean(o.logo_url || o.emblem_url),
    Boolean(o.meeting_schedule || o.__meeting),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export async function listAdminLodgesAction(params: {
  filters?: Partial<LodgeListFilters>;
  page?: number;
  pageSize?: number;
  sort?: LodgeListSort;
}): Promise<{
  success: boolean;
  error?: string;
  items: AdminLodgeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  kpis: AdminLodgeKpis;
}> {
  const empty = {
    items: [] as AdminLodgeRow[],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 1,
    kpis: { total: 0, published: 0, inactive: 0, missing_logo: 0, missing_coords: 0 },
  };

  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const db = getServiceClient();
    const filters = await normalizeLodgeFilters(params.filters);
    const pageSize = PAGE_SIZES.includes(Number(params.pageSize)) ? Number(params.pageSize) : 50;
    const sort: LodgeListSort = params.sort === 'name' || params.sort === 'number' ? params.sort : 'recent';

    const base = () => db.from('organizations').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId);
    const countOf = async (apply: (q: any) => any): Promise<number> => {
      const { count } = await apply(base());
      return count || 0;
    };

    // KPIs da base inteira (contagem exata no banco, sem o limite de 1000 linhas)
    const [total, published, missingLogo, missingCoords] = await Promise.all([
      countOf((q) => q),
      countOf((q) => q.eq('is_active', true).eq('is_published', true)),
      countOf((q) => q.or('logo_url.is.null,logo_url.eq.').or('emblem_url.is.null,emblem_url.eq.')),
      countOf((q) => q.or('latitude.is.null,longitude.is.null')),
    ]);

    // Total do filtro atual
    const filteredTotal = await countOf((q) => applyFilters(q, filters));
    const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));
    const page = Math.min(Math.max(1, Math.floor(Number(params.page) || 1)), totalPages);
    const from = (page - 1) * pageSize;

    let rowsQuery = applyFilters(db.from('organizations').select(LIST_COLUMNS).eq('tenant_id', tenantId), filters);
    if (sort === 'name') rowsQuery = rowsQuery.order('name', { ascending: true });
    else if (sort === 'number') rowsQuery = rowsQuery.order('code_number', { ascending: true, nullsFirst: false });
    else rowsQuery = rowsQuery.order('created_at', { ascending: false });
    // Desempate por id: sem ele, linhas com o mesmo created_at (importação em lote) podem repetir ou sumir entre páginas.
    rowsQuery = rowsQuery.order('id', { ascending: true }).range(from, from + pageSize - 1);

    const { data: rows, error } = await rowsQuery;
    if (error) throw error;

    // Primeira reunião pública de cada loja da página (importadas ficam em organization_meetings)
    const meetingByOrg = new Map<string, string>();
    const ids = (rows || []).map((row: any) => row.id);
    if (ids.length > 0) {
      const { data: meetings } = await db
        .from('organization_meetings')
        .select('organization_id, meeting_day, meeting_time, label, sort_order, created_at')
        .in('organization_id', ids)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true });
      for (const m of meetings || []) {
        if (meetingByOrg.has(m.organization_id)) continue;
        const day = formatMeetingDay(m.meeting_day, m.label);
        const time = formatMeetingTime(m.meeting_time);
        if (day) meetingByOrg.set(m.organization_id, time ? `${day} • ${time}` : day);
      }
    }

    const items: AdminLodgeRow[] = (rows || []).map((o: any) => {
      const meeting = meetingByOrg.get(o.id) || o.meeting_schedule || '';
      const logo = o.logo_url || o.emblem_url || null;
      return {
        id: o.id,
        name: o.name || 'Sem nome',
        slug: o.slug || o.id,
        code_number: o.code_number ?? null,
        potency: o.potency || '',
        rite: o.rite || '',
        city: o.city || '',
        state: o.state || '',
        meeting,
        has_logo: Boolean(logo),
        logo_url: logo,
        has_coords: o.latitude != null && o.longitude != null,
        is_active: Boolean(o.is_active),
        is_published: Boolean(o.is_published),
        is_featured: Boolean(o.is_featured),
        provenance: o.provenance || 'manual',
        completeness_percent: completeness({ ...o, __meeting: meeting }),
        created_at: o.created_at,
      };
    });

    return {
      success: true,
      items,
      total: filteredTotal,
      page,
      pageSize,
      totalPages,
      kpis: { total, published, inactive: Math.max(0, total - published), missing_logo: missingLogo, missing_coords: missingCoords },
    };
  } catch (err: any) {
    console.error('[listAdminLodgesAction]', err);
    return { ...empty, success: false, error: err?.message?.startsWith('FORBIDDEN') || err?.message?.startsWith('UNAUTHORIZED') ? err.message : 'Não foi possível carregar as lojas.' };
  }
}

// ---------------------------------------------------------------------------
// Facetas dos filtros (estados e potências existentes), em cache curto
// ---------------------------------------------------------------------------
export type LodgeFacets = {
  states: Array<{ value: string; count: number }>;
  potencies: Array<{ value: string; label: string; count: number }>;
};

const loadFacets = unstable_cache(
  async (tenantId: string): Promise<LodgeFacets> => {
    const db = getServiceClient();
    const states = new Map<string, number>();
    const potencies = new Map<string, number>();

    for (let from = 0; from < MAX_BULK; from += IDS_PAGE) {
      const { data } = await db
        .from('organizations')
        .select('state, potency')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true })
        .range(from, from + IDS_PAGE - 1);
      const rows = data || [];
      for (const row of rows as Array<{ state?: string | null; potency?: string | null }>) {
        const uf = (row.state || '').trim().toUpperCase();
        if (uf) states.set(uf, (states.get(uf) || 0) + 1);
        const code = canonicalPotencyCode(row.potency);
        if (code) potencies.set(code, (potencies.get(code) || 0) + 1);
      }
      if (rows.length < IDS_PAGE) break;
    }

    const collator = new Intl.Collator('pt-BR');
    return {
      states: [...states.entries()].sort((a, b) => collator.compare(a[0], b[0])).map(([value, count]) => ({ value, count })),
      potencies: [...potencies.entries()]
        .sort((a, b) => collator.compare(a[0], b[0]))
        .map(([value, count]) => ({ value, label: potencyLabel(value), count })),
    };
  },
  ['admin-lodge-facets'],
  { revalidate: 300, tags: ['admin-lodges'] },
);

export async function getAdminLodgeFacetsAction(): Promise<LodgeFacets & { tenantId: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    return { ...(await loadFacets(tenantId)), tenantId };
  } catch {
    return { states: [], potencies: [], tenantId: '' };
  }
}

// ---------------------------------------------------------------------------
// Ações em massa
// ---------------------------------------------------------------------------
export type BulkScope = {
  /** Seleção explícita (checkboxes). */
  ids?: string[];
  /** "Selecionar todas as N lojas que correspondem ao filtro". */
  allMatching?: boolean;
  filters?: Partial<LodgeListFilters>;
  /** Quantidade que a tela mostrava; se a base mudou, a operação é recusada em vez de atingir outro conjunto. */
  expectedCount?: number;
};

export type BulkPatch = {
  /** true = publicar (ativa e publica no guia); false = inativar. */
  published?: boolean;
  is_featured?: boolean;
  show_address?: boolean;
  show_worshipful_master?: boolean;
  potency?: string;
  rite?: string;
  state?: string;
  city?: string;
  /** URL do brasão/logo; string vazia remove. */
  logo_url?: string;
};

async function resolveBulkIds(db: any, tenantId: string, scope: BulkScope): Promise<{ ids: string[]; error?: string }> {
  if (scope.allMatching) {
    const filters = await normalizeLodgeFilters(scope.filters);
    const ids: string[] = [];
    for (let from = 0; from < MAX_BULK; from += IDS_PAGE) {
      const { data, error } = await applyFilters(db.from('organizations').select('id').eq('tenant_id', tenantId), filters)
        .order('id', { ascending: true })
        .range(from, from + IDS_PAGE - 1);
      if (error) return { ids: [], error: 'Não foi possível montar a lista de lojas.' };
      const rows = data || [];
      ids.push(...rows.map((row: any) => row.id));
      if (rows.length < IDS_PAGE) break;
    }
    if (scope.expectedCount != null && ids.length !== scope.expectedCount) {
      return { ids: [], error: `A lista mudou (agora são ${ids.length} lojas, e a tela mostrava ${scope.expectedCount}). Recarregue a página e tente de novo.` };
    }
    return { ids };
  }

  const ids = Array.from(new Set((scope.ids || []).filter((id) => typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id))));
  if (ids.length === 0) return { ids: [], error: 'Nenhuma loja selecionada.' };
  if (ids.length > MAX_BULK) return { ids: [], error: `Selecione no máximo ${MAX_BULK} lojas por vez.` };
  return { ids };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

function afterBulkChange() {
  revalidateTag('admin-lodges');
  revalidatePath('/admin/lojas');
  revalidatePath('/guia/lojas');
  revalidatePath('/guia');
}

/** Edição em massa. Só os campos informados são alterados; os demais permanecem como estão. */
export async function bulkUpdateLodgesAction(input: {
  scope: BulkScope;
  patch: BulkPatch;
}): Promise<{ success: boolean; error?: string; updated?: number }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const db = getServiceClient();

    const update: Record<string, unknown> = {};
    const p = input.patch || {};
    if (typeof p.published === 'boolean') {
      update.is_active = p.published;
      update.is_published = p.published;
    }
    if (typeof p.is_featured === 'boolean') update.is_featured = p.is_featured;
    if (typeof p.show_address === 'boolean') update.show_address = p.show_address;
    if (typeof p.show_worshipful_master === 'boolean') update.show_worshipful_master = p.show_worshipful_master;
    if (typeof p.potency === 'string' && p.potency.trim()) update.potency = clean(p.potency).toUpperCase();
    if (typeof p.rite === 'string' && p.rite.trim()) update.rite = clean(p.rite);
    if (typeof p.state === 'string' && p.state.trim()) {
      if (!/^[A-Za-z]{2}$/.test(p.state.trim())) return { success: false, error: 'Estado inválido: use a sigla (ex.: BA).' };
      update.state = p.state.trim().toUpperCase();
    }
    if (typeof p.city === 'string' && p.city.trim()) update.city = clean(p.city);
    if (typeof p.logo_url === 'string') {
      const url = p.logo_url.trim();
      if (url && !/^(https:\/\/\S+|\/[^\s]*)$/.test(url)) return { success: false, error: 'O brasão deve ser uma URL https ou um caminho do site.' };
      if (url.length > 600) return { success: false, error: 'URL do brasão muito longa.' };
      update.logo_url = url || null;
    }
    if (Object.keys(update).length === 0) return { success: false, error: 'Escolha ao menos um campo para alterar.' };
    update.updated_at = new Date().toISOString();

    const { ids, error } = await resolveBulkIds(db, tenantId, input.scope);
    if (error) return { success: false, error };

    let updated = 0;
    for (const part of chunk(ids, 500)) {
      const { error: updateError, count } = await db
        .from('organizations')
        .update(update, { count: 'exact' })
        .eq('tenant_id', tenantId)
        .in('id', part);
      if (updateError) {
        return {
          success: false,
          updated,
          error: `Falha após alterar ${updated} loja(s): ${updateError.message}. As anteriores foram mantidas.`,
        };
      }
      updated += count || 0;
    }

    afterBulkChange();
    return { success: true, updated };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao executar a edição em massa.' };
  }
}

/** Exclusão definitiva em massa. Exige confirmação digitada ("EXCLUIR" ou "EXCLUIR <quantidade>" para seleção por filtro). */
export async function bulkDeleteLodgesAction(input: {
  scope: BulkScope;
  confirmation: string;
}): Promise<{ success: boolean; error?: string; deleted?: number }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const db = getServiceClient();

    const { ids, error } = await resolveBulkIds(db, tenantId, input.scope);
    if (error) return { success: false, error };
    if (ids.length === 0) return { success: false, error: 'Nenhuma loja encontrada para excluir.' };

    const typed = (input.confirmation || '').trim().toUpperCase();
    const expected = input.scope.allMatching ? `EXCLUIR ${ids.length}` : 'EXCLUIR';
    if (typed !== expected) {
      return { success: false, error: `Confirmação incorreta. Digite exatamente: ${expected}` };
    }

    let deleted = 0;
    for (const part of chunk(ids, 200)) {
      const { error: deleteError, count } = await db
        .from('organizations')
        .delete({ count: 'exact' })
        .eq('tenant_id', tenantId)
        .in('id', part);
      if (deleteError) {
        return {
          success: false,
          deleted,
          error: `Falha após excluir ${deleted} loja(s): ${deleteError.message}. Verifique vínculos que impedem a exclusão.`,
        };
      }
      deleted += count || 0;
    }

    afterBulkChange();
    return { success: true, deleted };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao executar a exclusão em massa.' };
  }
}
