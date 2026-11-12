import 'server-only';

import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { isCommercialModuleEnvEnabled } from './feature-flag';
import type { CommercialPermission, RepresentativeStatus } from './access-rules';

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

  const { data, error } = await (supabase as any)
    .from('commercial_representatives')
    .select(SAFE_REPRESENTATIVE_COLUMNS)
    .eq('tenant_id', tenantId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error || !data) return null;
  return { userId: user.id, tenantId, representative: data as RepresentativeRecord };
}

/**
 * Autorização de serviços de backend do módulo (uso nos Gates 1C+): exige a chave de aplicação ligada e a
 * permissão comercial específica, verificada NO BANCO por has_commercial_permission (sem admin automático).
 * Lança 'NOT_FOUND' (módulo desativado), 'UNAUTHORIZED' (sem sessão) ou 'FORBIDDEN'.
 */
export async function assertCommercialPermission(permission: CommercialPermission) {
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
