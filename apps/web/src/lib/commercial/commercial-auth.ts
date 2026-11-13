import 'server-only';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { isCommercialModuleEnvEnabled } from './feature-flag';
import {
  COMMERCIAL_PERMISSIONS,
  permissionSatisfies,
  type CommercialPermission,
  type CommercialPermissionNeed,
  type RepresentativeStatus,
} from './access-rules';

/** Colunas seguras do representante (hash/cifrados/fiscais NUNCA são lidos pelo cliente do usuário). */
const SAFE_REPRESENTATIVE_COLUMNS =
  'id, tenant_id, person_type, legal_name, trade_name, email, phone, document_last4, referral_code, status, status_changed_at, contract_accepted_at, created_at';

export type RepresentativeRecord = {
  id: string;
  tenant_id: string;
  person_type: 'pf' | 'pj';
  legal_name: string;
  trade_name: string | null;
  email: string;
  phone: string | null;
  document_last4: string | null;
  referral_code: string;
  status: RepresentativeStatus;
  status_changed_at: string;
  contract_accepted_at: string | null;
  created_at: string;
};

export type RepresentativeContext = {
  userId: string;
  tenantId: string;
  representative: RepresentativeRecord;
};

/**
 * Vincula um convite de representante ao usuário logado quando o e-mail VERIFICADO coincide.
 * É assim que o representante é ligado ao usuário existente (mesmo login de anunciante, se houver).
 * O vínculo NÃO ativa o representante: a ativação continua sendo um ato da equipe comercial.
 */
async function claimRepresentativeInvite(user: { id: string; email?: string | null; email_confirmed_at?: string | null }, tenantId: string) {
  const email = (user.email ?? '').trim().toLowerCase();
  if (!email || !user.email_confirmed_at) return false;

  const writer = createServiceRoleClient();
  if (!writer) return false;

  const { data: settings } = await writer
    .from('commercial_settings')
    .select('module_enabled')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!settings?.module_enabled) return false;

  const { data: invite } = await writer
    .from('commercial_representatives')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .is('user_id', null)
    .ilike('email', email)
    .in('status', ['invited', 'pending_review', 'active'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!invite) return false;

  const { error } = await writer
    .from('commercial_representatives')
    .update({ user_id: user.id, status: invite.status === 'invited' ? 'pending_review' : invite.status, status_changed_at: new Date().toISOString() })
    .eq('id', invite.id)
    .is('user_id', null);
  return !error;
}

/**
 * Contexto do representante logado, ou null (módulo desativado, sem sessão, tenant inválido ou sem vínculo).
 * Usa o cliente DO USUÁRIO: a RLS (migration 235) é quem garante o isolamento, inclusive quando o módulo
 * está desligado no banco (a consulta retorna vazio).
 */
export async function getRepresentativeContext(): Promise<RepresentativeContext | null> {
  if (!isCommercialModuleEnvEnabled()) return null;

  const supabase = await createServerSideClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  let tenantId: string;
  try {
    tenantId = await resolveTenantIdServer();
  } catch {
    return null;
  }

  const query = () =>
    (supabase as any)
      .from('commercial_representatives')
      .select(SAFE_REPRESENTATIVE_COLUMNS)
      .eq('tenant_id', tenantId)
      .eq('user_id', user.id)
      .maybeSingle();

  let { data, error } = await query();
  if (!error && !data && (await claimRepresentativeInvite(user, tenantId))) {
    ({ data, error } = await query());
  }

  if (error || !data) return null;
  return { userId: user.id, tenantId, representative: data as RepresentativeRecord };
}

export type StaffContext = {
  userId: string;
  tenantId: string;
  isMaster: boolean;
  permissions: CommercialPermission[];
};

/**
 * Contexto da equipe comercial: permissões VIGENTES do usuário (grants ativos e não expirados) ou todas, se master.
 * Administrador da plataforma sem grant recebe null (nenhum acesso automático).
 */
export async function getStaffContext(): Promise<StaffContext | null> {
  if (!isCommercialModuleEnvEnabled()) return null;

  const supabase = await createServerSideClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) return null;

  let tenantId: string;
  try {
    tenantId = await resolveTenantIdServer();
  } catch {
    return null;
  }

  const { data: masterFlag } = await (supabase as any).rpc('has_global_platform_role', { p_role: 'master' });
  const isMaster = masterFlag === true;

  // O usuário enxerga os PRÓPRIOS grants (RLS 235) quando o módulo está habilitado no tenant.
  const { data: grants } = await (supabase as any)
    .from('commercial_access_grants')
    .select('permission, expires_at')
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .eq('status', 'active');

  const now = Date.now();
  const permissions = isMaster
    ? [...COMMERCIAL_PERMISSIONS]
    : ((grants ?? []) as Array<{ permission: CommercialPermission; expires_at: string | null }>)
        .filter((g) => !g.expires_at || new Date(g.expires_at).getTime() > now)
        .map((g) => g.permission);

  if (!isMaster && permissions.length === 0) return null;
  return { userId: user.id, tenantId, isMaster, permissions };
}

export function staffCan(ctx: StaffContext | null, needed: CommercialPermissionNeed): boolean {
  return !!ctx && (ctx.isMaster || permissionSatisfies(ctx.permissions, needed));
}

/**
 * Autorização de serviços de backend do módulo: exige a chave de aplicação ligada e a permissão comercial
 * específica, verificada NO BANCO por has_commercial_permission (sem admin automático).
 * Lança 'NOT_FOUND' (módulo desativado), 'UNAUTHORIZED' (sem sessão) ou 'FORBIDDEN'.
 */
export async function assertCommercialPermission(permission: CommercialPermissionNeed) {
  if (!isCommercialModuleEnvEnabled()) {
    throw new Error('NOT_FOUND: módulo comercial desativado.');
  }

  const supabase = await createServerSideClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw new Error('UNAUTHORIZED: sessão expirada ou usuário não autenticado.');

  const tenantId = await resolveTenantIdServer();
  const { data, error } = await (supabase as any).rpc('has_commercial_permission', {
    p_tenant_id: tenantId,
    p_permission: permission,
  });
  if (error || data !== true) {
    throw new Error(`FORBIDDEN: requer a permissão comercial '${permission}'.`);
  }

  return { supabase, user, tenantId };
}

/** Variante que devolve o erro como texto (para server actions, sem lançar exceção ao cliente). */
export async function tryCommercialPermission(permission: CommercialPermissionNeed) {
  try {
    return { ok: true as const, ...(await assertCommercialPermission(permission)) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FORBIDDEN';
    return {
      ok: false as const,
      error: message.startsWith('UNAUTHORIZED')
        ? 'Sua sessão expirou. Entre novamente.'
        : message.startsWith('NOT_FOUND')
          ? 'Módulo comercial desativado.'
          : 'Você não tem permissão para esta ação.',
    };
  }
}
