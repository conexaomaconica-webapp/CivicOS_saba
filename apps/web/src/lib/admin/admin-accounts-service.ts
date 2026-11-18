'use server';

import { revalidatePath } from 'next/cache';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import { getAccountAdminClient } from '@/lib/auth/account-temp-password-admin';
import { accountTempPasswordPending, getAccountTempPasswordState, ACCOUNT_TEMP_PASSWORD_DEFAULT_HOURS } from '@/lib/auth/account-temp-password';
import { generateTempPassword, getTempPasswordState } from '@/lib/commercial/temp-password';
import { validateName } from '@/lib/auth/validation';
import { validatePhone } from '@/lib/onboarding/onboarding-validation';
import { sanitizeAccountSearchTerm } from '@/lib/admin/accounts-search';
import { sendPasswordRecoveryEmail } from '@/lib/auth/password-recovery-email';
import type { AccountBusinessLink, AccountListItem, AccountMissingProfile } from '@/types/admin-accounts';

/**
 * Contas de anunciantes e membros (somente master e admin).
 *
 * Regras de segurança:
 *  - quem chama precisa ser master/admin pelo perfil NO BANCO (nunca por dado enviado pelo navegador);
 *  - só se gerenciam contas com perfil `member` ou `anunciante`: contas administrativas ficam fora desta tela;
 *  - ninguém altera a própria conta por aqui;
 *  - senhas NUNCA são gravadas em log nem em auditoria (a temporária é devolvida uma única vez a quem a definiu);
 *  - toda ação gera registro em admin_audit_logs.
 */

const MANAGER_ROLES = new Set(['master', 'superadmin', 'platform_admin', 'admin']);
const MANAGEABLE_TARGET_ROLES = ['member', 'anunciante'];
const ACCOUNTS_PAGE_SIZE = 20;
const MAX_SEARCH_IDS = 100;
const BAN_FOREVER = '876000h'; // ~100 anos: bloqueio até um administrador reativar.

type ActionError = { success: false; error: string };

type Actor = { id: string; role: string; tenantId: string; admin: SupabaseClient };

async function requireAccountsManager(): Promise<Actor> {
  const { user, tenantId } = await resolveCanonicalAdminTenant();
  const admin = getAccountAdminClient() as SupabaseClient | null;
  if (!admin) throw new Error('Configuração segura do Supabase indisponível no servidor.');
  const profile = await getProfileAuthorization(admin as never, user.id);
  const role = (profile?.role || '').trim().toLowerCase();
  if (!MANAGER_ROLES.has(role)) throw new Error('FORBIDDEN: Esta área é restrita a master e admin.');
  if (!tenantId) throw new Error('Tenant não resolvido para este domínio.');
  return { id: user.id, role, tenantId, admin };
}

function fail(error: unknown, fallback: string): ActionError {
  const raw = error instanceof Error ? error.message : '';
  const clean = raw.replace(/^[A-Z_]{3,}:\s*/, '').trim();
  return { success: false, error: clean && clean.length < 220 ? clean : fallback };
}

async function audit(actor: Actor, targetId: string, action: string, afterValue: Record<string, unknown>, reason?: string | null) {
  try {
    await actor.admin.from('admin_audit_logs').insert({
      tenant_id: actor.tenantId,
      actor_id: actor.id,
      entity_type: 'user_account',
      entity_id: targetId,
      action,
      after_value: afterValue,
      reason: reason ?? null,
    });
  } catch {
    // A auditoria não bloqueia a ação, mas nunca recebe senha nem dados sensíveis.
  }
}

