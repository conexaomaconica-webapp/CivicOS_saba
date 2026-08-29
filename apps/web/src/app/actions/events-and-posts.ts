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

    const maxLimit = entitlement?.max_limit ?? 0;

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
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // 1. Valida existência da empresa em businesses (tabela canônica)
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('id, owner_id, tenant_id')
      .eq('id', input.businessId)
      .single();

    if (bizError || !biz) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    // 2. Resolve plano efetivo sem fallback silencioso para bronze
    const { data: effPlan, error: effErr } = await supabase.rpc('_effective_business_plan', {
      p_tenant_id: input.tenantId,
      p_business_id: input.businessId,
    });

    if (effErr || !effPlan || effPlan.length === 0) {
      return {
        success: false,
        error: 'Empresa sem plano comercial ativo. Não é possível publicar eventos.',
      };
    }

    const planCode = effPlan[0]?.plan_code;
    if (!planCode) {
      return {
        success: false,
        error: 'Empresa sem plano comercial ativo. Não é possível publicar eventos.',
      };
    }

    // Se for alteração (update) de evento existente
    if (input.id) {
      const { data, error } = await supabase
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
      return { success: true, data };
    }

    // 3. Busca limite dinâmico em plan_entitlements
    const { data: entitlement } = await supabase
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', input.tenantId)
      .eq('plan_code', planCode)
      .eq('feature_code', 'events_limit')
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? 0;

    if (maxLimit <= 0) {
      return {
        success: false,
        error: `O plano ${planCode.toUpperCase()} não possui permissão para publicar eventos. Faça upgrade para o plano Ouro.`,
      };
    }

    // 4. Conta eventos publicados ativos para esta empresa (mesma semântica do trigger Postgres)
    const targetStatus = input.publicationStatus || 'published';
    if (targetStatus === 'published') {
      const { count } = await supabase
        .from('business_events')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenantId)
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
        publication_status: targetStatus,
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
    const supabase = await createServerSideClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'Usuário não autenticado.' };
    }

    // 1. Valida existência da empresa em businesses (tabela canônica)
    const { data: biz, error: bizError } = await supabase
      .from('businesses')
      .select('id, owner_id, tenant_id')
      .eq('id', input.businessId)
      .single();

    if (bizError || !biz) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    // 2. Resolve plano efetivo sem fallback silencioso para bronze
    const { data: effPlan, error: effErr } = await supabase.rpc('_effective_business_plan', {
      p_tenant_id: input.tenantId,
      p_business_id: input.businessId,
    });

    if (effErr || !effPlan || effPlan.length === 0) {
      return {
        success: false,
        error: 'Empresa sem plano comercial ativo. Não é possível publicar novidades.',
      };
    }

    const planCode = effPlan[0]?.plan_code;
    if (!planCode) {
      return {
        success: false,
        error: 'Empresa sem plano comercial ativo. Não é possível publicar novidades.',
      };
    }

    // Se for alteração (update) de post existente
    if (input.id) {
      const { data, error } = await supabase
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
      return { success: true, data };
    }

    // 3. Busca limite dinâmico em plan_entitlements
    const { data: entitlement } = await supabase
      .from('plan_entitlements')
      .select('max_limit')
      .eq('tenant_id', input.tenantId)
      .eq('plan_code', planCode)
      .eq('feature_code', 'posts_limit')
      .maybeSingle();

    const maxLimit = entitlement?.max_limit ?? 0;

    if (maxLimit <= 0) {
      return {
        success: false,
        error: `O plano ${planCode.toUpperCase()} não possui permissão para publicar novidades. Faça upgrade para o plano Ouro.`,
      };
    }

    // 4. Conta posts publicados ativos para esta empresa (mesma semântica do trigger Postgres)
    const targetStatus = input.publicationStatus || 'published';
    if (targetStatus === 'published') {
      const { count } = await supabase
        .from('business_posts')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', input.tenantId)
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
        publication_status: targetStatus,
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
