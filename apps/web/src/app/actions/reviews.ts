'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limiter';

import { ratingSummarySchema } from '@saas/core';

export interface SubmitReviewInput {
  businessSlug: string;
  rating: number;
  comment: string;
  isAnonymous?: boolean;
}

export interface ReviewActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  requiresLogin?: boolean;
}

export async function submitBusinessReviewAction(
  input: SubmitReviewInput
): Promise<ReviewActionResult> {
  try {
    const businessSlug = input.businessSlug?.trim().toLowerCase();
    const comment = input.comment?.trim();
    const rating = Number(input.rating);

    if (!businessSlug || businessSlug.length > 160) {
      return { success: false, error: 'Empresa inválida.' };
    }
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return { success: false, error: 'Escolha uma nota de 1 a 5 estrelas.' };
    }
    if (!comment || comment.length < 10 || comment.length > 1000) {
      return { success: false, error: 'Escreva um comentário entre 10 e 1.000 caracteres.' };
    }

    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, requiresLogin: true, error: 'Entre na sua conta para avaliar esta empresa.' };
    }

    const { data: business, error: businessError } = await supabase
      .from('businesses')
      .select('id, tenant_id, owner_id, is_active, publication_status')
      .eq('slug', businessSlug)
      .eq('is_active', true)
      .eq('publication_status', 'published')
      .maybeSingle();

    if (businessError || !business) {
      return { success: false, error: 'Empresa não encontrada ou indisponível para avaliações.' };
    }
    if (business.owner_id === user.id) {
      return { success: false, error: 'O responsável não pode avaliar a própria empresa.' };
    }

    const { data: membership } = await supabase
      .from('business_members')
      .select('id')
      .eq('business_id', business.id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (membership) {
      return { success: false, error: 'Integrantes da empresa não podem avaliá-la.' };
    }

    const rateCheck = await checkRateLimit('reviews', user.id, business.tenant_id);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Muitas tentativas recentes. Aguarde um instante e tente novamente.' };
    }

    const { data: existing } = await supabase
      .from('business_reviews')
      .select('id, status')
      .eq('tenant_id', business.tenant_id)
      .eq('business_id', business.id)
      .eq('author_id', user.id)
      .maybeSingle();

    if (existing && existing.status !== 'pending') {
      return { success: false, error: 'Você já enviou uma avaliação para esta empresa.' };
    }

    const reviewData = {
      tenant_id: business.tenant_id,
      business_id: business.id,
      author_id: user.id,
      rating,
      comment,
      is_anonymous: input.isAnonymous === true,
      author_avatar_url: (() => {
        const candidate = user.user_metadata?.avatar_url || user.user_metadata?.picture;
        if (typeof candidate !== 'string') return null;
        try {
          const url = new URL(candidate);
          return url.protocol === 'https:' ? url.toString().slice(0, 2048) : null;
        } catch {
          return null;
        }
      })(),
      status: 'pending',
      updated_at: new Date().toISOString(),
    };

    const mutation = existing
      ? supabase.from('business_reviews').update(reviewData).eq('id', existing.id)
      : supabase.from('business_reviews').insert(reviewData);
    const { error } = await mutation;

    if (error) {
      return { success: false, error: 'Não foi possível enviar a avaliação. Tente novamente.' };
    }

    revalidatePath(`/guia/${businessSlug}`);
    return { success: true };
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

    if (error) return { success: false, error: error.message };
    const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown> | null;
    const summary = ratingSummarySchema.parse({
      averageRating: Number(row?.average_rating ?? 0),
      totalApprovedReviews: Number(row?.total_approved_reviews ?? 0),
    });
    return { success: true, data: summary };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao buscar resumo de avaliações.' };
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
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao buscar avaliações.' };
  }
}
