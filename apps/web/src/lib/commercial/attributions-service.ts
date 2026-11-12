'use server';

import { revalidatePath } from 'next/cache';
import { tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';
import { addDays, friendlyCommercialError } from './commercial-utils';

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
