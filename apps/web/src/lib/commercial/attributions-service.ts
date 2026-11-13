'use server';

import { revalidatePath } from 'next/cache';
import { tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';
import { dedupeKeyKey } from './commercial-secrets';
import { addDays, friendlyCommercialError, leadDedupeKey } from './commercial-utils';

export type AttributionItem = {
  id: string;
  business_id: string;
  representative_id: string;
  lead_id: string | null;
  attribution_type: 'referral_link' | 'lead_registration' | 'admin_assigned';
  status: 'pending' | 'confirmed' | 'rejected' | 'expired' | 'revoked';
  attributed_at: string;
  valid_until: string | null;
  confirmed_at: string | null;
  revoke_reason: string | null;
};

export type AttributionIssueKind =
  | 'transient_error' | 'evidence_expired' | 'evidence_used_by_other_business' | 'rep_inactive' | 'self_referral'
  | 'conflict_confirmed' | 'reserved_by_other' | 'competing_pending';

export type AttributionIssueItem = {
  id: string;
  business_id: string | null;
  evidence_id: string | null;
  representative_id: string | null;
  kind: AttributionIssueKind;
  status: 'open' | 'resolved' | 'discarded';
  claim_at: string;
  attempts: number;
  last_attempt_at: string;
  resolution: string | null;
  resolution_note: string | null;
  created_at: string;
};

export async function listAttributionsAction(): Promise<ActionResult<AttributionItem[]>> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  const { data, error } = await (auth.supabase as any)
    .from('commercial_attributions')
    .select('id, business_id, representative_id, lead_id, attribution_type, status, attributed_at, valid_until, confirmed_at, revoke_reason')
    .eq('tenant_id', auth.tenantId)
    .order('attributed_at', { ascending: false })
    .limit(500);
  if (error) return fail('Não foi possível listar as atribuições.');
  return { success: true, data: (data ?? []) as AttributionItem[] };
}

/**
 * Atribuição manual (admin_assigned): nasce PENDENTE, com validade configurável (padrão 30 dias), autoria e
 * justificativa. A confirmação é um passo separado e sem conflito com outra atribuição confirmada.
 */
export async function createManualAttributionAction(input: {
  businessRef: string;
  representativeId: string;
  justification: string;
}): Promise<ActionResult<{ id: string }>> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  const justification = input.justification?.trim();
  if (!justification || justification.length < 10) return fail('Descreva a justificativa (mínimo de 10 caracteres).');

  try {
    const writer = requireWriter();

    const ref = input.businessRef.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref);
    const businessQuery = writer.from('businesses').select('id').eq('tenant_id', auth.tenantId);
    const { data: business } = await (isUuid ? businessQuery.eq('id', ref) : businessQuery.eq('slug', ref)).maybeSingle();
    if (!business) return fail('Empresa não encontrada. Informe o ID ou o slug exato do anúncio.');

    const { data: rep } = await writer
      .from('commercial_representatives')
      .select('id, status')
      .eq('id', input.representativeId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!rep) return fail('Representante não encontrado.');
    if (rep.status !== 'active') return fail('O representante precisa estar ativo.');

    const { data: confirmed } = await writer
      .from('commercial_attributions')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .maybeSingle();
    if (confirmed) return fail(friendlyCommercialError('attribution_conflict'));

    const { data: settings } = await writer.from('commercial_settings').select('referral_validity_days').eq('tenant_id', auth.tenantId).maybeSingle();
    const validity = Number(settings?.referral_validity_days ?? 30);

    const { data, error } = await writer
      .from('commercial_attributions')
      .insert({
        tenant_id: auth.tenantId,
        business_id: business.id,
        representative_id: rep.id,
        attribution_type: 'admin_assigned',
        status: 'pending',
        valid_until: addDays(new Date(), validity).toISOString(),
        notes: justification,
        created_by: auth.user.id,
      })
      .select('id')
      .single();
    if (error) return fail(/uq_commercial_attributions_pending/.test(error.message) ? 'Já existe uma atribuição pendente deste representante para a empresa.' : friendlyCommercialError(error.message));

    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_attribution',
      entityId: data.id,
      action: 'COMMERCIAL_ATTRIBUTION_CREATED',
      after: { business_id: business.id, representative_id: rep.id },
      reason: justification,
    });
    revalidatePath('/comercial/atribuicoes');
    return { success: true, data: { id: data.id as string } };
  } catch {
    return fail('Erro ao criar a atribuição.');
  }
}

export async function confirmAttributionAction(attributionId: string): Promise<ActionResult> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { error } = await writer.rpc('commercial_confirm_attribution', {
      p_tenant_id: auth.tenantId,
      p_attribution_id: attributionId,
      p_actor: auth.user.id,
    });
    if (error) return fail(friendlyCommercialError(error.message));
    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_attribution',
      entityId: attributionId,
      action: 'COMMERCIAL_ATTRIBUTION_CONFIRMED',
    });
    revalidatePath('/comercial/atribuicoes');
    return { success: true };
  } catch {
    return fail('Erro ao confirmar a atribuição.');
  }
}

export async function revokeAttributionAction(input: { attributionId: string; reason: string }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  const reason = input.reason?.trim();
  if (!reason || reason.length < 10) return fail('Descreva o motivo da revogação (mínimo de 10 caracteres).');

  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_attributions')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), revoked_by: auth.user.id, revoke_reason: reason })
      .eq('id', input.attributionId)
      .eq('tenant_id', auth.tenantId)
      .in('status', ['pending', 'confirmed'])
      .select('id')
      .maybeSingle();
    if (error || !data) return fail('Atribuição não encontrada ou já encerrada.');

    // Créditos já registrados NÃO são apagados: correções futuras são lançamentos compensatórios (Gate 1E).
    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_attribution',
      entityId: input.attributionId,
      action: 'COMMERCIAL_ATTRIBUTION_REVOKED',
      reason,
    });
    revalidatePath('/comercial/atribuicoes');
    return { success: true };
  } catch {
    return fail('Erro ao revogar a atribuição.');
  }
}

