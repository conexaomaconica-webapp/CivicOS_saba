'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { validateEmail, validateName, validatePassword } from '@/lib/auth/validation';
import type { Database } from '@/types/database.types';
import { createServerSideClient } from '@/lib/supabase/server';
import {
  ROLE_PRESET_MODULES,
  type AdminUserListItem,
  type CreateAdminUserInput,
  type UpdateAdminUserPermissionsInput,
} from '@/types/admin-users';

const MANAGEABLE_ADMIN_ROLES = new Set([
  'master', 'superadmin', 'platform_admin', 'admin', 'socio_admin', 'finance', 'moderator', 'editor',
]);
const PROTECTED_MASTER_ROLES = new Set(['master', 'superadmin', 'platform_admin']);

async function getSettingsActor() {
  const sessionClient = await createServerSideClient();
  const { data: authData } = await sessionClient.auth.getUser();
  if (!authData.user) throw new Error('UNAUTHORIZED: Sessão expirada.');
  const adminClient = getAdminClient();
  const { data: profile, error } = await adminClient.from('profiles').select('role').eq('id', authData.user.id).maybeSingle();
  if (error || !profile) throw error || new Error('Perfil do usuário não encontrado.');
  return { user: authData.user, role: (profile.role || 'member').toLowerCase(), adminClient };
}

function canManageTarget(actorRole: string, targetRole: string) {
  if (PROTECTED_MASTER_ROLES.has(actorRole)) return true;
  return actorRole === 'admin' && !PROTECTED_MASTER_ROLES.has(targetRole);
}

function adminUserErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    const message = error.message;
    if (/profiles_role_check|check constraint/i.test(message)) {
      return 'O banco ainda não aceita este perfil administrativo. Aplique a migration 140_restore_admin_profile_roles.sql.';
    }
    return message;
  }
  return fallback;
}

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error('Configuração segura do Supabase indisponível no servidor.');
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Lista todos os usuários administrativos e operadores da plataforma.
 */
export async function listAdminUsersAction(): Promise<{
  success: boolean;
  users?: AdminUserListItem[];
  actorRole?: string;
  currentUserId?: string;
  error?: string;
}> {
  try {
    const { user: actor, role: actorRole, adminClient } = await getSettingsActor();

    // 1. Busca perfis
    const { data: profiles, error: profErr } = await adminClient
      .from('profiles')
      .select('id, name, email, role, status, tenant_id, created_at')
      .order('created_at', { ascending: false });

    if (profErr) throw profErr;

    // 2. Busca lista de usuários no Auth para cruzar user_metadata (allowed_modules)
    const { data: authData } = await adminClient.auth.admin.listUsers({ perPage: 100 });
    const authMap = new Map((authData?.users || []).map((u) => [u.id, u]));

    // Filtra perfis administrativos/operacionais e membros de equipe (excluindo anunciantes comuns)
    const adminRoles = ['master', 'admin', 'superadmin', 'socio_admin', 'finance', 'moderator', 'editor', 'platform_admin'];

    const visibleProfiles = PROTECTED_MASTER_ROLES.has(actorRole)
      ? (profiles || [])
      : actorRole === 'admin'
        ? (profiles || []).filter((profile) => !PROTECTED_MASTER_ROLES.has((profile.role || '').toLowerCase()))
        : (profiles || []).filter((profile) => profile.id === actor.id);

    const users: AdminUserListItem[] = visibleProfiles
      .filter((p) => adminRoles.includes((p.role || '').toLowerCase()) || authMap.get(p.id)?.user_metadata?.allowed_modules)
      .map((p) => {
        const authUser = authMap.get(p.id);
        const metaModules = authUser?.user_metadata?.allowed_modules;
        const presetModules = ROLE_PRESET_MODULES[p.role?.toLowerCase() || ''] || ['dashboard'];
        const allowed_modules: string[] = Array.isArray(metaModules) && metaModules.length > 0
          ? metaModules
          : presetModules;

        return {
          id: p.id,
          name: p.name || authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || 'Sem nome',
          email: p.email || authUser?.email || '',
          role: p.role || 'editor',
          status: p.status || 'active',
          tenant_id: p.tenant_id || '',
          allowed_modules,
          created_at: p.created_at || new Date().toISOString(),
        };
      });

    return { success: true, users, actorRole, currentUserId: actor.id };
  } catch (err: unknown) {
    console.error('Erro ao listar usuários administrativos:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao listar usuários.' };
  }
}

/**
 * Cria um novo usuário na plataforma com suas permissões de módulos.
 */
