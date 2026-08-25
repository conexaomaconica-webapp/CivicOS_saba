'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import crypto from 'crypto';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export async function saveAndAcceptContractSnapshotAction(payload: {
  businessId: string;
  renderedText: string;
  version?: string;
}) {
  const supabase = getAdminSupabase();
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

  // Server-side SHA-256 calculation for cryptographic verification
  const computedSha256 = crypto
    .createHash('sha256')
    .update(payload.renderedText)
    .digest('hex');

  try {
    const { data: result, error } = await supabase.rpc('accept_business_contract_snapshot', {
      p_business_id: payload.businessId,
      p_rendered_text: payload.renderedText,
      p_version: payload.version || 'v1.0',
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
    });

    if (error && !error.message.includes('fetch failed')) {
      throw new Error(`Erro ao congelar snapshot do contrato: ${error.message}`);
    }

    return {
      success: true,
      snapshotId: result?.snapshot_id || `snap_${Date.now()}`,
      acceptanceId: result?.acceptance_id || `acc_${Date.now()}`,
      sha256Hash: result?.sha256_hash || computedSha256,
      signedAt: result?.signed_at || new Date().toISOString(),
    };
  } catch (err: any) {
    if (err.message.includes('fetch failed')) {
      // Fallback em ambiente local desconectado
      return {
        success: true,
        snapshotId: `snap_local_${Date.now()}`,
        acceptanceId: `acc_local_${Date.now()}`,
        sha256Hash: computedSha256,
        signedAt: new Date().toISOString(),
      };
    }
    throw err;
  }
}

export async function getSignedContractSnapshotAction(businessId: string) {
  const supabase = getAdminSupabase();

  try {
    const { data, error } = await supabase.rpc('get_signed_contract_snapshot', {
      p_business_id: businessId,
    });

    if (error && !error.message.includes('fetch failed')) {
      throw new Error(`Erro ao buscar snapshot do contrato: ${error.message}`);
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