/** Valida o alvo: existe, não é o próprio administrador e tem perfil member/anunciante. */
async function loadManageableTarget(actor: Actor, userId: string) {
  if (!userId || typeof userId !== 'string') throw new Error('Conta inválida.');
  if (userId === actor.id) throw new Error('Você não pode alterar a própria conta por esta tela.');

  const { data: profile } = await actor.admin.from('profiles').select('id, name, email, phone, role').eq('id', userId).maybeSingle();
  if (!profile) throw new Error('Conta não encontrada.');
  const role = String(profile.role || 'member').toLowerCase();
  if (!MANAGEABLE_TARGET_ROLES.includes(role)) throw new Error('Contas administrativas não podem ser gerenciadas por esta tela.');

  const { data: authData } = await actor.admin.auth.admin.getUserById(userId);
  const authUser = authData?.user;
  if (!authUser) throw new Error('Conta de acesso não encontrada.');
  return { profile, authUser };
}

async function isCommercialRepresentative(actor: Actor, userId: string): Promise<boolean> {
  try {
    const { data } = await actor.admin.from('commercial_representatives').select('id').eq('user_id', userId).limit(1).maybeSingle();
    return Boolean(data);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Listagem
// ---------------------------------------------------------------------------------------------------------------------

export async function listAccountsAction(input?: { query?: string; page?: number }): Promise<
  { success: true; items: AccountListItem[]; total: number; page: number; pageSize: number; totalPages: number } | ActionError
> {
  try {
    const actor = await requireAccountsManager();
    const term = sanitizeAccountSearchTerm(input?.query ?? '');
    const page = Math.max(1, Math.min(500, Math.floor(Number(input?.page) || 1)));
    const admin = actor.admin;

    // Busca: por nome/e-mail (perfil) e por nome da EMPRESA (dono e equipe). Termos curtos demais não buscam.
    let restrictTo: string[] | null = null;
    if (term) {
      const ids = new Set<string>();
      const like = `%${term}%`;
      const [byName, byEmail, byBusiness] = await Promise.all([
        admin.from('profiles').select('id').in('role', MANAGEABLE_TARGET_ROLES).ilike('name', like).limit(MAX_SEARCH_IDS),
        admin.from('profiles').select('id').in('role', MANAGEABLE_TARGET_ROLES).ilike('email', like).limit(MAX_SEARCH_IDS),
        admin.from('businesses').select('id, owner_id').eq('tenant_id', actor.tenantId).ilike('name', like).limit(50),
      ]);
      for (const row of byName.data ?? []) ids.add(String(row.id));
      for (const row of byEmail.data ?? []) ids.add(String(row.id));
      const businessIds = (byBusiness.data ?? []).map((b) => String(b.id));
      for (const b of byBusiness.data ?? []) if (b.owner_id) ids.add(String(b.owner_id));
      if (businessIds.length > 0) {
        const { data: team } = await admin.from('business_members').select('user_id').in('business_id', businessIds).eq('status', 'active').limit(MAX_SEARCH_IDS);
        for (const row of team ?? []) if (row.user_id) ids.add(String(row.user_id));
      }
      restrictTo = Array.from(ids).slice(0, MAX_SEARCH_IDS);
      if (restrictTo.length === 0) return { success: true, items: [], total: 0, page, pageSize: ACCOUNTS_PAGE_SIZE, totalPages: 0 };
    }

    const from = (page - 1) * ACCOUNTS_PAGE_SIZE;
    let query = admin
      .from('profiles')
      .select('id, name, email, phone, role, created_at', { count: 'exact' })
      .in('role', MANAGEABLE_TARGET_ROLES)
      .order('created_at', { ascending: false })
      .range(from, from + ACCOUNTS_PAGE_SIZE - 1);
    if (restrictTo) query = query.in('id', restrictTo);
    const { data: profiles, count, error } = await query;
    if (error) throw error;

    const rows = profiles ?? [];
    const pageIds = rows.map((p) => String(p.id));

    // Vínculos com empresas (dono e equipe ativa), restritos ao tenant do domínio.
    const links = new Map<string, AccountBusinessLink[]>();
    const push = (userId: string, link: AccountBusinessLink) => {
      const list = links.get(userId) ?? [];
      if (!list.some((l) => l.id === link.id && l.relation === link.relation)) list.push(link);
      links.set(userId, list);
    };
    if (pageIds.length > 0) {
      const [{ data: owned }, { data: members }] = await Promise.all([
        admin.from('businesses').select('id, name, slug, owner_id').eq('tenant_id', actor.tenantId).in('owner_id', pageIds),
        admin.from('business_members').select('business_id, user_id, role').eq('tenant_id', actor.tenantId).eq('status', 'active').in('user_id', pageIds),
      ]);
      for (const b of owned ?? []) push(String(b.owner_id), { id: String(b.id), name: String(b.name ?? ''), slug: b.slug ? String(b.slug) : null, relation: 'dono' });
      const memberBusinessIds = Array.from(new Set((members ?? []).map((m) => String(m.business_id))));
      if (memberBusinessIds.length > 0) {
        const { data: memberBusinesses } = await admin.from('businesses').select('id, name, slug').in('id', memberBusinessIds);
        const byId = new Map((memberBusinesses ?? []).map((b) => [String(b.id), b]));
        for (const m of members ?? []) {
          const b = byId.get(String(m.business_id));
          if (b) push(String(m.user_id), { id: String(b.id), name: String(b.name ?? ''), slug: b.slug ? String(b.slug) : null, relation: 'equipe', teamRole: m.role ? String(m.role) : undefined });
        }
      }
    }

    // Dados de acesso (login, último acesso, bloqueio, troca de senha pendente) vêm do Auth.
    const authUsers = await Promise.all(
      pageIds.map(async (id) => {
        try {
          const { data } = await admin.auth.admin.getUserById(id);
          return data?.user ?? null;
        } catch {
          return null;
        }
      }),
    );
    const authById = new Map(authUsers.filter(Boolean).map((u) => [u!.id, u!]));

    const now = Date.now();
    const items: AccountListItem[] = rows.map((p) => {
      const authUser = authById.get(String(p.id));
      // banned_until existe na resposta do Auth, mas não consta no tipo User desta versão do cliente.
      const bannedRaw = (authUser as unknown as { banned_until?: string | null } | undefined)?.banned_until;
      const bannedUntil = bannedRaw ? new Date(bannedRaw).getTime() : 0;
      const accountState = getAccountTempPasswordState(authUser?.app_metadata, now);
      const repState = getTempPasswordState(authUser?.app_metadata, now);
      return {
        id: String(p.id),
        name: String(p.name ?? ''),
        loginEmail: authUser?.email ?? String(p.email ?? ''),
        phone: p.phone ? String(p.phone) : null,
        role: String(p.role ?? 'member'),
        createdAt: String(p.created_at ?? ''),
        lastSignInAt: authUser?.last_sign_in_at ?? null,
        blocked: Number.isFinite(bannedUntil) && bannedUntil > now,
        passwordChange: accountState !== 'none' ? accountState : repState !== 'none' ? repState : 'none',
        passwordChangeKind: accountState !== 'none' ? 'conta' : repState !== 'none' ? 'representante' : null,
        businesses: links.get(String(p.id)) ?? [],
      };
    });

    const total = count ?? items.length;
    return { success: true, items, total, page, pageSize: ACCOUNTS_PAGE_SIZE, totalPages: Math.ceil(total / ACCOUNTS_PAGE_SIZE) };
  } catch (error) {
    return fail(error, 'Não foi possível carregar as contas.');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Ações
// ---------------------------------------------------------------------------------------------------------------------

/** Envia ao e-mail da conta o link de redefinição de senha. O administrador NÃO recebe o link nem vê a senha. */
export async function sendAccountPasswordResetAction(userId: string): Promise<{ success: true; message: string } | ActionError> {
  try {
    const actor = await requireAccountsManager();
    const { authUser } = await loadManageableTarget(actor, userId);
    if (!authUser.email) return { success: false, error: 'A conta não tem e-mail de login.' };

    // E-mail próprio da plataforma (identidade da marca, pela integração de e-mail). O link é validado no servidor em /auth/confirm.
    const sent = await sendPasswordRecoveryEmail(authUser.email);
    if (!sent.ok) {
      return { success: false, error: sent.reason === 'not_configured'
        ? 'O envio de e-mails da plataforma não está configurado. Verifique Admin → Integrações → E-mail.'
        : 'Não foi possível enviar o e-mail agora. Tente novamente em instantes.' };
    }

    await audit(actor, userId, 'ACCOUNT_RESET_EMAIL_SENT', { channel: 'email' });
    return { success: true, message: `E-mail de redefinição enviado para ${authUser.email}.` };
  } catch (error) {
    return fail(error, 'Não foi possível enviar o e-mail de redefinição.');
  }
}

/**
 * Define uma NOVA senha temporária (gerada pelo servidor) com troca obrigatória no próximo acesso e validade de 72 horas.
 * A senha é devolvida UMA ÚNICA vez a quem a definiu, para repassar à pessoa por canal seguro. Nunca é registrada.
 */
export async function setAccountTemporaryPasswordAction(
  userId: string,
): Promise<{ success: true; temporaryPassword: string; expiresAt: string; hours: number } | ActionError> {
  try {
    const actor = await requireAccountsManager();
    const { authUser } = await loadManageableTarget(actor, userId);
    if (await isCommercialRepresentative(actor, userId)) {
      return { success: false, error: 'Conta de representante comercial: a senha temporária é gerenciada no módulo comercial.' };
    }

    const temporaryPassword = generateTempPassword(14);
    const pending = accountTempPasswordPending(ACCOUNT_TEMP_PASSWORD_DEFAULT_HOURS);
    const { error } = await actor.admin.auth.admin.updateUserById(userId, {
      password: temporaryPassword,
      app_metadata: { ...(authUser.app_metadata ?? {}), ...pending },
    });
    if (error) return { success: false, error: 'Não foi possível definir a senha temporária agora.' };

    await audit(actor, userId, 'ACCOUNT_TEMP_PASSWORD_SET', {
      must_change_password: true,
      expires_at: pending.account_temp_password_expires_at,
      hours: ACCOUNT_TEMP_PASSWORD_DEFAULT_HOURS,
    });
    revalidatePath('/admin/contas');
    return { success: true, temporaryPassword, expiresAt: String(pending.account_temp_password_expires_at), hours: ACCOUNT_TEMP_PASSWORD_DEFAULT_HOURS };
  } catch (error) {
    return fail(error, 'Não foi possível definir a senha temporária.');
  }
}

/** Edita nome e telefone da conta. O e-mail de login não é alterado por esta tela. */
export async function updateAccountProfileAction(
  userId: string,
  input: { name: string; phone?: string | null },
): Promise<{ success: true } | ActionError> {
  try {
    const actor = await requireAccountsManager();
    const { profile, authUser } = await loadManageableTarget(actor, userId);

    const name = String(input?.name ?? '').trim();
    const phone = String(input?.phone ?? '').trim();
    const invalid = validateName(name) ?? (phone ? validatePhone(phone) : null);
    if (invalid) return { success: false, error: invalid };

    const changed: string[] = [];
    if (name !== String(profile.name ?? '')) changed.push('name');
    if (phone !== String(profile.phone ?? '')) changed.push('phone');
    if (changed.length === 0) return { success: true };

    const { error } = await actor.admin.from('profiles').update({ name, phone: phone || null }).eq('id', userId);
    if (error) return { success: false, error: 'Não foi possível salvar os dados da conta.' };

    // Mantém o nome também no cadastro de acesso (somente user_metadata de exibição).
    await actor.admin.auth.admin.updateUserById(userId, { user_metadata: { ...(authUser.user_metadata ?? {}), name, full_name: name } });

    await audit(actor, userId, 'ACCOUNT_PROFILE_UPDATED', { fields: changed });
    revalidatePath('/admin/contas');
    return { success: true };
  } catch (error) {
    return fail(error, 'Não foi possível salvar os dados da conta.');
  }
}

/** Bloqueia ou reativa o acesso da conta (bloqueio real no Auth: a pessoa não consegue entrar nem renovar a sessão). */
export async function setAccountBlockedAction(
  userId: string,
  blocked: boolean,
  reason?: string,
): Promise<{ success: true; blocked: boolean } | ActionError> {
  try {
    const actor = await requireAccountsManager();
    await loadManageableTarget(actor, userId);

    const cleanReason = String(reason ?? '').trim().slice(0, 300);
    if (blocked && cleanReason.length < 3) return { success: false, error: 'Informe o motivo do bloqueio (mínimo 3 caracteres).' };

    const { error } = await actor.admin.auth.admin.updateUserById(userId, { ban_duration: blocked ? BAN_FOREVER : 'none' });
    if (error) return { success: false, error: 'Não foi possível alterar o acesso agora.' };

    await audit(actor, userId, blocked ? 'ACCOUNT_BLOCKED' : 'ACCOUNT_UNBLOCKED', { blocked }, blocked ? cleanReason : null);
    revalidatePath('/admin/contas');
    return { success: true, blocked };
  } catch (error) {
    return fail(error, 'Não foi possível alterar o acesso da conta.');
  }
}

// ---------------------------------------------------------------------------------------------------------------------
// Contas sem perfil (cadastros antigos)
// ---------------------------------------------------------------------------------------------------------------------

async function profileIdsPresent(admin: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const present = new Set<string>();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const { data } = await admin.from('profiles').select('id').in('id', chunk);
    for (const row of data ?? []) present.add(String(row.id));
  }
  return present;
}

/**
 * Contas que são DONAS ou EQUIPE de empresas do tenant mas não têm linha em profiles (cadastros antigos). Sem perfil, a conta
 * não aparece na lista principal e não pode ser gerenciada. Só leitura; a correção é feita conta a conta por createMissingProfileAction.
 */
export async function listAccountsMissingProfileAction(): Promise<{ success: true; items: AccountMissingProfile[] } | ActionError> {
  try {
    const actor = await requireAccountsManager();
    const admin = actor.admin;

    const [{ data: owned }, { data: members }] = await Promise.all([
      admin.from('businesses').select('id, name, owner_id').eq('tenant_id', actor.tenantId).not('owner_id', 'is', null).limit(3000),
      admin.from('business_members').select('business_id, user_id').eq('tenant_id', actor.tenantId).eq('status', 'active').not('user_id', 'is', null).limit(3000),
    ]);

    const relation = new Map<string, 'dono' | 'equipe'>();
    const companies = new Map<string, Array<{ id: string; name: string }>>();
    const addCompany = (userId: string, c: { id: string; name: string }) => {
      const list = companies.get(userId) ?? [];
      if (!list.some((x) => x.id === c.id)) list.push(c);
      companies.set(userId, list);
    };
    for (const b of owned ?? []) {
      const id = String(b.owner_id);
      relation.set(id, 'dono');
      addCompany(id, { id: String(b.id), name: String(b.name ?? '') });
    }
    const memberBusinessIds = Array.from(new Set((members ?? []).map((m) => String(m.business_id))));
    const nameById = new Map<string, string>();
    for (let i = 0; i < memberBusinessIds.length; i += 100) {
      const { data } = await admin.from('businesses').select('id, name').in('id', memberBusinessIds.slice(i, i + 100));
      for (const b of data ?? []) nameById.set(String(b.id), String(b.name ?? ''));
    }
    for (const m of members ?? []) {
      const id = String(m.user_id);
      if (!relation.has(id)) relation.set(id, 'equipe');
      addCompany(id, { id: String(m.business_id), name: nameById.get(String(m.business_id)) ?? '' });
    }

    const candidates = Array.from(relation.keys());
    const present = await profileIdsPresent(admin, candidates);
    const missing = candidates.filter((id) => !present.has(id));

    const items: AccountMissingProfile[] = [];
    for (const userId of missing.slice(0, 200)) {
      let email = '';
      let name = '';
      try {
        const { data } = await admin.auth.admin.getUserById(userId);
        email = data?.user?.email ?? '';
        const meta = (data?.user?.user_metadata ?? {}) as Record<string, unknown>;
        name = String(meta.full_name ?? meta.name ?? '');
      } catch {
        // conta de acesso inexistente: aparece sem e-mail para o administrador investigar
      }
      items.push({ userId, loginEmail: email, name, relation: relation.get(userId)!, businesses: companies.get(userId) ?? [] });
    }
    return { success: true, items };
  } catch (error) {
    return fail(error, 'Não foi possível verificar as contas sem perfil.');
  }
}

/**
 * Cria o perfil que faltou para UMA conta (mesmo desenho do cadastro: perfil member sem tenant) e, se ela for DONA de empresa do
 * tenant, concede o papel anunciante e o vínculo com o tenant pela função de provisionamento do banco. Só para contas que
 * realmente são dona/equipe de uma empresa do tenant (não cria perfil para qualquer pessoa). Desfaz o perfil se o provisionamento falhar.
 */
export async function createMissingProfileAction(userId: string): Promise<{ success: true; role: string } | ActionError> {
  try {
    const actor = await requireAccountsManager();
    if (!userId || typeof userId !== 'string') return { success: false, error: 'Conta inválida.' };
    if (userId === actor.id) return { success: false, error: 'Você não pode alterar a própria conta por esta tela.' };
    const admin = actor.admin;

    const { data: existing } = await admin.from('profiles').select('id').eq('id', userId).maybeSingle();
    if (existing) return { success: false, error: 'Esta conta já tem perfil.' };

    const [{ data: ownedRows }, { data: memberRows }] = await Promise.all([
      admin.from('businesses').select('id').eq('tenant_id', actor.tenantId).eq('owner_id', userId).limit(1),
      admin.from('business_members').select('id').eq('tenant_id', actor.tenantId).eq('user_id', userId).eq('status', 'active').limit(1),
    ]);
    const isOwner = (ownedRows ?? []).length > 0;
    const isTeam = (memberRows ?? []).length > 0;
    if (!isOwner && !isTeam) return { success: false, error: 'Esta conta não é dona nem equipe de empresa deste tenant.' };

    const { data: authData } = await admin.auth.admin.getUserById(userId);
    const authUser = authData?.user;
    if (!authUser) return { success: false, error: 'Conta de acesso não encontrada.' };
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const name = String(meta.full_name ?? meta.name ?? '').trim().slice(0, 180);

    const { error: insertError } = await admin.from('profiles').insert({ id: userId, name, email: authUser.email ?? null, role: 'member', tenant_id: null });
    if (insertError) return { success: false, error: 'Não foi possível criar o perfil agora.' };

    const role = isOwner ? 'anunciante' : 'member';
    const { error: provisionError } = await admin.rpc('provision_authorized_tenant_membership', {
      p_user_id: userId,
      p_tenant_id: actor.tenantId,
      p_profile_role: role,
      p_membership_role: 'member',
      p_source: 'admin_advertiser_creation',
      p_created_by: actor.id,
    });
    if (provisionError) {
      await admin.from('profiles').delete().eq('id', userId); // não deixa perfil pela metade
      return { success: false, error: 'O perfil foi criado, mas o vínculo com o tenant falhou. Nada foi alterado.' };
    }

    await audit(actor, userId, 'ACCOUNT_PROFILE_CREATED', { role, reason: 'perfil ausente em cadastro antigo' });
    revalidatePath('/admin/contas');
    return { success: true, role };
  } catch (error) {
    return fail(error, 'Não foi possível criar o perfil.');
  }
}
