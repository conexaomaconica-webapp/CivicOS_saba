import 'server-only';

import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type ActiveContract = { version: string; title: string; content_text: string };

export type ContractGate = { required: false } | { required: true; contract: ActiveContract };

/**
 * O representante precisa aceitar o contrato vigente? Sim quando existe versão ativa e ele ainda não aceitou ESSA versão
 * (primeiro acesso ou nova versão publicada). Sem contrato publicado, ou se a leitura falhar, não bloqueia a área:
 * uma falha de infraestrutura nunca tranca o representante (o erro fica no log do servidor).
 */
export async function getContractGate(tenantId: string, userId: string): Promise<ContractGate> {
  const writer = createServiceRoleClient();
  if (!writer) return { required: false };

  try {
    const { data: contract, error } = await writer
      .from('commercial_contract_versions')
      .select('version, title, content_text')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!contract) return { required: false };

    const { data: rep } = await writer
      .from('commercial_representatives')
      .select('contract_version, contract_accepted_at')
      .eq('tenant_id', tenantId)
      .eq('user_id', userId)
      .maybeSingle();

    const accepted = Boolean(rep?.contract_accepted_at) && rep?.contract_version === contract.version;
    return accepted ? { required: false } : { required: true, contract: contract as ActiveContract };
  } catch (error) {
    console.error(JSON.stringify({ event: 'commercial.contract_gate_failed', message: error instanceof Error ? error.message : 'erro' }));
    return { required: false };
  }
}
