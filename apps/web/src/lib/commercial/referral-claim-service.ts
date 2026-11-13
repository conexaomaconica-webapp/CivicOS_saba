'use server';

import { cookies } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';
import { isCommercialModuleEnvEnabled } from './feature-flag';
import { dedupeKeyKey } from './commercial-secrets';
import { requireWriter } from './commercial-service-base';
import { hashReferralToken, isValidReferralToken, leadDedupeKey } from './commercial-utils';

const COOKIE_NAME = 'cm_ref';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ClaimReferralResult = { result: string };

/**
 * Gate 1C.1 · Reivindica a indicação (cookie cm_ref) para a empresa recém-criada no cadastro e cria, no máximo, uma
 * atribuição PENDENTE. Chamada DEPOIS de a empresa já ter sido criada com sucesso.
 *
 * Garantias:
 *  - NUNCA lança: qualquer falha vira `{ result: ... }`, log estruturado e, se possível, uma pendência recuperável
 *    (o cadastro da empresa jamais depende deste serviço);
 *  - o cookie é só um ponteiro: a decisão (evidência, validade, uso único, reservas, conflitos) é do banco, numa
 *    transação (commercial_claim_referral);
 *  - a empresa precisa pertencer ao usuário logado (conferido com o cliente do usuário, sob RLS);
 *  - com a chave desligada devolve imediatamente, sem nenhum efeito.
 */
export async function claimCommercialReferralAction(businessId: string): Promise<ClaimReferralResult> {
  if (!isCommercialModuleEnvEnabled()) return { result: 'disabled' };

  let tenantId: string | null = null;
  let userId: string | null = null;
  let tokenHash: string | null = null;
  try {
    if (typeof businessId !== 'string' || !UUID_RE.test(businessId)) return { result: 'invalid_business' };
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!isValidReferralToken(token)) return { result: 'no_token' };
    tokenHash = hashReferralToken(token);

    const supabase = await createServerSideClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { result: 'no_session' };
    userId = user.id;

    // Posse da empresa conferida sob RLS (cliente do usuário), nunca pelo que veio do navegador.
    const { data: business } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, owner_id, cnpj')
      .eq('id', businessId)
      .maybeSingle();
    if (!business || business.owner_id !== user.id) return { result: 'not_owner' };
    tenantId = business.tenant_id as string;

    const key = dedupeKeyKey();
    const keys = [
      leadDedupeKey({ document: business.cnpj as string | null }, key),
      leadDedupeKey({ email: user.email ?? null }, key),
    ].filter((k): k is string => Boolean(k));

    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_claim_referral', {
      p_tenant_id: tenantId,
      p_business_id: businessId,
      p_claim_user: user.id,
      p_token_hash: tokenHash,
      p_dedupe_keys: keys,
    });
    if (error) throw new Error(error.message);

    const result = String((data as { result?: string } | null)?.result ?? 'unknown');
    const issueKind = (data as { issue_kind?: string } | null)?.issue_kind;
    if (result === 'issue') {
      console.warn(JSON.stringify({ event: 'commercial.claim_issue', business_id: businessId, kind: issueKind ?? null }));
    }
    // A evidência foi consumida (ou é inútil): o navegador não precisa mais do token.
    if (['created', 'already_attributed', 'issue', 'invalid_token'].includes(result)) {
      try {
        cookieStore.delete(COOKIE_NAME);
      } catch {
        // cookie não removível neste contexto: inofensivo, o banco já trata o uso único
      }
    }
    return { result };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 200) : 'erro desconhecido';
    console.error(JSON.stringify({ event: 'commercial.claim_failed', business_id: businessId, message }));
    // Recuperável: guarda a pendência com a evidência (o reprocesso não depende mais do cookie).
    try {
      if (tenantId && tokenHash) {
        const writer = requireWriter();
        const { data: ev } = await writer
          .from('commercial_referral_evidence')
          .select('id, representative_id')
          .eq('tenant_id', tenantId)
          .eq('visit_token_hash', tokenHash)
          .maybeSingle();
        if (ev) {
          await writer.from('commercial_attribution_issues').insert({
            tenant_id: tenantId,
            business_id: businessId,
            evidence_id: ev.id,
            representative_id: ev.representative_id,
            kind: 'transient_error',
            claim_user_id: userId,
            claim_at: new Date().toISOString(),
            detail: { message },
          });
        }
      }
    } catch (inner) {
      console.error(JSON.stringify({ event: 'commercial.claim_issue_not_recorded', business_id: businessId, message: inner instanceof Error ? inner.message.slice(0, 200) : 'erro' }));
    }
    return { result: 'error' };
  }
}
