'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath, revalidateTag } from 'next/cache';
import { resolveCanonicalAdminTenant } from './admin-tenant-context';
import { canonicalPotencyCode } from '@/lib/lodges/potency';

/**
 * Potências: visão do que realmente está gravado nas lojas (organizations.potency) + catálogo (masonic_potencies),
 * com unificação/renomeação, limpeza e exclusão em massa. Exige admin da plataforma e atua só no tenant administrado.
 */

const EMPTY = '__empty__';
const PAGE = 1000;
const MAX_ROWS = 50000;

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321', process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export type PotencyUsage = { value: string; label: string; count: number; canonical: string; in_catalog: boolean };
export type CatalogPotency = { id: string; name: string; abbreviation: string; slug: string; is_active: boolean; lodges: number };

const slugOf = (value: string) => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clean = (value: string) => value.replace(/[,()*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);

function afterChange() {
  revalidateTag('admin-lodges');
  revalidatePath('/admin/lojas');
  revalidatePath('/admin/lojas/potencias');
  revalidatePath('/guia/lojas');
}

export async function getPotencyOverviewAction(): Promise<{
  success: boolean;
  error?: string;
  usage: PotencyUsage[];
  catalog: CatalogPotency[];
  totalLodges: number;
}> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const client = db();

    const counts = new Map<string, number>();
    let total = 0;
    for (let from = 0; from < MAX_ROWS; from += PAGE) {
      const { data, error } = await client
        .from('organizations')
        .select('potency')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const rows = data || [];
      for (const row of rows as Array<{ potency: string | null }>) {
        const key = (row.potency || '').trim() || EMPTY;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
      total += rows.length;
      if (rows.length < PAGE) break;
    }

    const { data: cat } = await client.from('masonic_potencies').select('id, name, abbreviation, slug, is_active').eq('tenant_id', tenantId).order('name');
    const catalogRows = (cat || []) as Array<Omit<CatalogPotency, 'lodges'>>;
    const abbreviations = new Set(catalogRows.map((c) => c.abbreviation.trim().toUpperCase()));

    const collator = new Intl.Collator('pt-BR');
    const usage: PotencyUsage[] = [...counts.entries()]
      .map(([value, count]) => ({
        value,
        label: value === EMPTY ? '(sem potência)' : value,
        count,
        canonical: value === EMPTY ? '' : canonicalPotencyCode(value) || '',
        in_catalog: value !== EMPTY && abbreviations.has(value.toUpperCase()),
      }))
      .sort((a, b) => b.count - a.count || collator.compare(a.label, b.label));

    const catalog: CatalogPotency[] = catalogRows.map((c) => ({
      ...c,
      lodges: counts.get(c.abbreviation.trim()) || counts.get(c.abbreviation.trim().toUpperCase()) || 0,
    }));

    return { success: true, usage, catalog, totalLodges: total };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Não foi possível carregar as potências.', usage: [], catalog: [], totalLodges: 0 };
  }
}

