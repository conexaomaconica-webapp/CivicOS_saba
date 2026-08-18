'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export interface ActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function getBusinessEntitlementQuotaAction(
  tenantId: string,
  businessId: string,
  featureCode: 'events_limit' | 'posts_limit'
): Promise<ActionResponse<{ maxLimit: number; currentCount: number }>> {
  try {
    const supabase = await createServerSideClient();
    const { data: biz } = await supabase
      .from('business_profiles')
      .select('plan_code')
      .eq('id', businessId)
      .maybeSingle();

    const planCode = biz?.plan_code || 'bronze';

    const { data: entitlement } = await supabase
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', tenantId)
      .eq('plan_code', planCode)
      .eq('feature_code', featureCode)
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? (planCode === 'ouro' ? (featureCode === 'events_limit' ? 5 : 10) : 0);

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
}): Promise<ActionResponse> {
  try {
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // 1. Fetch effective plan for business
    const { data: biz, error: bizError } = await supabase
      .from('business_profiles')
      .select('plan_code, owner_id')
      .eq('id', input.businessId)
      .single();

    if (bizError || !biz) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    // 2. Resolve dynamic entitlement limit for 'events_limit'
    const { data: entitlement } = await supabase
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', input.tenantId)
      .eq('plan_code', biz.plan_code || 'bronze')
      .eq('feature_code', 'events_limit')
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? 0;

    if (maxLimit <= 0) {
      return {
        success: false,
        error: `O plano ${biz.plan_code.toUpperCase()} não possui permissão para publicar eventos. Faça upgrade para o plano Ouro.`,
      };
    }

    // 3. Count active events for this business
    const { count } = await supabase
      .from('business_events')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', input.tenantId)
      .eq('business_id', input.businessId)
      .eq('is_active', true)
      .in('publication_status', ['published', 'draft']);

    if ((count || 0) >= maxLimit) {
      return {
        success: false,
        error: `Limite de eventos atingido (${count}/${maxLimit}). Cancele ou arquive um evento para criar outro.`,
      };
    }

    // 4. Validate temporal checks
    if (input.endsAt && new Date(input.endsAt) <= new Date(input.startsAt)) {
      return {
        success: false,
        error: 'A data/horário de término deve ser posterior ao início do evento.',
      };
    }

    // 5. Insert event record
    const { data, error } = await supabase
      .from('business_events')
      .insert({
        tenant_id: input.tenantId,
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
        publication_status: 'published',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

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
  tenantId: string;
  businessId: string;
  title: string;
  summary?: string;
  content: string;
  publishedAt?: string;
  coverImageUrl?: string;
}): Promise<ActionResponse> {
  try {
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    const { data: biz, error: bizError } = await supabase
      .from('business_profiles')
      .select('plan_code')
      .eq('id', input.businessId)
      .single();

    if (bizError || !biz) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    const { data: entitlement } = await supabase
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', input.tenantId)
      .eq('plan_code', biz.plan_code || 'bronze')
      .eq('feature_code', 'posts_limit')
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? 0;

    if (maxLimit <= 0) {
      return {
        success: false,
        error: `O plano ${biz.plan_code.toUpperCase()} não possui permissão para publicar novidades. Faça upgrade para o plano Ouro.`,
      };
    }

    const { count } = await supabase
      .from('business_posts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', input.tenantId)
      .eq('business_id', input.businessId)
      .eq('is_active', true)
      .in('publication_status', ['published', 'scheduled']);

    if ((count || 0) >= maxLimit) {
      return {
        success: false,
        error: `Limite de posts atingido (${count}/${maxLimit}). Arquive um post para criar outro.`,
      };
    }

    const { data, error } = await supabase
      .from('business_posts')
      .insert({
        tenant_id: input.tenantId,
        business_id: input.businessId,
        title: input.title,
        summary: input.summary || null,
        content: input.content,
        cover_image_url: input.coverImageUrl || null,
        published_at: input.publishedAt || new Date().toISOString(),
        publication_status: 'published',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

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
