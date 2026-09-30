'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { assertPlatformAdminAccess } from './admin-auth-helper';
import { validateEmail, validateName, validatePassword } from '@/lib/auth/validation';
import type { Database } from '@/types/database.types';
import {
  ROLE_PRESET_MODULES,
  type AdminUserListItem,
  type CreateAdminUserInput,
  type UpdateAdminUserPermissionsInput,
} from '@/types/admin-users';

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
  error?: string;
}> {
  try {
    await assertPlatformAdminAccess();
    const adminClient = getAdminClient();

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

    const users: AdminUserListItem[] = (profiles || [])
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

    return { success: true, users };
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
    const { user: currentAdmin } = await assertPlatformAdminAccess();
    const adminClient = getAdminClient();

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const password = input.password;
    const role = input.role.trim().toLowerCase();
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
    await adminClient.from('profiles').upsert({
      id: newUserId,
      name,
      email,
      role,
      status: 'active',
      tenant_id: tenantId,
      updated_at: new Date().toISOString(),
    });

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
    await assertPlatformAdminAccess();
    const adminClient = getAdminClient();

    const { userId, name, role, allowedModules, status } = input;
    if (!userId) return { success: false, error: 'Identificador do usuário ausente.' };

    // Atualiza metadados no Auth
    await adminClient.auth.admin.updateUserById(userId, {
      user_metadata: {
        name,
        full_name: name,
        role,
        allowed_modules: allowedModules,
      },
    });

    // Atualiza perfil na tabela profiles
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

    revalidatePath('/admin/settings');
    return { success: true };
  } catch (err: unknown) {
    console.error('Erro ao atualizar permissões do usuário:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao atualizar permissões.' };
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
    await assertPlatformAdminAccess();
    const adminClient = getAdminClient();

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
