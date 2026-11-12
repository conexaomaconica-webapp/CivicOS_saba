'use server';

import { revalidatePath } from 'next/cache';
import { COMMERCIAL_PERMISSIONS, type CommercialPermission } from './access-rules';
import { tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';
import { isValidEmail, normalizeEmail } from './commercial-utils';

export type AccessGrantItem = {
  id: string;
  user_id: string;
  email: string | null;
  permission: CommercialPermission;
  status: 'active' | 'revoked';
  expires_at: string | null;
  granted_at: string;
  note: string | null;
};

export async function listAccessGrantsAction(): Promise<ActionResult<AccessGrantItem[]>> {
  const auth = await tryCommercialPermission('settings.manage');
  if (!auth.ok) return fail(auth.error);

  const { data, error } = await (auth.supabase as any)
    .from('commercial_access_grants')
    .select('id, user_id, permission, status, expires_at, granted_at, note')
    .eq('tenant_id', auth.tenantId)
    .order('granted_at', { ascending: false })
    .limit(500);
  if (error) return fail('Não foi possível listar as permissões.');

  const rows = (data ?? []) as Array<Omit<AccessGrantItem, 'email'>>;
  const emails = new Map<string, string | null>();
  try {
    const writer = requireWriter();
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    if (ids.length > 0) {
      const { data: profiles } = await writer.from('profiles').select('id, email').in('id', ids);
      for (const p of profiles ?? []) emails.set(p.id as string, (p.email as string) ?? null);
    }
  } catch {
    /* e-mails são apenas informativos */
  }
  return { success: true, data: rows.map((r) => ({ ...r, email: emails.get(r.user_id) ?? null })) };
}

export async function grantAccessAction(input: {
  email: string;
  permission: string;
  expiresAt?: string;
  note?: string;
}): Promise<ActionResult> {
  const auth = await tryCommercialPermission('settings.manage');
  if (!auth.ok) return fail(auth.error);

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) return fail('Informe um e-mail válido.');
  if (!(COMMERCIAL_PERMISSIONS as readonly string[]).includes(input.permission)) return fail('Permissão inválida.');

  let expiresAt: string | null = null;
  if (input.expiresAt) {
    const d = new Date(input.expiresAt);
    if (Number.isNaN(d.getTime()) || d.getTime() <= Date.now()) return fail('A data de expiração deve estar no futuro.');
    expiresAt = d.toISOString();
  }

  try {
    const writer = requireWriter();
    const { data: profile } = await writer.from('profiles').select('id').eq('tenant_id', auth.tenantId).ilike('email', email).maybeSingle();
    if (!profile) return fail('Nenhum usuário cadastrado com este e-mail neste ambiente.');

    const { data, error } = await writer
      .from('commercial_access_grants')
      .insert({
        tenant_id: auth.tenantId,
        user_id: profile.id,
        permission: input.permission,
        granted_by: auth.user.id,
        expires_at: expiresAt,
        note: input.note?.trim() || null,
      })
      .select('id')
      .single();
    if (error) {
      return fail(/uq_commercial_access_grants_active/.test(error.message) ? 'Este usuário já possui esta permissão ativa.' : 'Não foi possível conceder a permissão.');
    }

    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_access_grant',
      entityId: data.id,
      action: 'COMMERCIAL_ACCESS_GRANTED',
      after: { user_id: profile.id, permission: input.permission, expires_at: expiresAt },
    });
    revalidatePath('/comercial/acessos');
    return { success: true };
  } catch {
    return fail('Erro ao conceder a permissão.');
  }
}

export async function revokeAccessAction(grantId: string): Promise<ActionResult> {
  const auth = await tryCommercialPermission('settings.manage');
  if (!auth.ok) return fail(auth.error);

  try {
    const writer = requireWriter();
    const { data: grant } = await writer
      .from('commercial_access_grants')
      .select('id, user_id, permission, status')
      .eq('id', grantId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!grant || grant.status !== 'active') return fail('Permissão não encontrada ou já revogada.');

    const { error } = await writer
      .from('commercial_access_grants')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: auth.user.id })
      .eq('id', grantId)
      .eq('tenant_id', auth.tenantId);
    if (error) return fail('Não foi possível revogar a permissão.');

    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_access_grant',
      entityId: grant.id,
      action: 'COMMERCIAL_ACCESS_REVOKED',
      before: { user_id: grant.user_id, permission: grant.permission },
    });
    revalidatePath('/comercial/acessos');
    return { success: true };
  } catch {
    return fail('Erro ao revogar a permissão.');
  }
}
