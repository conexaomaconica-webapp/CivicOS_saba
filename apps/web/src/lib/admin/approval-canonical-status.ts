/**
 * Resolução canônica dos critérios de aprovação (vínculo, contrato, pagamento).
 *
 * As RPCs legadas `get_admin_approval_directory_list` / `get_admin_approval_dossier_360`
 * consultam colunas antigas (`business_masonic_links.verification_status`,
 * `contract_snapshots.status`, `subscriptions.status`) que o fluxo comercial atual
 * não grava mais. Este módulo usa as mesmas fontes adotadas na publicação
 * (`finalizeApprovalDecisionAction`) e na máquina de estados comercial.
 */
import { COMMERCIAL_STATUS_ORDER, type CommercialStatus } from '@/lib/commercial-onboarding-status';

export interface CanonicalApprovalFlags {
  has_masonic_link: boolean;
  has_signed_contract: boolean;
  has_valid_payment: boolean;
}

const VALID_SUBSCRIPTION_STATUSES = new Set(['active', 'paid', 'trialing']);

function commercialStageAtLeast(status: string | null | undefined, stage: CommercialStatus): boolean {
  if (!status) return false;
  const current = COMMERCIAL_STATUS_ORDER.indexOf(status as CommercialStatus);
  const target = COMMERCIAL_STATUS_ORDER.indexOf(stage);
  return current >= 0 && current >= target;
}

/**
 * Busca em lote os sinais canônicos para um conjunto de empresas.
 * Falhas de consulta isoladas não derrubam a listagem (mantêm `false`).
 */
export async function resolveCanonicalApprovalFlags(
  supabase: any,
  businesses: Array<{ id: string; commercial_status?: string | null }>
): Promise<Record<string, CanonicalApprovalFlags>> {
  const ids = businesses.map((b) => b.id).filter(Boolean);
  const result: Record<string, CanonicalApprovalFlags> = {};
  if (ids.length === 0) return result;

  const linkOk = new Set<string>();
  const contractOk = new Set<string>();
  const paymentOk = new Set<string>();

  await Promise.all([
    (async () => {
      try {
        const { data } = await supabase
          .from('business_masonic_links')
          .select('business_id, status, verified_at')
          .in('business_id', ids);
        for (const row of data || []) {
          if (row.status === 'approved' && row.verified_at) {
            linkOk.add(row.business_id);
          }
        }
      } catch (_e) {}
    })(),
    (async () => {
      try {
        const { data } = await supabase
          .from('contracts')
          .select('id, business_id, status')
          .in('business_id', ids);
        const contracts = data || [];
        for (const row of contracts) {
          if (row.status === 'signed') contractOk.add(row.business_id);
        }
        if (contracts.length > 0) {
          const businessByContract = new Map(contracts.map((row: any) => [row.id, row.business_id]));
          const { data: acceptances } = await supabase
            .from('contract_acceptances')
            .select('contract_id')
            .in('contract_id', contracts.map((row: any) => row.id));
          for (const acceptance of acceptances || []) {
            const businessId = businessByContract.get(acceptance.contract_id);
            if (businessId) contractOk.add(businessId as string);
          }
        }
      } catch (_e) {}
    })(),
    (async () => {
      try {
        const { data } = await supabase
          .from('invoices')
          .select('business_id')
          .in('business_id', ids)
          .eq('status', 'paid');
        for (const row of data || []) paymentOk.add(row.business_id);
      } catch (_e) {}
    })(),
    (async () => {
      try {
        const { data } = await supabase
          .from('subscriptions')
          .select('business_id, status')
          .in('business_id', ids);
        for (const row of data || []) {
          if (VALID_SUBSCRIPTION_STATUSES.has(row.status)) paymentOk.add(row.business_id);
        }
      } catch (_e) {}
    })(),
  ]);

  for (const b of businesses) {
    const cs = b.commercial_status;
    result[b.id] = {
      has_masonic_link: linkOk.has(b.id) || commercialStageAtLeast(cs, 'vinculo_verificado'),
      has_signed_contract: contractOk.has(b.id) || commercialStageAtLeast(cs, 'contrato_assinado'),
      has_valid_payment: paymentOk.has(b.id) || commercialStageAtLeast(cs, 'pagamento_confirmado'),
    };
  }

  return result;
}