// ---------------------------------------------------------------------------
// Gate 1C.1 · Fila de pendências/conflitos da atribuição automática pelo link
// ---------------------------------------------------------------------------

export async function listAttributionIssuesAction(): Promise<ActionResult<AttributionIssueItem[]>> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  const { data, error } = await (auth.supabase as any)
    .from('commercial_attribution_issues')
    .select('id, business_id, evidence_id, representative_id, kind, status, claim_at, attempts, last_attempt_at, resolution, resolution_note, created_at')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return fail('Não foi possível listar as pendências de atribuição.');
  return { success: true, data: (data ?? []) as AttributionIssueItem[] };
}

const ISSUE_KIND_MESSAGE: Record<string, string> = {
  evidence_expired: 'A evidência de indicação já estava vencida quando a empresa foi cadastrada.',
  evidence_used_by_other_business: 'Esta evidência já foi usada por outra empresa.',
  rep_inactive: 'O representante da indicação não está ativo.',
  self_referral: 'A empresa pertence ao próprio representante (autoindicação).',
  conflict_confirmed: 'A empresa já tem atribuição confirmada para outro representante.',
  reserved_by_other: 'Existe um lead com reserva vigente de outro representante.',
  competing_pending: 'Outro representante já tem atribuição pendente para esta empresa.',
};

/**
 * Reprocessa uma pendência usando a EVIDÊNCIA guardada (não depende mais do cookie). A validade é avaliada no momento
 * em que a empresa foi cadastrada. Nunca confirma e nunca substitui atribuição existente.
 */
export async function retryAttributionIssueAction(issueId: string): Promise<ActionResult<{ result: string }>> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data: issue } = await writer
      .from('commercial_attribution_issues')
      .select('id, business_id, evidence_id, claim_at, claim_user_id, status')
      .eq('id', issueId)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!issue || issue.status !== 'open') return fail('Pendência não encontrada ou já encerrada.');
    if (!issue.business_id || !issue.evidence_id) return fail('A empresa ou a evidência desta pendência não existe mais; descarte-a com justificativa.');

    const { data: business } = await writer
      .from('businesses')
      .select('id, owner_id, cnpj')
      .eq('id', issue.business_id)
      .eq('tenant_id', auth.tenantId)
      .maybeSingle();
    if (!business) return fail('Empresa não encontrada.');

    const key = dedupeKeyKey();
    let ownerEmail: string | null = null;
    if (business.owner_id) {
      const { data: owner } = await writer.auth.admin.getUserById(business.owner_id as string);
      ownerEmail = owner?.user?.email ?? null;
    }
    const keys = [
      leadDedupeKey({ document: business.cnpj as string | null }, key),
      leadDedupeKey({ email: ownerEmail }, key),
    ].filter((k): k is string => Boolean(k));

    const { data, error } = await writer.rpc('commercial_claim_referral', {
      p_tenant_id: auth.tenantId,
      p_business_id: issue.business_id,
      p_claim_user: issue.claim_user_id ?? business.owner_id ?? null,
      p_token_hash: null,
      p_evidence_id: issue.evidence_id,
      p_dedupe_keys: keys,
      p_claim_at: issue.claim_at,
      p_actor: auth.user.id,
      p_issue_id: issue.id,
    });
    if (error) return fail(friendlyCommercialError(error.message));

    const result = String((data as { result?: string })?.result ?? 'unknown');
    const kind = (data as { issue_kind?: string })?.issue_kind;
    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_attribution_issue',
      entityId: issueId,
      action: 'COMMERCIAL_ISSUE_RETRIED',
      after: { result, kind: kind ?? null },
    });
    revalidatePath('/comercial/atribuicoes');
    if (result === 'created' || result === 'already_attributed') return { success: true, data: { result } };
    if (result === 'issue') return fail(ISSUE_KIND_MESSAGE[kind ?? ''] ?? 'A pendência continua aberta.');
    if (result === 'disabled') return fail('A atribuição automática está desligada neste ambiente.');
    return fail('Não foi possível reprocessar a pendência.');
  } catch {
    return fail('Erro ao reprocessar a pendência.');
  }
}

/** Decisão administrativa registrada: encerra a pendência (resolvida por outro meio ou descartada) com justificativa. */
export async function resolveAttributionIssueAction(input: {
  issueId: string;
  decision: 'resolved' | 'discarded';
  note: string;
}): Promise<ActionResult> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  const note = input.note?.trim();
  if (!note || note.length < 10) return fail('Descreva a justificativa (mínimo de 10 caracteres).');
  if (input.decision !== 'resolved' && input.decision !== 'discarded') return fail('Decisão inválida.');

  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_attribution_issues')
      .update({
        status: input.decision,
        resolution: input.decision === 'resolved' ? 'resolved_by_staff' : 'discarded_by_staff',
        resolution_note: note,
        resolved_by: auth.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', input.issueId)
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'open')
      .select('id')
      .maybeSingle();
    if (error || !data) return fail('Pendência não encontrada ou já encerrada.');
    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_attribution_issue',
      entityId: input.issueId,
      action: input.decision === 'resolved' ? 'COMMERCIAL_ISSUE_RESOLVED' : 'COMMERCIAL_ISSUE_DISCARDED',
      reason: note,
    });
    revalidatePath('/comercial/atribuicoes');
    return { success: true };
  } catch {
    return fail('Erro ao encerrar a pendência.');
  }
}
