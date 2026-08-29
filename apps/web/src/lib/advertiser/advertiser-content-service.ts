'use server';

import { createServerSideClient } from '@/lib/supabase/server';

export type ContentStatus = 'published' | 'under_review' | 'draft' | 'inactive' | 'expired';

export interface AdvertiserServiceItem {
  id: string;
  title: string;
  description: string;
  icon_name?: string;
  price_info?: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
}

export interface AdvertiserBenefitItem {
  id: string;
  title: string;
  description: string;
  benefit_type?: string;
  discount_condition?: string;
  expiration_date?: string;
  rules?: string;
  promo_code?: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
}

export interface AdvertiserEventItem {
  id: string;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url?: string;
  cta_link?: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
  is_expired?: boolean;
}

export interface AdvertiserPostItem {
  id: string;
  title: string;
  content: string;
  image_url?: string;
  published_at: string;
  is_active: boolean;
  status: ContentStatus;
  status_label: string;
}

export interface DbServiceRow {
  id: string;
  name: string;
  description: string | null;
  icon_name: string | null;
  price_info: string | null;
  is_active: boolean | null;
}

export interface DbBenefitRow {
  id: string;
  title: string;
  description: string | null;
  benefit_type: string | null;
  discount_percentage: number | null;
  discount_amount: number | null;
  discount_code: string | null;
  redeem_instructions: string | null;
  valid_until: string | null;
  is_active: boolean | null;
}

export interface DbEventRow {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  location_name: string | null;
  cover_image_url: string | null;
  external_ticket_url: string | null;
  is_active: boolean | null;
  publication_status: string | null;
}

export interface DbPostRow {
  id: string;
  title: string;
  content: string;
  cover_image_url: string | null;
  published_at: string;
  is_active: boolean | null;
  publication_status: string | null;
}

export interface AdvertiserContentDTO {
  business: {
    id: string;
    name: string;
    slug: string | null;
    plan_code: string;
    plan_name: string;
  };
  quotas: {
    services_used: number;
    services_limit: number;
    benefits_used: number;
    benefits_limit: number;
    events_used: number;
    events_limit: number;
    posts_used: number;
    posts_limit: number;
  };
  services: AdvertiserServiceItem[];
  benefits: AdvertiserBenefitItem[];
  events: AdvertiserEventItem[];
  posts: AdvertiserPostItem[];
}

/**
 * Carrega todos os conteúdos e cotas reais do anunciante direto do Supabase.
 * Sem mocks, sem fallbacks fictícios em caso de banco vazio.
 */
