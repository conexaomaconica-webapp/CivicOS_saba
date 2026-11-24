'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { getAccountAdminClient } from '@/lib/auth/account-temp-password-admin';
import { sanitizeAccountSearchTerm } from '@/lib/admin/accounts-search';
import type {
  AdminConnectionFilters,
  AdminConnectionList,
  AdminConnectionListItem,
  AdminConnectionStatus,
  AdminConnectionType,
} from '@/types/admin-connections';

/**
 * Gestão de TODAS as conexões do Mural (somente master e admin): corrigir texto, remover do mural (reversível),
 * restaurar e excluir definitivamente. NÃO altera o fluxo de registro, confirmação ou moderação do Mural.
 *
 * Segurança: papel conferido no banco; tudo restrito ao tenant do administrador; toda alteração gera registro em admin_audit_logs.
 */

const MANAGER_ROLES = new Set(['master', 'superadmin', 'platform_admin', 'admin']);
const PAGE_SIZE = 20;
const MAX_SEARCH_IDS = 100;
const TYPES: readonly AdminConnectionType[] = ['compra', 'servico', 'parceria', 'visita'];
const STATUSES: readonly AdminConnectionStatus[] = ['pendente', 'confirmada', 'recusada', 'removida'];
const ITEM_MAX = 160;
const MESSAGE_MAX = 400;
const NOTE_MAX = 300;

type ActionError = { success: false; error: string };
type Actor = { id: string; tenantId: string; admin: SupabaseClient };

async function requireManager(): Promise<Actor> {
  const { user, tenantId } = await resolveCanonicalAdminTenant();
  const admin = getAccountAdminClient() as SupabaseClient | null;
  if (!admin) throw new Error('Configuração segura do Supabase indisponível no servidor.');
  const profile = await getProfileAuthorization(admin as never, user.id);
  const role = (profile?.role || '').trim().toLowerCase();
  if (!MANAGER_ROLES.has(role)) throw new Error('FORBIDDEN: Esta área é restrita a master e admin.');
  if (!tenantId) throw new Error('Tenant não resolvido para este domínio.');
  return { id: user.id, tenantId, admin };
}

function fail(error: unknown, fallback: string): ActionError {
  const raw = error instanceof Error ? error.message : '';
  const clean = raw.replace(/^[A-Z_]{3,}:\s*/, '').trim();
  return { success: false, error: clean && clean.length < 220 ? clean : fallback };
}

async function audit(actor: Actor, connectionId: string, action: string, value: Record<string, unknown>, reason?: string | null) {
  try {
    await actor.admin.from('admin_audit_logs').insert({
      tenant_id: actor.tenantId,
      actor_id: actor.id,
      entity_type: 'business_connection',
      entity_id: connectionId,
      action,
      after_value: value,
      reason: reason ?? null,
    });
  } catch {
    // A auditoria não bloqueia a ação.
  }
}

function refresh() {
  revalidatePath('/admin/conexoes/todas');
  revalidatePath('/admin/conexoes');
  revalidatePath('/conexoes');
}

async function loadConnection(actor: Actor, id: string) {
  if (!id || typeof id !== 'string') throw new Error('Conexão inválida.');
  const { data } = await actor.admin
    .from('business_connections')
    .select('id, business_id, member_user_id, connection_type, item_description, message, status, confirmed_at, created_at')
    .eq('id', id)
    .eq('tenant_id', actor.tenantId)
    .maybeSingle();
  if (!data) throw new Error('Conexão não encontrada.');
  return data as {
    id: string; business_id: string; member_user_id: string; connection_type: string;
    item_description: string | null; message: string | null; status: AdminConnectionStatus; confirmed_at: string | null; created_at: string;
  };
}

function cleanText(value: unknown, max: number, label: string): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (!text) return null;
  if (text.length > max) throw new Error(`${label} deve ter no máximo ${max} caracteres.`);
  return text;
}

// ---------------------------------------------------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------------------------------------------------

