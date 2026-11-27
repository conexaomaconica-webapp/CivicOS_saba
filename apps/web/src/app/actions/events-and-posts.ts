'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { createServerSideClient } from '@/lib/supabase/server';
import { getCanonicalDefaultLimit } from '@/lib/billing/plans-service';
import type { Database } from '@/types/database.types';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

async function resolveEventsPostsWriteContext(businessId: string) {
  const supabase = await createServerSideClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: 'Usuário não autenticado.' };
  }

  let isPlatformAdmin = false;
  try {
    const { data: rpcIsAdmin } = await (supabase as any).rpc('has_platform_admin_access');
    isPlatformAdmin = Boolean(rpcIsAdmin);
  } catch {
    isPlatformAdmin = false;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbClient: any =
    isPlatformAdmin && supabaseUrl && serviceRoleKey
      ? createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

  const { data: biz, error: bizError } = await dbClient
    .from('businesses')
    .select('id, slug, owner_id, tenant_id, plan_tier')
    .eq('id', businessId)
    .maybeSingle();

  if (bizError || !biz) {
    return { error: 'Empresa não encontrada.' };
  }

  let planCode: string | null = null;
  try {
    const { data: effPlan } = await dbClient.rpc('_effective_business_plan', {
      p_tenant_id: biz.tenant_id,
      p_business_id: biz.id,
    });
    planCode = Array.isArray(effPlan) && effPlan[0]?.plan_code ? String(effPlan[0].plan_code) : null;
  } catch {
    planCode = null;
  }

  if (!planCode || planCode === 'none') {
    const rawTier = String(biz.plan_tier || 'acacia').toLowerCase().trim();
    planCode =
      rawTier === 'acacia' || rawTier === 'acácia' || rawTier === 'ouro' || rawTier === 'ouro_founder'
        ? 'acacia'
        : rawTier === 'compasso' || rawTier === 'prata'
          ? 'compasso'
          : 'esquadro';
  }

  return {
    dbClient,
    user,
    biz,
    planCode,
    isPlatformAdmin,
  };
}

function revalidateBusinessEventsAndPostsPaths(businessId: string, slug?: string | null) {
  revalidatePath(`/admin/empresas/${businessId}`);
  if (slug) {
    revalidatePath(`/guia/${slug}`);
  }
  revalidatePath('/guia/[slug]', 'page');
  revalidatePath('/guia', 'layout');
  revalidateTag('public-business-detail');
}

