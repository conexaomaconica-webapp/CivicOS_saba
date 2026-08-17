'use server';

import { createServerSideClient } from '@/lib/supabase/server';


export interface AdminActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function updatePlanQuotaAction(input: {
  tenantId: string;
  entitlementId: string;
  servicesLimit?: number;
  benefitsLimit?: number;
  galleryLimit?: number;
  reason?: string;
}): Promise<AdminActionResult> {
  try {
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // Call RPC which enforces platform_admin role and records audit log before/after
    const { data, error } = await supabase.rpc('update_plan_entitlement_quota', {
      p_tenant_id: input.tenantId,
      p_entitlement_id: input.entitlementId,
      p_services_limit: input.servicesLimit,
      p_benefits_limit: input.benefitsLimit,
      p_gallery_limit: input.galleryLimit,
      p_reason: input.reason || 'Alteração manual de cota via painel admin',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar cota do plano.',
    };
  }
}

export async function moderatePublicationStatusAction(input: {
  tenantId: string;
  businessId: string;
  newStatus: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';
  reason?: string;
}): Promise<AdminActionResult> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase.rpc('moderate_business_publication_status', {
      p_tenant_id: input.tenantId,
      p_business_id: input.businessId,
      p_new_status: input.newStatus,
      p_reason: input.reason || 'Moderação de status de publicação pelo admin',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao moderar status de publicação.',
    };
  }
}

export async function allocateFounderStatusAction(input: {
  tenantId: string;
  businessId: string;
  isFounder: boolean;
  reason?: string;
}): Promise<AdminActionResult> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase.rpc('allocate_founder_status', {
      p_tenant_id: input.tenantId,
      p_business_id: input.businessId,
      p_is_founder: input.isFounder,
      p_reason: input.reason || 'Alocação de status Founder pelo admin',
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao alterar alocação Founder.',
    };
  }
}

export async function moderateReviewAction(input: {
  reviewId: string;
  status: 'approved' | 'rejected' | 'hidden';
  rejectionReason?: string;
}): Promise<AdminActionResult> {
  try {
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // Preserve history: update status, moderated_at, moderator_id, rejection_reason (NO DELETE)
    const { data, error } = await supabase
      .from('business_reviews')
      .update({
        status: input.status,
        moderated_at: new Date().toISOString(),
        moderator_id: user.id,
        rejection_reason: input.rejectionReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.reviewId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao moderar avaliação.',
    };
  }
}

export async function fetchAdminAuditLogsAction(
  tenantId?: string
): Promise<AdminActionResult> {
  try {
    const supabase = await createServerSideClient();
    let query = supabase
      .from('admin_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao carregar histórico de auditoria.',
    };
  }
}