export async function getAdvertiserContentDataAction(): Promise<AdvertiserContentDTO> {
  const supabase = await createServerSideClient();
  const { data: userRes, error: authError } = await supabase.auth.getUser();

  if (authError || !userRes?.user) {
    throw new Error('Sessão expirada ou usuário não autenticado.');
  }

  // 1. Resolve a empresa do usuário autenticado
  const { data: b, error: bizError } = await supabase
    .from('businesses')
    .select('id, name, slug, tenant_id')
    .eq('owner_id', userRes.user.id)
    .maybeSingle();

  if (bizError || !b) {
    throw new Error('Nenhuma empresa encontrada para a conta de anunciante conectada.');
  }

  const businessId = b.id;
  const tenantId = b.tenant_id;

  // 2. Resolve plano efetivo via _effective_business_plan
  const { data: effPlan } = await supabase.rpc('_effective_business_plan', {
    p_tenant_id: tenantId,
    p_business_id: businessId,
  });

  const activePlanCode = effPlan?.[0]?.plan_code || 'none';

  // 3. Resolve cotas em plan_entitlements para o plano e tenant da empresa
  const { data: entitlements } = await supabase
    .from('plan_entitlements')
    .select('feature_code, max_limit')
    .eq('tenant_id', tenantId)
    .eq('plan_code', activePlanCode);

  const entMap: Record<string, number> = {};
  (entitlements || []).forEach((e) => {
    entMap[e.feature_code] = e.max_limit;
  });

  // 4. Carrega serviços reais do Postgres
  const { data: dbServices, error: errServices } = await (supabase as any)
    .from('business_services')
    .select('id, name, description, icon_name, price_info, is_active')
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (errServices) {
    throw new Error(`Erro ao carregar serviços do banco: ${errServices.message}`);
  }

  // 5. Carrega benefícios reais do Postgres
  const { data: dbBenefits, error: errBenefits } = await (supabase as any)
    .from('business_benefits')
    .select('id, title, description, benefit_type, discount_percentage, discount_amount, discount_code, redeem_instructions, valid_until, is_active')
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (errBenefits) {
    throw new Error(`Erro ao carregar benefícios do banco: ${errBenefits.message}`);
  }

  // 6. Carrega eventos reais do Postgres
  const { data: dbEvents, error: errEvents } = await (supabase as any)
    .from('business_events')
    .select('id, title, description, starts_at, location_name, cover_image_url, external_ticket_url, is_active, publication_status')
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (errEvents) {
    throw new Error(`Erro ao carregar eventos do banco: ${errEvents.message}`);
  }

  // 7. Carrega posts reais do Postgres
  const { data: dbPosts, error: errPosts } = await (supabase as any)
    .from('business_posts')
    .select('id, title, content, cover_image_url, published_at, is_active, publication_status')
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (errPosts) {
    throw new Error(`Erro ao carregar publicações do banco: ${errPosts.message}`);
  }

  // Mapeamento estrito sem mocks
  const services: AdvertiserServiceItem[] = ((dbServices as DbServiceRow[]) || []).map((s: DbServiceRow) => ({
    id: s.id,
    title: s.name,
    description: s.description || '',
    icon_name: s.icon_name || undefined,
    price_info: s.price_info || undefined,
    is_active: Boolean(s.is_active),
    status: s.is_active ? 'published' : 'inactive',
    status_label: s.is_active ? 'Publicado' : 'Inativo',
  }));

  const benefits: AdvertiserBenefitItem[] = ((dbBenefits as DbBenefitRow[]) || []).map((ben: DbBenefitRow) => ({
    id: ben.id,
    title: ben.title,
    description: ben.description || '',
    benefit_type: ben.benefit_type || undefined,
    discount_condition: ben.discount_percentage ? `${ben.discount_percentage}% OFF` : ben.benefit_type || 'Benefício Exclusivo',
    expiration_date: ben.valid_until ? new Date(ben.valid_until).toLocaleDateString('pt-BR') : undefined,
    rules: ben.redeem_instructions || undefined,
    promo_code: ben.discount_code || undefined,
    is_active: Boolean(ben.is_active),
    status: ben.is_active ? 'published' : 'inactive',
    status_label: ben.is_active ? 'Publicado' : 'Inativo',
  }));

  const events: AdvertiserEventItem[] = ((dbEvents as DbEventRow[]) || []).map((e: DbEventRow) => {
    const isPast = new Date(e.starts_at) < new Date();
    return {
      id: e.id,
      title: e.title,
      description: e.description || '',
      event_date: new Date(e.starts_at).toLocaleString('pt-BR'),
      location: e.location_name || 'A definir',
      image_url: e.cover_image_url || undefined,
      cta_link: e.external_ticket_url || undefined,
      is_active: Boolean(e.is_active),
      status: isPast ? 'expired' : (e.is_active ? 'published' : 'inactive'),
      status_label: isPast ? 'Encerrado' : (e.is_active ? 'Publicado' : 'Inativo'),
      is_expired: isPast,
    };
  });

  const posts: AdvertiserPostItem[] = ((dbPosts as DbPostRow[]) || []).map((p: DbPostRow) => ({
    id: p.id,
    title: p.title,
    content: p.content,
    image_url: p.cover_image_url || undefined,
    published_at: new Date(p.published_at).toLocaleDateString('pt-BR'),
    is_active: Boolean(p.is_active),
    status: p.is_active ? 'published' : 'inactive',
    status_label: p.is_active ? 'Publicado' : 'Inativo',
  }));

  return {
    business: {
      id: businessId,
      name: b.name,
      slug: b.slug,
      plan_code: activePlanCode,
      plan_name: activePlanCode === 'ouro' ? 'Plano Ouro' : activePlanCode === 'prata' ? 'Plano Prata' : 'Plano Bronze',
    },
    quotas: {
      services_used: services.filter((s) => s.is_active).length,
      services_limit: entMap['services_limit'] ?? 0,
      benefits_used: benefits.filter((b) => b.is_active).length,
      benefits_limit: entMap['benefits_limit'] ?? 0,
      events_used: events.filter((e) => e.is_active).length,
      events_limit: entMap['events_limit'] ?? 0,
      posts_used: posts.filter((p) => p.is_active).length,
      posts_limit: entMap['posts_limit'] ?? 0,
    },
    services,
    benefits,
    events,
    posts,
  };
}

