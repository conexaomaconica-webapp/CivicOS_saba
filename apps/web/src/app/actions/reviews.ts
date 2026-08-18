'use server';

import { createServerSideClient } from '@/lib/supabase/server';

import { ratingSummarySchema } from '@saas/core';

export interface SubmitReviewInput {
  tenantId: string;
  businessId: string;
  rating: number;
  comment?: string;
}

export interface ReviewActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function submitBusinessReviewAction(
  input: SubmitReviewInput
): Promise<ReviewActionResult> {
  try {
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // Double Anti-Self-Evaluation Check (Server-side)
    const { data: business, error: bizError } = await supabase
      .from('business_profiles')
      .select('owner_id')
      .eq('id', input.businessId)
      .single();

    if (bizError || !business) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    if (business.owner_id === user.id) {
      return {
        success: false,
        error: 'Anunciantes e proprietários não podem avaliar a própria empresa.',
      };
    }

    // Check if user is a member
    const { data: isMember } = await supabase
      .from('business_members')
      .select('id')
      .eq('business_id', input.businessId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (isMember) {
      return {
        success: false,
        error: 'Membros do estabelecimento não podem avaliar a própria empresa.',
      };
    }

    // Insert or Update review (1 review per author/business constraint)
    const { data, error } = await supabase
      .from('business_reviews')
      .upsert(
        {
          tenant_id: input.tenantId,
          business_id: input.businessId,
          author_id: user.id,
          rating: input.rating,
          comment: input.comment || null,
          status: 'pending', // Reviews ALWAYS start as pending
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'tenant_id,business_id,author_id',
        }
      )
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro interno ao enviar avaliação.',
    };
  }
}

export async function getBusinessRatingSummaryAction(
  tenantId: string,
  businessId: string
): Promise<ReviewActionResult<{ averageRating: number; totalApprovedReviews: number }>> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase.rpc('get_business_rating_summary', {
      p_tenant_id: tenantId,
      p_business_id: businessId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const row = (Array.isArray(data) ? data[0] : data) as Record<string, any> | null;
    const summary = ratingSummarySchema.parse({
      averageRating: Number(row?.average_rating ?? 0),
      totalApprovedReviews: Number(row?.total_approved_reviews ?? 0),
    });

    return { success: true, data: summary };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao buscar resumo de avaliações.',
    };
  }
}

export async function getApprovedBusinessReviewsAction(
  tenantId: string,
  businessId: string
): Promise<ReviewActionResult> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase
      .from('business_reviews')
      .select('id, rating, comment, created_at, author_id')
      .eq('tenant_id', tenantId)
      .eq('business_id', businessId)
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao buscar avaliações.',
    };
  }
}