export async function getBusinessEntitlementQuotaAction(
  tenantId: string,
  businessId: string,
  featureCode: 'events_limit' | 'posts_limit'
): Promise<ActionResponse<{ maxLimit: number; currentCount: number }>> {
  try {
    const supabase = await createServerSideClient();

    // 1. Resolve o plano efetivo via RPC canônica _effective_business_plan
    const { data: effPlan, error: effErr } = await supabase.rpc('_effective_business_plan', {
      p_tenant_id: tenantId,
      p_business_id: businessId,
    });

    if (effErr || !effPlan || effPlan.length === 0) {
      return {
        success: false,
        error: 'Nenhuma assinatura/plano ativo foi encontrado para esta empresa.',
      };
    }

    const planCode = effPlan[0]?.plan_code;
    if (!planCode) {
      return {
        success: false,
        error: 'Nenhuma assinatura/plano ativo foi encontrado para esta empresa.',
      };
    }

    // 2. Busca o entitlement dinâmico
    const { data: entitlement } = await supabase
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', tenantId)
      .eq('plan_code', planCode)
      .eq('feature_code', featureCode)
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? getCanonicalDefaultLimit(planCode, featureCode);

    const table = featureCode === 'events_limit' ? 'business_events' : 'business_posts';
    const { count } = await supabase
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .eq('publication_status', 'published');

    return {
      success: true,
      data: {
        maxLimit,
        currentCount: count || 0,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao consultar cota.',
    };
  }
}

export async function createBusinessEventAction(input: {
  id?: string;
  tenantId: string;
  businessId: string;
  title: string;
  description?: string;
  startsAt: string;
  endsAt?: string;
  timezone?: string;
  locationName?: string;
  address?: string;
  externalTicketUrl?: string;
  coverImageUrl?: string;
  publicationStatus?: 'draft' | 'published' | 'canceled' | 'archived';
}): Promise<ActionResponse> {
  try {
    const ctx = await resolveEventsPostsWriteContext(input.businessId);
    if ('error' in ctx) {
      return { success: false, error: ctx.error };
    }
    const { dbClient, biz, planCode } = ctx;
    const tenantId = biz.tenant_id || input.tenantId;

    // Se for alteração (update) de evento existente
    if (input.id) {
      const { data, error } = await dbClient
        .from('business_events')
        .update({
          title: input.title,
          description: input.description || null,
          starts_at: input.startsAt,
          ends_at: input.endsAt || null,
          timezone: input.timezone || 'America/Sao_Paulo',
          location_name: input.locationName || null,
          address: input.address || null,
          external_ticket_url: input.externalTicketUrl || null,
          cover_image_url: input.coverImageUrl || null,
          publication_status: input.publicationStatus || 'published',
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('business_id', input.businessId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      revalidateBusinessEventsAndPostsPaths(input.businessId, biz.slug);
      return { success: true, data };
    }

    // 3. Busca limite dinâmico em plan_entitlements
    const { data: entitlement } = await dbClient
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', tenantId)
      .eq('plan_code', planCode)
      .eq('feature_code', 'events_limit')
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? getCanonicalDefaultLimit(planCode, 'events_limit');

    if (maxLimit <= 0) {
      return {
        success: false,
        error: `Seu plano não possui permissão para publicar eventos. Faça upgrade para o Plano Acácia.`,
      };
    }

    // 4. Conta eventos publicados ativos para esta empresa (mesma semântica do trigger Postgres)
    const targetStatus = input.publicationStatus || 'published';
    if (targetStatus === 'published') {
      const { count } = await dbClient
        .from('business_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('business_id', input.businessId)
        .eq('is_active', true)
        .eq('publication_status', 'published');

      if ((count || 0) >= maxLimit) {
        return {
          success: false,
          error: `Limite de eventos atingido (${count}/${maxLimit}). Cancele ou arquive um evento para criar outro.`,
        };
      }
    }

    // 5. Validação temporal
    if (input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
      return {
        success: false,
        error: 'A data/horário de término deve ser posterior ao início do evento.',
      };
    }

    // 6. Insere registro do evento no Postgres
    const { data, error } = await dbClient
      .from('business_events')
      .insert({
        tenant_id: tenantId,
        business_id: input.businessId,
        title: input.title,
        description: input.description || null,
        starts_at: input.startsAt,
        ends_at: input.endsAt || null,
        timezone: input.timezone || 'America/Sao_Paulo',
        location_name: input.locationName || null,
        address: input.address || null,
        external_ticket_url: input.externalTicketUrl || null,
        cover_image_url: input.coverImageUrl || null,
        publication_status: targetStatus,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateBusinessEventsAndPostsPaths(input.businessId, biz.slug);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao criar evento.',
    };
  }
}

export async function updateBusinessEventStatusAction(input: {
  eventId: string;
  status: 'draft' | 'published' | 'canceled' | 'archived';
}): Promise<ActionResponse> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase
      .from('business_events')
      .update({
        publication_status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.eventId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar status do evento.',
    };
  }
}

export async function createBusinessPostAction(input: {
  id?: string;
  tenantId: string;
  businessId: string;
  title: string;
  summary?: string;
  content: string;
  publishedAt?: string;
  coverImageUrl?: string;
  publicationStatus?: 'draft' | 'scheduled' | 'published' | 'archived';
}): Promise<ActionResponse> {
  try {
    const ctx = await resolveEventsPostsWriteContext(input.businessId);
    if ('error' in ctx) {
      return { success: false, error: ctx.error };
    }
    const { dbClient, biz, planCode } = ctx;
    const tenantId = biz.tenant_id || input.tenantId;

    // Se for alteração (update) de post existente
    if (input.id) {
      const { data, error } = await dbClient
        .from('business_posts')
        .update({
          title: input.title,
          summary: input.summary || null,
          content: input.content,
          cover_image_url: input.coverImageUrl || null,
          publication_status: input.publicationStatus || 'published',
          published_at: input.publishedAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', input.id)
        .eq('business_id', input.businessId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }
      revalidateBusinessEventsAndPostsPaths(input.businessId, biz.slug);
      return { success: true, data };
    }

    // 3. Busca limite dinâmico em plan_entitlements
    const { data: entitlement } = await dbClient
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', tenantId)
      .eq('plan_code', planCode)
      .eq('feature_code', 'posts_limit')
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? getCanonicalDefaultLimit(planCode, 'posts_limit');

    if (maxLimit <= 0) {
      return {
        success: false,
        error: `Seu plano não possui permissão para publicar novidades. Faça upgrade para o Plano Acácia.`,
      };
    }

    // 4. Conta posts publicados ativos para esta empresa (mesma semântica do trigger Postgres)
    const targetStatus = input.publicationStatus || 'published';
    if (targetStatus === 'published') {
      const { count } = await dbClient
        .from('business_posts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('business_id', input.businessId)
        .eq('is_active', true)
        .eq('publication_status', 'published');

      if ((count || 0) >= maxLimit) {
        return {
          success: false,
          error: `Limite de posts atingido (${count}/${maxLimit}). Arquive um post para criar outro.`,
        };
      }
    }

    const { data, error } = await dbClient
      .from('business_posts')
      .insert({
        tenant_id: tenantId,
        business_id: input.businessId,
        title: input.title,
        summary: input.summary || null,
        content: input.content,
        cover_image_url: input.coverImageUrl || null,
        published_at: input.publishedAt || new Date().toISOString(),
        publication_status: targetStatus,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidateBusinessEventsAndPostsPaths(input.businessId, biz.slug);
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao criar publicação.',
    };
  }
}

export async function updateBusinessPostStatusAction(input: {
  postId: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
}): Promise<ActionResponse> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await supabase
      .from('business_posts')
      .update({
        publication_status: input.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.postId)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao atualizar status da publicação.',
    };
  }
}

export const upsertBusinessEventAction = createBusinessEventAction;
export const upsertBusinessPostAction = createBusinessPostAction;

export async function deleteBusinessEventAction(input: { eventId: string; businessId: string }): Promise<ActionResponse> {
  try {
    const ctx = await resolveEventsPostsWriteContext(input.businessId);
    if ('error' in ctx) {
      return { success: false, error: ctx.error };
    }
    const { dbClient, biz } = ctx;
    const { error } = await dbClient
      .from('business_events')
      .delete()
      .eq('id', input.eventId)
      .eq('business_id', input.businessId);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidateBusinessEventsAndPostsPaths(input.businessId, biz.slug);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao excluir evento.' };
  }
}

export async function deleteBusinessPostAction(input: { postId: string; businessId: string }): Promise<ActionResponse> {
  try {
    const ctx = await resolveEventsPostsWriteContext(input.businessId);
    if ('error' in ctx) {
      return { success: false, error: ctx.error };
    }
    const { dbClient, biz } = ctx;
    const { error } = await dbClient
      .from('business_posts')
      .delete()
      .eq('id', input.postId)
      .eq('business_id', input.businessId);

    if (error) {
      return { success: false, error: error.message };
    }
    revalidateBusinessEventsAndPostsPaths(input.businessId, biz.slug);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao excluir publicação.' };
  }
}
