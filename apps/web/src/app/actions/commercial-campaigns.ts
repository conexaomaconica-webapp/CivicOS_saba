'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { resolveCanonicalAdminTenant } from '@/lib/admin/admin-tenant-context';
import {
  getCommercialCampaignByCode,
  listCampaignExceptions,
  PEDRA_FUNDAMENTAL_CAMPAIGN_CODE,
  type CampaignExceptionRecord,
  type CommercialCampaignStatus,
  type CommercialCampaignSummary,
} from '@/lib/commercial/campaign-availability-service';

async function requirePlatformAdmin() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('UNAUTHORIZED: Usuário não autenticado.');
  }
  const { data: isAdmin } = await (supabase as any).rpc('has_platform_admin_access');
  if (!isAdmin) {
    throw new Error('FORBIDDEN: Acesso restrito ao administrador da plataforma.');
  }
  const { tenantId } = await resolveCanonicalAdminTenant();
  return { supabase, user, tenantId };
}

export async function getPedraFundamentalCampaignAdminStateAction(): Promise<{
  success: boolean;
  campaign?: CommercialCampaignSummary;
  exceptions?: CampaignExceptionRecord[];
  error?: string;
}> {
  try {
    const { supabase, tenantId } = await requirePlatformAdmin();
    const [campaign, exceptions] = await Promise.all([
      getCommercialCampaignByCode(supabase, tenantId, PEDRA_FUNDAMENTAL_CAMPAIGN_CODE),
      listCampaignExceptions(supabase, tenantId, PEDRA_FUNDAMENTAL_CAMPAIGN_CODE),
    ]);
    return { success: true, campaign, exceptions };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao carregar campanha.' };
  }
}

export async function updateCampaignStatusAdminAction(input: {
  campaignCode?: string;
  status: Extract<CommercialCampaignStatus, 'active' | 'paused' | 'ended'>;
  reason?: string;
}): Promise<{ success: boolean; campaign?: CommercialCampaignSummary; error?: string }> {
  try {
    const { supabase, user, tenantId } = await requirePlatformAdmin();
    const code = input.campaignCode || PEDRA_FUNDAMENTAL_CAMPAIGN_CODE;
    if (!['active', 'paused', 'ended'].includes(input.status)) {
      return { success: false, error: 'Status inválido.' };
    }

    const current = await getCommercialCampaignByCode(supabase, tenantId, code);
    if (!current.id) {
      return { success: false, error: 'Tabela commercial_campaigns não inicializada neste ambiente.' };
    }

    const nowIso = new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: input.status,
      updated_by: user.id,
      updated_at: nowIso,
    };
    if (input.status === 'ended') {
      updatePayload.ended_at = nowIso;
      updatePayload.ended_by = user.id;
    }

    const { error } = await (supabase as any)
      .from('commercial_campaigns')
      .update(updatePayload)
      .eq('id', current.id)
      .eq('tenant_id', tenantId);

    if (error) {
      return { success: false, error: error.message };
    }

    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: tenantId,
        actor_id: user.id,
        entity_type: 'commercial_campaigns',
        entity_id: current.id,
        action: 'UPDATE_COMMERCIAL_CAMPAIGN_STATUS',
        before_value: { status: current.status },
        after_value: { status: input.status },
        reason: input.reason?.trim() || `Status da campanha ${code} alterado de ${current.status} para ${input.status}.`,
      });
    } catch {}

    revalidatePath('/admin/planos');
    revalidatePath('/admin/campanhas');
    revalidatePath('/admin/empresas/nova');
    const updated = await getCommercialCampaignByCode(supabase, tenantId, code);
    return { success: true, campaign: updated };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao atualizar status da campanha.' };
  }
}

export async function grantCampaignExceptionAdminAction(input: {
  campaignCode?: string;
  businessId?: string | null;
  leadId?: string | null;
  targetDocument?: string | null;
  targetEmail?: string | null;
  justification: string;
  expiresInDays?: number;
}): Promise<{ success: boolean; exceptionId?: string; error?: string }> {
  try {
    const { supabase, user, tenantId } = await requirePlatformAdmin();
    const justification = String(input.justification || '').trim();
    if (justification.length < 10) {
      return { success: false, error: 'Informe uma justificativa com pelo menos 10 caracteres.' };
    }

    const doc = String(input.targetDocument || '').replace(/\D/g, '') || null;
    const email = String(input.targetEmail || '').trim().toLowerCase() || null;
    const businessId = input.businessId?.trim() || null;
    const leadId = input.leadId?.trim() || null;

    if (!businessId && !leadId && !doc && !email) {
      return { success: false, error: 'Vincule a exceção a uma empresa, lead, CPF/CNPJ ou e-mail específico.' };
    }

    const code = input.campaignCode || PEDRA_FUNDAMENTAL_CAMPAIGN_CODE;
    const campaign = await getCommercialCampaignByCode(supabase, tenantId, code);
    if (!campaign.id) {
      return { success: false, error: 'Campanha não encontrada no banco.' };
    }

    const expiresAt =
      input.expiresInDays && input.expiresInDays > 0
        ? new Date(Date.now() + input.expiresInDays * 86400_000).toISOString()
        : null;

    const { data: inserted, error } = await (supabase as any)
      .from('commercial_campaign_exceptions')
      .insert({
        tenant_id: tenantId,
        campaign_id: campaign.id,
        business_id: businessId,
        lead_id: leadId,
        target_document: doc,
        target_email: email,
        justification,
        status: 'authorized',
        authorized_by: user.id,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      return { success: false, error: error?.message || 'Erro ao registrar exceção.' };
    }

    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: tenantId,
        actor_id: user.id,
        entity_type: 'commercial_campaign_exceptions',
        entity_id: inserted.id,
        action: 'GRANT_CAMPAIGN_EXCEPTION',
        after_value: {
          campaign_code: code,
          business_id: businessId,
          lead_id: leadId,
          target_document: doc ? `***${doc.slice(-4)}` : null,
          target_email: email,
          expires_at: expiresAt,
        },
        reason: justification,
      });
    } catch {}

    revalidatePath('/admin/planos');
    revalidatePath('/admin/campanhas');
    revalidatePath('/admin/empresas/nova');
    return { success: true, exceptionId: inserted.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao autorizar exceção.' };
  }
}

export async function revokeCampaignExceptionAdminAction(
  exceptionId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user, tenantId } = await requirePlatformAdmin();
    const { error } = await (supabase as any)
      .from('commercial_campaign_exceptions')
      .update({
        status: 'revoked',
        revoked_by: user.id,
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', exceptionId)
      .eq('tenant_id', tenantId)
      .eq('status', 'authorized');

    if (error) return { success: false, error: error.message };

    try {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: tenantId,
        actor_id: user.id,
        entity_type: 'commercial_campaign_exceptions',
        entity_id: exceptionId,
        action: 'REVOKE_CAMPAIGN_EXCEPTION',
        reason: reason?.trim() || 'Exceção revogada pelo administrador.',
      });
    } catch {}

    revalidatePath('/admin/planos');
    revalidatePath('/admin/campanhas');
    revalidatePath('/admin/empresas/nova');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao revogar exceção.' };
  }
}

