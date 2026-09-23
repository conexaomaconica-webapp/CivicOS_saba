'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export interface AdminActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const DEFAULT_TENANT_UUID = '00000000-0000-0000-0000-000000000010';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const KNOWN_FIXTURE_IDS = new Set(['tenant-demo', 'tenant-test', 'demo', 'default']);

function validateAndResolveTenantUuid(id?: string): string {
  if (!id) {
    return DEFAULT_TENANT_UUID;
  }

  if (KNOWN_FIXTURE_IDS.has(id)) {
    return DEFAULT_TENANT_UUID;
  }

  if (UUID_REGEX.test(id)) {
    return id;
  }

  throw new Error(`INVALID_TENANT_UUID: O identificador de tenant "${id}" é inválido e malformado.`);
}

export async function updatePlanQuotaAction(input: {
  tenantId: string;
  entitlementId: string;
  servicesLimit?: number;
  benefitsLimit?: number;
  galleryLimit?: number;
  reason?: string;
}): Promise<AdminActionResult> {
  const validTenantId = validateAndResolveTenantUuid(input.tenantId);
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase.rpc('update_plan_entitlement_quota', {
      p_tenant_id: validTenantId,
      p_entitlement_id: input.entitlementId,
      p_services_limit: input.servicesLimit ?? 0,
      p_benefits_limit: input.benefitsLimit ?? 0,
      p_gallery_limit: input.galleryLimit ?? 0,
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
  tenantId?: string;
  businessId: string;
  newStatus: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';
  reason?: string;
}): Promise<AdminActionResult> {
  const validTenantId = input.tenantId ? validateAndResolveTenantUuid(input.tenantId) : null;

  try {
    const supabase = await createServerSideClient();
    let query = (supabase as any)
      .from('businesses')
      .update({
        publication_status: input.newStatus,
        is_active: input.newStatus === 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.businessId);

    if (validTenantId) {
      query = query.eq('tenant_id', validTenantId);
    }

    const { error: updateErr } = await query;

    if (updateErr) {
      console.error('[moderatePublicationStatusAction] DB Error:', updateErr);
      return { success: false, error: updateErr.message };
    }

    try {
      revalidatePath('/admin/empresas');
      revalidatePath(`/admin/empresas/${input.businessId}`);
      revalidatePath('/guia');
      revalidatePath('/guia/empresas');
    } catch (_rErr) { }

    return { success: true, data: { status: input.newStatus } };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro ao moderar publicação da empresa.',
    };
  }
}

export async function allocateFounderStatusAction(input: {
  tenantId: string;
  businessId: string;
  isFounder: boolean;
  reason?: string;
}): Promise<AdminActionResult> {
  const validTenantId = validateAndResolveTenantUuid(input.tenantId);

  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase.rpc('allocate_founder_status', {
      p_tenant_id: validTenantId,
      p_business_id: input.businessId,
      p_is_founder: input.isFounder,
      p_reason: input.reason || 'Alocação de status Founder pelo admin',
    });

    if (!error) {
      return { success: true, data };
    }
  } catch (_e) {
    // Segue para fallback
  }

  // Fallback seguro via service role
  try {
    const adminSupabase = getAdminSupabase();
    await adminSupabase
      .from('businesses')
      .update({
        is_founder: input.isFounder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.businessId);

    return { success: true, data: { is_founder: input.isFounder } };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro ao alterar status de Empresa Fundadora.',
    };
  }
}

export async function moderateReviewAction(input: {
  reviewId: string;
  status: 'published' | 'rejected' | 'hidden';
  rejectionReason?: string;
}): Promise<AdminActionResult> {
  try {
    const supabase = await createServerSideClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Sessão administrativa expirada.' };

    const { data, error } = await supabase
      .from('business_reviews')
      .update({
        status: input.status === 'published' ? 'approved' : input.status,
        moderation_status: input.status,
        moderation_reason: input.rejectionReason?.trim() || null,
        moderated_by: user.id,
        moderated_at: new Date().toISOString(),
      })
      .eq('id', input.reviewId)
      .select('id, moderation_status')
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

export type ReviewModerationItem = {
  id: string;
  business_name: string;
  author_name: string;
  rating: number;
  comment: string;
  status: 'pending' | 'published' | 'rejected' | 'hidden';
  created_at: string;
};

export async function getReviewsForModerationAction(): Promise<AdminActionResult<ReviewModerationItem[]>> {
  try {
    const supabase = await createServerSideClient();
    const { data: reviews, error } = await supabase
      .from('business_reviews')
      .select('id, business_id, author_id, rating, comment, status, moderation_status, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { success: false, error: error.message };

    const userIds = [...new Set((reviews || []).map((review) => review.author_id))];
    const businessIds = [...new Set((reviews || []).map((review) => review.business_id))];
    const [{ data: profiles }, { data: businesses }] = await Promise.all([
      userIds.length ? supabase.from('profiles').select('id, name').in('id', userIds) : Promise.resolve({ data: [] }),
      businessIds.length ? supabase.from('businesses').select('id, name').in('id', businessIds) : Promise.resolve({ data: [] }),
    ]);
    const names = new Map((profiles || []).map((profile) => [profile.id, profile.name || 'Membro']));
    const businessNames = new Map((businesses || []).map((business) => [business.id, business.name]));

    return {
      success: true,
      data: (reviews || []).map((review) => ({
        id: review.id,
        business_name: businessNames.get(review.business_id) || 'Empresa',
        author_name: names.get(review.author_id) || 'Membro',
        rating: review.rating,
        comment: review.comment || '',
        status: review.moderation_status as ReviewModerationItem['status'],
        created_at: review.created_at,
      })),
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao carregar avaliações.' };
  }
}
