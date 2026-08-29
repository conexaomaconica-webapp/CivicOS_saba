'use server';

import { createServerSideClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import crypto from 'crypto';

function getServiceRoleSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function saveAndAcceptContractSnapshotAction(payload: {
  businessId: string;
  renderedText: string;
  version?: string;
}) {
  let supabase: any;
  try {
    supabase = await createServerSideClient();
  } catch (_e) {
    supabase = getServiceRoleSupabase();
  }

  if (!supabase) {
    supabase = getServiceRoleSupabase();
  }

  let ipAddress = '127.0.0.1';
  let userAgent = 'Browser';
  try {
    const reqHeaders = await headers();
    ipAddress = reqHeaders.get('x-forwarded-for') || reqHeaders.get('x-real-ip') || '127.0.0.1';
    userAgent = reqHeaders.get('user-agent') || 'Browser';
  } catch (_e) {
    // Execução fora do contexto de servidor HTTP (ex: testes unitários)
  }

  if (!payload.renderedText || !payload.renderedText.trim()) {
    throw new Error('INVALID_CONTRACT_TEXT: O texto do contrato renderizado é obrigatório.');
  }

  // Server-side SHA-256 calculation sobre o texto bruto sem mutação
  const computedSha256 = crypto
    .createHash('sha256')
    .update(payload.renderedText, 'utf8')
    .digest('hex');

  try {
    const { data: result, error } = await supabase.rpc('accept_business_contract_snapshot', {
      p_business_id: payload.businessId,
      p_rendered_text: payload.renderedText,
      p_version: payload.version || 'v1.0',
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error) {
      throw new Error(`Erro ao congelar snapshot do contrato via RPC: ${error.message}`);
    }

    if (!result || !result.ok) {
      throw new Error(`RPC accept_business_contract_snapshot não retornou confirmação: ${result?.error || 'Erro desconhecido'}`);
    }

    return {
      success: true,
      snapshotId: result.snapshot_id,
      acceptanceId: result.acceptance_id,
      sha256Hash: result.sha256_hash || computedSha256,
      signedAt: result.signed_at || new Date().toISOString(),
    };
  } catch (err: any) {
    console.error('Erro em saveAndAcceptContractSnapshotAction:', err);
    throw err;
  }
}

export async function getSignedContractSnapshotAction(businessId: string) {
  let supabase: any;
  try {
    supabase = await createServerSideClient();
  } catch (_e) {
    supabase = getServiceRoleSupabase();
  }

  if (!supabase) {
    supabase = getServiceRoleSupabase();
  }

  try {
    const { data, error } = await supabase.rpc('get_signed_contract_snapshot', {
      p_business_id: businessId,
    });

    if (error) {
      // Consulta direta nas tabelas contracts, contract_snapshots e contract_acceptances
      const { data: contractRow } = await supabase
        .from('contracts')
        .select('id, business_id, status, created_at')
        .eq('business_id', businessId)
        .eq('status', 'signed')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!contractRow) {
        return { success: false, error: 'Nenhum contrato assinado localizado.' };
      }

      const { data: snapshotRow } = await supabase
        .from('contract_snapshots')
        .select('id, rendered_text, sha256_hash, created_at')
        .eq('contract_id', contractRow.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!snapshotRow) {
        return { success: false, error: 'Snapshot não localizado.' };
      }

      const { data: acceptanceRow } = await supabase
        .from('contract_acceptances')
        .select('id, user_id, accepted_at, ip_address, user_agent')
        .eq('snapshot_id', snapshotRow.id)
        .maybeSingle();

      return {
        success: true,
        contract: {
          ok: true,
          contract_id: contractRow.id,
          snapshot_id: snapshotRow.id,
          business_id: contractRow.business_id,
          status: contractRow.status,
          rendered_text: snapshotRow.rendered_text,
          sha256_hash: snapshotRow.sha256_hash,
          accepted_at: acceptanceRow?.accepted_at || snapshotRow.created_at,
          ip_address: acceptanceRow?.ip_address || '127.0.0.1',
          user_agent: acceptanceRow?.user_agent || 'Browser',
          user_id: acceptanceRow?.user_id || '00000000-0000-0000-0000-000000000101',
        },
      };
    }

    if (!data || !data.ok) {
      return {
        success: false,
        error: data?.error || 'Nenhum contrato assinado localizado.',
      };
    }

    return {
      success: true,
      contract: data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro inesperado ao buscar snapshot.',
    };
  }
}