async function lodgesWithPotency(client: ReturnType<typeof db>, tenantId: string, value: string) {
  const out: Array<{ id: string; code_number: number | null; name: string | null; city: string | null }> = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    let q = client.from('organizations').select('id, code_number, name, city').eq('tenant_id', tenantId);
    q = value === EMPTY ? q.or('potency.is.null,potency.eq.') : q.eq('potency', value);
    const { data, error } = await q.order('id', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw error;
    out.push(...((data || []) as Array<{ id: string; code_number: number | null; name: string | null; city: string | null }>));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

async function setPotency(client: ReturnType<typeof db>, tenantId: string, ids: string[], potency: string | null, potencyId: string | null) {
  let updated = 0;
  for (let i = 0; i < ids.length; i += 500) {
    const { error, count } = await client
      .from('organizations')
      .update({ potency, potency_id: potencyId, updated_at: new Date().toISOString() }, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .in('id', ids.slice(i, i + 500));
    if (error) throw new Error(error.message);
    updated += count || 0;
  }
  return updated;
}

/**
 * Unifica/renomeia: todas as lojas com qualquer dos valores `from` passam a ter a potência `to`.
 * Lojas que colidiriam com a mesma loja (número + nome + cidade) já existente na potência de destino NÃO são movidas
 * (a base não permite duplicá-la) e voltam no relatório.
 */
export async function mergePotenciesAction(input: {
  from: string[];
  to: string;
  name?: string;
}): Promise<{ success: boolean; error?: string; moved?: number; skipped?: number }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const client = db();
    const to = clean(input.to || '').toUpperCase();
    if (!to) return { success: false, error: 'Informe a sigla de destino.' };
    const sources = Array.from(new Set((input.from || []).map((v) => v.trim()).filter((v) => v === EMPTY || v.toUpperCase() !== to)));
    if (sources.length === 0) return { success: false, error: 'Selecione ao menos uma potência diferente do destino.' };

    // Catálogo: garante a entrada de destino
    const slug = slugOf(to);
    let potencyId: string | null = null;
    const { data: existing } = await client.from('masonic_potencies').select('id').eq('tenant_id', tenantId).eq('slug', slug).maybeSingle();
    if (existing?.id) potencyId = existing.id;
    else {
      const { data: created, error: createError } = await client
        .from('masonic_potencies')
        .insert({ tenant_id: tenantId, name: clean(input.name || '') || to, abbreviation: to, slug, is_active: true })
        .select('id')
        .single();
      if (createError) return { success: false, error: `Não foi possível criar a potência no catálogo: ${createError.message}` };
      potencyId = created.id;
    }

    // A loja é única por potência + número + nome + cidade: o mesmo número em outra cidade/nome é outra loja.
    const identity = (l: { code_number: number | null; name: string | null; city: string | null }) =>
      `${l.code_number}|${(l.name || '').trim()}|${(l.city || '').trim()}`;
    const taken = new Set<string>();
    for (const lodge of await lodgesWithPotency(client, tenantId, to)) if (lodge.code_number != null) taken.add(identity(lodge));

    let moved = 0;
    let skipped = 0;
    for (const source of sources) {
      const movable: string[] = [];
      for (const lodge of await lodgesWithPotency(client, tenantId, source)) {
        if (lodge.code_number != null) {
          if (taken.has(identity(lodge))) {
            skipped += 1;
            continue;
          }
          taken.add(identity(lodge));
        }
        movable.push(lodge.id);
      }
      moved += await setPotency(client, tenantId, movable, to, potencyId);
    }

    afterChange();
    return { success: true, moved, skipped };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao unificar potências.' };
  }
}

/** Remove a potência das lojas que usam os valores informados (ficam "sem potência"). Não exclui lojas. */
export async function clearPotenciesAction(input: { values: string[] }): Promise<{ success: boolean; error?: string; cleared?: number }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const client = db();
    let cleared = 0;
    for (const value of Array.from(new Set((input.values || []).map((v) => v.trim()))).filter((v) => v && v !== EMPTY)) {
      const ids = (await lodgesWithPotency(client, tenantId, value)).map((l) => l.id);
      cleared += await setPotency(client, tenantId, ids, null, null);
    }
    afterChange();
    return { success: true, cleared };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao limpar potências.' };
  }
}

// ---------------------------------------------------------------------------
// Catálogo
// ---------------------------------------------------------------------------
export async function saveCatalogPotencyAction(input: { id?: string; name: string; abbreviation: string }): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const abbreviation = clean(input.abbreviation).toUpperCase();
    const name = clean(input.name);
    if (!abbreviation || !name) return { success: false, error: 'Sigla e nome são obrigatórios.' };
    const payload = { tenant_id: tenantId, name, abbreviation, slug: slugOf(abbreviation), is_active: true, updated_at: new Date().toISOString() };
    const client = db();
    const { error } = input.id
      ? await client.from('masonic_potencies').update(payload).eq('id', input.id).eq('tenant_id', tenantId)
      : await client.from('masonic_potencies').insert(payload);
    if (error) return { success: false, error: error.message };
    afterChange();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar a potência.' };
  }
}

/** Exclui entradas do catálogo. As lojas mantêm o texto da potência; só perdem o vínculo com o catálogo. */
export async function deleteCatalogPotenciesAction(input: { ids: string[] }): Promise<{ success: boolean; error?: string; deleted?: number }> {
  try {
    const { tenantId } = await resolveCanonicalAdminTenant();
    const ids = (input.ids || []).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
    if (ids.length === 0) return { success: false, error: 'Nenhuma potência selecionada.' };
    const { error, count } = await db().from('masonic_potencies').delete({ count: 'exact' }).eq('tenant_id', tenantId).in('id', ids);
    if (error) return { success: false, error: error.message };
    afterChange();
    return { success: true, deleted: count || 0 };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao excluir.' };
  }
}
