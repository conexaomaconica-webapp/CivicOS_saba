import { createServerSideClient } from '@/lib/supabase/server';
import { getProfileAuthorization } from '@/lib/member/profile-access-service';
import type { ProfileAuthorizationDTO } from '@saas/core/contracts';
import type { User, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export const GLOBAL_SURVEY_ADMIN_ROLES = new Set(['master', 'superadmin', 'platform_admin']);
export const TENANT_SURVEY_ADMIN_ROLES = new Set(['admin', 'socio_admin']);

export interface SurveyAdminActor {
  supabase: SupabaseClient<Database>;
  user: User;
  profile: ProfileAuthorizationDTO;
  role: string;
  isGlobalAdmin: boolean;
  tenantId: string | null;
}

export interface SurveyResourceRecord {
  id: string;
  tenant_id: string | null;
  title: string;
  slug: string;
  status: string;
  current_version: number;
}

/**
 * Autentica e autoriza o usuário para operações administrativas do módulo de pesquisas.
 *
 * Aplica as diretrizes de segurança canônicas (P0-B):
 * 1. Exige sessão ativa e válida via Supabase Auth (elimina identidades fictícias).
 * 2. Consulta o perfil de forma segura via projeção canônica (sem varredura global).
 * 3. Valida se a conta do usuário está com status ativo.
 * 4. Valida se o papel do usuário possui privilégio administrativo (distinguindo escopo global de tenant).
 * 5. Opera sob o cliente SSR autenticado (respeitando RLS, sem bypass de service_role).
 */
export async function assertSurveyAdminAccess(): Promise<SurveyAdminActor> {
  const supabase = await createServerSideClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authError || !user) {
    throw new Error('UNAUTHORIZED: Sessão inexistente ou expirada.');
  }

  // Consulta canônica do perfil via projeção segura (hardening P0-B)
  const profile = await getProfileAuthorization(supabase as any, user.id);
  if (!profile) {
    throw new Error('UNAUTHORIZED: Perfil de usuário não localizado.');
  }

  if (profile.status !== 'active') {
    throw new Error('FORBIDDEN: Conta de usuário inativa ou suspensa.');
  }

  const role = (profile.role || '').trim().toLowerCase();
  const isGlobalAdmin = GLOBAL_SURVEY_ADMIN_ROLES.has(role);
  const isTenantAdmin = TENANT_SURVEY_ADMIN_ROLES.has(role);

  if (!isGlobalAdmin && !isTenantAdmin) {
    throw new Error('FORBIDDEN: Papel de usuário sem permissão para gerenciar pesquisas.');
  }

  const tenantId = profile.tenant_id ?? null;
  if (!isGlobalAdmin && !tenantId) {
    throw new Error('FORBIDDEN: Administrador sem tenant vinculado.');
  }

  return {
    supabase: supabase as any,
    user,
    profile,
    role,
    isGlobalAdmin,
    tenantId,
  };
}

/**
 * Valida o acesso do administrador a um recurso específico de pesquisa (surveyId).
 * Garante que administradores com escopo de tenant não acessem pesquisas de outro tenant.
 */
export async function assertSurveyResourceAccess(surveyId: string): Promise<{
  actor: SurveyAdminActor;
  survey: SurveyResourceRecord;
}> {
  if (!surveyId || typeof surveyId !== 'string') {
    throw new Error('ID da pesquisa inválido.');
  }

  const actor = await assertSurveyAdminAccess();
  const { supabase, isGlobalAdmin, tenantId } = actor;

  // Busca a pesquisa verificando existência e tenant sob o contexto autenticado
  const { data: survey, error } = await (supabase as any)
    .from('surveys')
    .select('id, tenant_id, title, slug, status, current_version')
    .eq('id', surveyId)
    .maybeSingle();

  if (error || !survey) {
    throw new Error('Pesquisa não encontrada.');
  }

  // Se não for admin global, o tenant da pesquisa DEVE coincidir estritamente com o tenant do admin
  if (!isGlobalAdmin) {
    if (!survey.tenant_id || survey.tenant_id !== tenantId) {
      throw new Error('FORBIDDEN: Acesso negado a pesquisas de outro tenant.');
    }
  }

  return { actor, survey };
}

/**
 * Converte erros internos de autorização em mensagens seguras para o chamador.
 */
export function formatSurveyActionError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    if (err.message.startsWith('UNAUTHORIZED:') || err.message.startsWith('FORBIDDEN:')) {
      return 'Acesso não autorizado.';
    }
    return err.message;
  }
  return fallback;
}