export async function listAdminConnectionsAction(filters: AdminConnectionFilters = {}): Promise<AdminConnectionList | ActionError> {
  try {
    const actor = await requireManager();
    const page = Math.max(1, Math.floor(Number(filters.page) || 1));
    const from = (page - 1) * PAGE_SIZE;

    let query = actor.admin
      .from('business_connections')
      .select(
        'id, business_id, member_user_id, connection_type, item_description, message, photo_url, status, confirmed_at, created_at, share_on_mural, businesses(id, name, slug, is_active, publication_status)',
        { count: 'exact' },
      )
      .eq('tenant_id', actor.tenantId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (filters.status && (STATUSES as readonly string[]).includes(filters.status)) query = query.eq('status', filters.status);
    if (filters.type && (TYPES as readonly string[]).includes(filters.type)) query = query.eq('connection_type', filters.type);

    const term = sanitizeAccountSearchTerm(filters.search);
    if (term) {
      const [{ data: bizRows }, { data: profRows }] = await Promise.all([
        actor.admin.from('businesses').select('id').eq('tenant_id', actor.tenantId).ilike('name', `%${term}%`).limit(MAX_SEARCH_IDS),
        actor.admin.from('profiles').select('id').or(`name.ilike.%${term}%,email.ilike.%${term}%`).limit(MAX_SEARCH_IDS),
      ]);
      const parts: string[] = [`item_description.ilike.%${term}%`];
      const bizIds = (bizRows ?? []).map((r: { id: string }) => r.id);
      const memberIds = (profRows ?? []).map((r: { id: string }) => r.id);
      if (bizIds.length) parts.push(`business_id.in.(${bizIds.join(',')})`);
      if (memberIds.length) parts.push(`member_user_id.in.(${memberIds.join(',')})`);
      query = query.or(parts.join(','));
    }

    const { data, error, count } = await query;
    if (error) throw error;
    const rows = (data ?? []) as any[];

    const memberIds = Array.from(new Set(rows.map((r) => r.member_user_id).filter(Boolean)));
    const members = new Map<string, { name: string | null; email: string | null }>();
    if (memberIds.length) {
      const { data: profiles } = await actor.admin.from('profiles').select('id, name, email').in('id', memberIds);
      for (const p of (profiles ?? []) as any[]) members.set(String(p.id), { name: p.name ?? null, email: p.email ?? null });
    }

    const items: AdminConnectionListItem[] = rows.map((r) => {
      const biz = Array.isArray(r.businesses) ? r.businesses[0] : r.businesses;
      return {
        id: String(r.id),
        status: r.status,
        connectionType: r.connection_type,
        itemDescription: r.item_description ?? null,
        message: r.message ?? null,
        hasPhoto: Boolean(r.photo_url),
        shareOnMural: r.share_on_mural !== false,
        createdAt: r.created_at,
        confirmedAt: r.confirmed_at ?? null,
        business: {
          id: String(r.business_id),
          name: biz?.name ?? 'Empresa removida',
          slug: biz?.slug ?? null,
          active: biz ? biz.is_active !== false : false,
          published: biz ? biz.publication_status === 'published' : false,
        },
        member: { id: String(r.member_user_id), name: members.get(String(r.member_user_id))?.name ?? null, email: members.get(String(r.member_user_id))?.email ?? null },
      };
    });

    const total = count ?? items.length;
    return { success: true, items, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
  } catch (error) {
    return fail(error, 'Não foi possível carregar as conexões.');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------------------------------------------------

export async function updateAdminConnectionAction(
  id: string,
  input: { connectionType?: string; itemDescription?: string | null; message?: string | null },
): Promise<{ success: true } | ActionError> {
  try {
    const actor = await requireManager();
    const current = await loadConnection(actor, id);

    const patch: Record<string, unknown> = {};
    if (input.connectionType !== undefined) {
      if (!(TYPES as readonly string[]).includes(input.connectionType)) throw new Error('Tipo de conexão inválido.');
      patch.connection_type = input.connectionType;
    }
    if (input.itemDescription !== undefined) patch.item_description = cleanText(input.itemDescription, ITEM_MAX, 'O produto ou serviço');
    if (input.message !== undefined) patch.message = cleanText(input.message, MESSAGE_MAX, 'O comentário');
    if (Object.keys(patch).length === 0) throw new Error('Nada para alterar.');

    const { error } = await actor.admin
      .from('business_connections')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .eq('tenant_id', actor.tenantId);
    if (error) throw new Error('Não foi possível salvar a alteração.');

    const before: Record<string, unknown> = {};
    if ('connection_type' in patch) before.connection_type = current.connection_type;
    if ('item_description' in patch) before.item_description = current.item_description;
    if ('message' in patch) before.message = current.message;
    await audit(actor, current.id, 'CONNECTION_EDITED', { fields: Object.keys(patch), before, after: patch });
    refresh();
    return { success: true };
  } catch (error) {
    return fail(error, 'Não foi possível editar a conexão.');
  }
}

/** Remove do mural (some para o público e dos números; a foto é retirada), restaura uma conexão confirmada ou aprova/publica uma pendente. */
export async function setAdminConnectionStatusAction(
  id: string,
  action: 'remover' | 'restaurar' | 'aprovar',
  note?: string | null,
): Promise<{ success: true; status: AdminConnectionStatus } | ActionError> {
  try {
    const actor = await requireManager();
    const current = await loadConnection(actor, id);
    const cleanNote = cleanText(note, NOTE_MAX, 'A observação');
    const now = new Date().toISOString();

    if (action === 'remover') {
      if (current.status === 'removida') throw new Error('Esta conexão já está removida.');
      const { error } = await actor.admin
        .from('business_connections')
        .update({ status: 'removida', photo_url: null, moderation_note: cleanNote, photo_moderated_by: actor.id, photo_moderated_at: now, updated_at: now })
        .eq('id', current.id)
        .eq('tenant_id', actor.tenantId);
      if (error) throw new Error('Não foi possível remover a conexão.');
      await actor.admin.from('connection_reports').update({ status: 'resolvida' }).eq('connection_id', current.id).eq('status', 'aberta');
      await audit(actor, current.id, 'CONNECTION_REMOVED', { from: current.status, to: 'removida' }, cleanNote);
      refresh();
      return { success: true, status: 'removida' };
    }

    if (action === 'restaurar') {
      if (current.status !== 'removida') throw new Error('Só é possível restaurar uma conexão removida.');
      if (!current.confirmed_at) throw new Error('Esta conexão nunca foi confirmada pela empresa e não pode ser restaurada.');
      const { error } = await actor.admin
        .from('business_connections')
        .update({ status: 'confirmada', updated_at: now })
        .eq('id', current.id)
        .eq('tenant_id', actor.tenantId);
      if (error) throw new Error('Não foi possível restaurar a conexão.');
      await audit(actor, current.id, 'CONNECTION_RESTORED', { from: 'removida', to: 'confirmada' }, cleanNote);
      refresh();
      return { success: true, status: 'confirmada' };
    }

    if (action === 'aprovar') {
      if (current.status === 'confirmada') throw new Error('Esta conexão já está confirmada.');
      if (current.status === 'removida') throw new Error('Esta conexão foi removida; use "Restaurar" para republicar.');
      const confirmedAt = current.confirmed_at ?? now;
      const { error } = await actor.admin
        .from('business_connections')
        .update({ status: 'confirmada', confirmed_at: confirmedAt, share_on_mural: true, updated_at: now })
        .eq('id', current.id)
        .eq('tenant_id', actor.tenantId);
      if (error) throw new Error('Não foi possível autorizar e publicar a conexão.');
      await audit(actor, current.id, 'CONNECTION_APPROVED_BY_ADMIN', { from: current.status, to: 'confirmada', share_on_mural: true }, cleanNote);
      refresh();
      return { success: true, status: 'confirmada' };
    }

    throw new Error('Ação inválida.');
  } catch (error) {
    return fail(error, 'Não foi possível alterar a conexão.');
  }
}

/** Exclusão DEFINITIVA (não dá para desfazer). O registro da exclusão fica na auditoria, sem foto nem comentário. */
export async function deleteAdminConnectionAction(id: string): Promise<{ success: true } | ActionError> {
  try {
    const actor = await requireManager();
    const current = await loadConnection(actor, id);
    const { error } = await actor.admin.from('business_connections').delete().eq('id', current.id).eq('tenant_id', actor.tenantId);
    if (error) throw new Error('Não foi possível excluir a conexão.');
    await audit(actor, current.id, 'CONNECTION_DELETED', {
      business_id: current.business_id,
      member_user_id: current.member_user_id,
      connection_type: current.connection_type,
      status: current.status,
      created_at: current.created_at,
    });
    refresh();
    return { success: true };
  } catch (error) {
    return fail(error, 'Não foi possível excluir a conexão.');
  }
}

/** Remove do mural TODAS as conexões ativas (pendentes e confirmadas) de uma empresa, por exemplo quando ela deixou de fazer parte. */
export async function removeBusinessConnectionsAction(businessId: string, note?: string | null): Promise<{ success: true; removed: number } | ActionError> {
  try {
    const actor = await requireManager();
    if (!businessId || typeof businessId !== 'string') throw new Error('Empresa inválida.');
    const cleanNote = cleanText(note, NOTE_MAX, 'A observação');
    const now = new Date().toISOString();

    const { data, error } = await actor.admin
      .from('business_connections')
      .update({ status: 'removida', photo_url: null, moderation_note: cleanNote, photo_moderated_by: actor.id, photo_moderated_at: now, updated_at: now })
      .eq('tenant_id', actor.tenantId)
      .eq('business_id', businessId)
      .in('status', ['pendente', 'confirmada'])
      .select('id');
    if (error) throw new Error('Não foi possível remover as conexões desta empresa.');

    const ids = ((data ?? []) as Array<{ id: string }>).map((r) => r.id);
    if (ids.length) await actor.admin.from('connection_reports').update({ status: 'resolvida' }).in('connection_id', ids).eq('status', 'aberta');
    await audit(actor, businessId, 'BUSINESS_CONNECTIONS_REMOVED', { business_id: businessId, removed: ids.length }, cleanNote);
    refresh();
    return { success: true, removed: ids.length };
  } catch (error) {
    return fail(error, 'Não foi possível remover as conexões da empresa.');
  }
}