// ----------------------------------------------------------------------
// SERVER ACTIONS: SERVIÇOS
// ----------------------------------------------------------------------
export async function saveAdvertiserServiceAction(
  service: Partial<AdvertiserServiceItem> & { business_id: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('tenant_id')
      .eq('id', service.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, message: 'Empresa não encontrada.' };
    }

    if (!service.id) {
      const { error } = await (supabase as any)
        .from('business_services')
        .insert({
          business_id: service.business_id,
          tenant_id: biz.tenant_id,
          name: (service.title || '').trim(),
          description: service.description?.trim() || null,
          icon_name: service.icon_name || null,
          price_info: service.price_info || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        return { success: false, message: error.message };
      }

      return {
        success: true,
        message: 'Novo serviço cadastrado e publicado com sucesso no Guia!',
      };
    }

    const { error } = await (supabase as any)
      .from('business_services')
      .update({
        name: (service.title || '').trim(),
        description: service.description?.trim() || null,
        icon_name: service.icon_name || null,
        price_info: service.price_info || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', service.id)
      .eq('business_id', service.business_id);

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'Serviço atualizado com sucesso!',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro interno ao salvar serviço.',
    };
  }
}

export async function toggleServiceActiveAction(
  serviceId: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { error } = await (supabase as any)
      .from('business_services')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', serviceId);

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: isActive ? 'Serviço reativado e publicado no Guia.' : 'Serviço inativado temporariamente.',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro ao alterar status do serviço.',
    };
  }
}

// ----------------------------------------------------------------------
// SERVER ACTIONS: BENEFÍCIOS
// ----------------------------------------------------------------------
export async function saveAdvertiserBenefitAction(
  benefit: Partial<AdvertiserBenefitItem> & { business_id: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('tenant_id')
      .eq('id', benefit.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, message: 'Empresa não encontrada.' };
    }

    if (!benefit.id) {
      const { error } = await (supabase as any)
        .from('business_benefits')
        .insert({
          business_id: benefit.business_id,
          tenant_id: biz.tenant_id,
          title: (benefit.title || '').trim(),
          description: (benefit.description || '').trim(),
          benefit_type: benefit.benefit_type || 'special_condition',
          discount_code: benefit.promo_code || null,
          redeem_instructions: benefit.rules || null,
          is_active: true,
        });

      if (error) {
        return { success: false, message: error.message };
      }
    } else {
      const { error } = await (supabase as any)
        .from('business_benefits')
        .update({
          title: (benefit.title || '').trim(),
          description: (benefit.description || '').trim(),
          benefit_type: benefit.benefit_type || 'special_condition',
          discount_code: benefit.promo_code || null,
          redeem_instructions: benefit.rules || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', benefit.id)
        .eq('business_id', benefit.business_id);

      if (error) {
        return { success: false, message: error.message };
      }
    }

    return {
      success: true,
      message: 'Oferta Fraterna salva com sucesso!',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro interno ao salvar benefício.',
    };
  }
}

import {
  createBusinessEventAction,
  createBusinessPostAction,
} from '@/app/actions/events-and-posts';

// ----------------------------------------------------------------------
// SERVER ACTIONS: EVENTOS & POSTS (Delegando para autoridade canônica)
// ----------------------------------------------------------------------
export async function saveAdvertiserEventAction(
  event: Partial<AdvertiserEventItem> & { business_id: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('tenant_id')
      .eq('id', event.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, message: 'Empresa não encontrada.' };
    }

    const res = await createBusinessEventAction({
      id: event.id,
      tenantId: biz.tenant_id,
      businessId: event.business_id,
      title: (event.title || '').trim(),
      description: event.description?.trim() || undefined,
      startsAt: event.event_date || new Date().toISOString(),
      locationName: event.location || undefined,
      externalTicketUrl: event.cta_link || undefined,
      coverImageUrl: event.image_url || undefined,
    });

    if (!res.success) {
      return { success: false, message: res.error || 'Erro ao salvar evento.' };
    }

    return {
      success: true,
      message: 'Evento salvo com sucesso!',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro ao salvar evento.',
    };
  }
}

export async function saveAdvertiserPostAction(
  post: Partial<AdvertiserPostItem> & { business_id: string }
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await createServerSideClient();
    const { data: biz, error: bizErr } = await supabase
      .from('businesses')
      .select('tenant_id')
      .eq('id', post.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, message: 'Empresa não encontrada.' };
    }

    const res = await createBusinessPostAction({
      id: post.id,
      tenantId: biz.tenant_id,
      businessId: post.business_id,
      title: (post.title || '').trim(),
      content: (post.content || '').trim(),
      publishedAt: post.published_at || new Date().toISOString(),
      coverImageUrl: post.image_url || undefined,
    });

    if (!res.success) {
      return { success: false, message: res.error || 'Erro ao salvar publicação.' };
    }

    return {
      success: true,
      message: 'Publicação registrada com sucesso!',
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro ao salvar publicação.',
    };
  }
}