export async function createAdminUserAction(
  input: CreateAdminUserInput
): Promise<{ success: boolean; userId?: string; error?: string }> {
  try {
    const { user: currentAdmin, role: actorRole, adminClient } = await getSettingsActor();
    if (!(PROTECTED_MASTER_ROLES.has(actorRole) || actorRole === 'admin')) {
      return { success: false, error: 'Você não pode criar usuários.' };
    }

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const role = input.role.trim().toLowerCase();
    if (!MANAGEABLE_ADMIN_ROLES.has(role)) {
      return { success: false, error: 'Perfil administrativo inválido.' };
    }
    if (actorRole === 'admin' && PROTECTED_MASTER_ROLES.has(role)) {
      return { success: false, error: 'Administrador geral não pode criar um usuário master.' };
    }
    const allowedModules = input.allowedModules && input.allowedModules.length > 0
      ? input.allowedModules
      : (ROLE_PRESET_MODULES[role] || ['dashboard']);

    const validationError = validateName(name) ?? validateEmail(email) ?? validatePassword(password);
    if (validationError) return { success: false, error: validationError };

    // Resolve tenant do admin atual
    const { data: currentProfile } = await adminClient
      .from('profiles')
      .select('tenant_id')
      .eq('id', currentAdmin.id)
      .maybeSingle();

    const tenantId = currentProfile?.tenant_id || '00000000-0000-0000-0000-000000000010';

    // Cria o usuário no Supabase Auth
    const { data: createdAuth, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        full_name: name,
        role,
        tenant_id: tenantId,
        allowed_modules: allowedModules,
        created_by: currentAdmin.id,
      },
    });

    if (authError || !createdAuth?.user) {
      return { success: false, error: authError?.message || 'Falha ao criar usuário no sistema.' };
    }

    const newUserId = createdAuth.user.id;

    // Atualiza ou insere o profile correspondente
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: newUserId,
      name,
      email,
      role,
      status: 'active',
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(`Falha ao definir o perfil administrativo: ${profileError.message}`);
    }

    revalidatePath('/admin/settings');
    return { success: true, userId: newUserId };
  } catch (err: unknown) {
    console.error('Erro ao criar usuário:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao criar usuário.' };
  }
}

/**
 * Atualiza o papel e as permissões de módulos de um usuário.
 */
export async function updateAdminUserPermissionsAction(
  input: UpdateAdminUserPermissionsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: actor, role: actorRole, adminClient } = await getSettingsActor();

    const { userId, name, allowedModules, status } = input;
    const role = input.role.trim().toLowerCase();
    if (!userId) return { success: false, error: 'Identificador do usuário ausente.' };
    if (!MANAGEABLE_ADMIN_ROLES.has(role)) return { success: false, error: 'Perfil administrativo inválido.' };

    const { data: originalProfile, error: lookupError } = await adminClient
      .from('profiles')
      .select('name, role, status')
      .eq('id', userId)
      .maybeSingle();
    if (lookupError || !originalProfile) throw lookupError || new Error('Perfil do usuário não encontrado.');
    const targetRole = (originalProfile.role || 'member').toLowerCase();
    if (!canManageTarget(actorRole, targetRole)) {
      if (actor.id !== userId) return { success: false, error: 'Você não pode editar este usuário.' };
      if (role !== targetRole) return { success: false, error: 'Você não pode alterar o próprio perfil de acesso.' };
    }
    if (actorRole === 'admin' && PROTECTED_MASTER_ROLES.has(role)) {
      return { success: false, error: 'Administrador geral não pode atribuir papel master.' };
    }
    if (PROTECTED_MASTER_ROLES.has(targetRole) && !PROTECTED_MASTER_ROLES.has(role)) {
      const { count } = await adminClient
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', [...PROTECTED_MASTER_ROLES]);
      if ((count || 0) <= 1) return { success: false, error: 'O último usuário master não pode perder esse papel.' };
    }

    const updatePayload: Record<string, any> = {
      name,
      role,
      updated_at: new Date().toISOString(),
    };
    if (status) updatePayload.status = status;

    const { error: profErr } = await adminClient
      .from('profiles')
      .update(updatePayload)
      .eq('id', userId);

    if (profErr) throw profErr;

    const { error: authError } = await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: { name, full_name: name, role, allowed_modules: allowedModules },
    });
    if (authError) {
      await adminClient.from('profiles').update({
        name: originalProfile.name,
        role: originalProfile.role,
        status: originalProfile.status,
        updated_at: new Date().toISOString(),
      }).eq('id', userId);
      throw authError;
    }

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err: unknown) {
    console.error('Erro ao atualizar permissões do usuário:', err);
    return { success: false, error: adminUserErrorMessage(err, 'Erro ao atualizar permissões.') };
  }
}

/**
 * Altera status do usuário (ativo / inativo).
 */
export async function toggleAdminUserStatusAction(
  userId: string,
  newStatus: 'active' | 'suspended'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: actor, role: actorRole, adminClient } = await getSettingsActor();
    if (userId === actor.id) return { success: false, error: 'Você não pode alterar o status da própria conta.' };
    const { data: target } = await adminClient.from('profiles').select('role').eq('id', userId).maybeSingle();
    if (!target || !canManageTarget(actorRole, (target.role || 'member').toLowerCase())) {
      return { success: false, error: 'Você não pode alterar o status deste usuário.' };
    }

    const { error } = await adminClient
      .from('profiles')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (error) throw error;

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao alterar status.' };
  }
}

export async function deleteAdminUserAction(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { user: currentAdmin, role: actorRole, adminClient } = await getSettingsActor();
    if (!userId) return { success: false, error: 'Identificador do usuário ausente.' };
    if (userId === currentAdmin.id) return { success: false, error: 'Você não pode excluir a própria conta.' };

    const { data: target, error: lookupError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!target) return { success: false, error: 'Usuário não encontrado.' };
    if (!canManageTarget(actorRole, (target.role || 'member').toLowerCase())) {
      return { success: false, error: 'Você não pode excluir este usuário.' };
    }

    const { error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;
    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err: unknown) {
    console.error('Erro ao excluir usuário:', err);
    return { success: false, error: adminUserErrorMessage(err, 'Erro ao excluir usuário.') };
  }
}
