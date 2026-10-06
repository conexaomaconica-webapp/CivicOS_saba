'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { findAdvertiserBusiness } from '@/lib/advertiser/advertiser-access';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export interface AdvertiserContractDTO {
  business: { id: string; name: string; legal_name: string | null; document: string | null } | null;
  contract: {
    id: string;
    snapshot_id: string;
    status: 'draft' | 'awaiting_signature' | 'signed' | 'voided' | 'superseded';
    signed: boolean;
    version: string;
    sha256_hash: string;
    signed_at: string | null;
    rendered_text: string;
    signer_name: string;
    signature_image_data: string | null;
  } | null;
}

/**
 * Contrato da empresa do usuário logado, com o mesmo conteúdo da aba Contrato do Prontuário 360: texto integral do termo,
 * assinatura eletrônica, data do aceite e hash de integridade. A empresa é confirmada pelo usuário logado antes de ler;
 * a leitura usa a chave de serviço porque as tabelas de contrato não têm política de leitura para o anunciante.
 */
export async function getAdvertiserContractAction(): Promise<AdvertiserContractDTO> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { business: null, contract: null };

    const business = await findAdvertiserBusiness(supabase, userRes.user.id);
    if (!business) return { business: null, contract: null };

    const summary = {
      id: business.id as string,
      name: business.name as string,
      legal_name: (business.legal_name as string | null) ?? null,
      document: (business.cnpj_cpf || business.cnpj || null) as string | null,
    };

    const reader: any = createServiceRoleClient() ?? supabase;

    const { data: contractRows } = await reader
      .from('contracts')
      .select('id, status, version_id, created_at')
      .eq('business_id', business.id)
      .order('created_at', { ascending: false })
      .limit(20);

    const contracts = (contractRows || []).filter((row: any) => !['voided', 'superseded'].includes(row.status));
    if (contracts.length === 0) return { business: summary, contract: null };

    const { data: acceptance } = await reader
      .from('contract_acceptances')
      .select('id, contract_id, snapshot_id, accepted_at')
      .in('contract_id', contracts.map((row: any) => row.id))
      .order('accepted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const contractRow = acceptance
      ? contracts.find((row: any) => row.id === acceptance.contract_id)
      : contracts.find((row: any) => row.status === 'signed') || contracts[0];
    if (!contractRow) return { business: summary, contract: null };

    let snapshotQuery = reader
      .from('contract_snapshots')
      .select('id, rendered_text, sha256_hash, created_at, signature_image_data')
      .eq('contract_id', contractRow.id);
    snapshotQuery = acceptance?.snapshot_id
      ? snapshotQuery.eq('id', acceptance.snapshot_id)
      : snapshotQuery.order('created_at', { ascending: false }).limit(1);
    const { data: snapshot } = await snapshotQuery.maybeSingle();
    if (!snapshot?.rendered_text) return { business: summary, contract: null };

    const { data: version } = await reader.from('contract_versions').select('version').eq('id', contractRow.version_id).maybeSingle();

    return {
      business: summary,
      contract: {
        id: contractRow.id,
        snapshot_id: snapshot.id,
        status: acceptance ? 'signed' : contractRow.status,
        signed: Boolean(acceptance),
        version: version?.version || 'sem versão',
        sha256_hash: snapshot.sha256_hash,
        signed_at: acceptance?.accepted_at ?? null,
        rendered_text: snapshot.rendered_text,
        signer_name: acceptance ? summary.legal_name || summary.name : '',
        signature_image_data: snapshot.signature_image_data ?? null,
      },
    };
  } catch (err) {
    console.error('[getAdvertiserContractAction]', err);
    return { business: null, contract: null };
  }
}
