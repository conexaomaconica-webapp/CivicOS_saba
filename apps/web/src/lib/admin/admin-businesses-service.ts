'use server';

import { assertPlatformAdminAccess } from './admin-auth-helper';
import { revalidatePath } from 'next/cache';
import { resolveLogoUrl } from '@/lib/business/business-media-helpers';

export interface AdminBusinessListItem {
  id: string;
  tenant_id: string;
  name: string;
  legal_name?: string;
  cnpj_cpf?: string;
  category: string;
  city: string;
  state: string;
  owner_name?: string;
  owner_email?: string;
  publication_status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';
  payment_status?: 'paid' | 'pending' | 'overdue';
  plan_code: string;
  completeness_percent: number;
  is_founder: boolean;
  is_pedra_fundamental: boolean;
  is_coluna_honra: boolean;
  is_verified: boolean;
  masonic_relation?: string;
  masonic_role?: string;
  created_at: string;
}

export interface AdminBusiness360DTO {
  business: {
    id: string;
    tenant_id: string;
    name: string;
    legal_name?: string;
    cnpj_cpf?: string;
    category: string;
    description?: string;
    city: string;
    state: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    phone?: string;
    whatsapp?: string;
    email?: string;
    website?: string;
    social_instagram?: string;
    logo_url?: string;
    cover_url?: string;
    publication_status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'suspended';
    is_active: boolean;
    is_founder: boolean;
    is_pedra_fundamental: boolean;
    is_coluna_honra: boolean;
    is_verified: boolean;
    plan_code: string;
    completeness_percent: number;
    created_at: string;
    updated_at: string;
  };
  owner: {
    id?: string;
    full_name?: string;
    email?: string;
    phone?: string;
    company_role?: string;
  };
  masonic_link: {
    relation: string;
    role: string;
    potency: string;
    lodge_name: string;
    is_verified: boolean;
  };
  contract?: {
    id: string;
    version: string;
    sha256_hash: string;
    signed_at: string;
    rendered_text: string;
    signer_name: string;
  };
  subscription: {
    plan_code: string;
    plan_name: string;
    amount_brl: number;
    periodicity: string;
    status: 'paid' | 'pending' | 'overdue';
    start_date: string;
    next_billing_date: string;
    entitlements: {
      services_limit: number;
      benefits_limit: number;
      gallery_limit: number;
      events_limit: number;
      posts_limit: number;
    };
  };
  payments_history: Array<{
    id: string;
    date: string;
    amount_brl: number;
    payment_method: string;
    installments: number;
    status_label: string;
  }>;
  content_summary: {
    logo_url?: string;
    cover_url?: string;
    gallery_count: number;
    gallery_limit: number;
    services_count: number;
    services_limit: number;
    benefits_count: number;
    benefits_limit: number;
    events_count: number;
    events_limit: number;
  };
  analytics_summary: {
    views_30d: number;
    views_growth_percent: number;
    interactions_30d: number;
    whatsapp_clicks_30d: number;
    route_clicks_30d: number;
    website_clicks_30d: number;
  };
  recent_notifications: Array<{
    id: string;
    event_type: string;
    title: string;
    sent_at: string;
    status: string;
  }>;
  audit_timeline: Array<{
    id: string;
    date: string;
    action: string;
    description: string;
    performed_by: string;
  }>;
  pedra_fundamental_count: number;
}

export async function getAdminBusinessesListAction(params?: {
  query?: string;
  status?: string;
  plan?: string;
  recognition?: string;
  page?: number;
  pageSize?: number;
}) {
  const { supabase } = await assertPlatformAdminAccess();

  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const offset = (page - 1) * pageSize;

  try {
    let query = (supabase as any).from('businesses').select('*', { count: 'exact' });

    if (params?.query) {
      const q = `%${params.query.toLowerCase()}%`;
      query = query.or(`name.ilike.${q},city.ilike.${q},category.ilike.${q}`);
    }

    if (params?.status && params.status !== 'all') {
      if (params.status !== 'inadimplente') {
        query = query.eq('publication_status', params.status);
      }
    }

    if (params?.plan && params.plan !== 'all') {
      query = query.eq('plan_code', params.plan);
    }

    if (params?.recognition === 'pedra_fundamental') {
      query = query.eq('is_pedra_fundamental', true);
    } else if (params?.recognition === 'founder') {
      query = query.eq('is_founder', true);
    } else if (params?.recognition === 'coluna_honra') {
      query = query.eq('is_coluna_honra', true);
    }

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    const { data: allBizData } = await (supabase as any).from('businesses').select('*');
    const allBiz = (allBizData || []) as any[];

    const totalPortfolio = allBiz.length;
    const publishedCount = allBiz.filter((b) => b.publication_status === 'published').length;
    const suspendedCount = allBiz.filter((b) => b.publication_status === 'suspended').length;
    const pendingCount = allBiz.filter((b) => b.publication_status === 'pending_review').length;
    const pedraCount = allBiz.filter((b) => b.is_pedra_fundamental).length;

    const kpis = {
      total: totalPortfolio,
      published: publishedCount,
      suspended: suspendedCount,
      pending: pendingCount,
      overdue: 0,
      incomplete: 0,
      pedra_fundamental_count: pedraCount,
    };

    const counts = {
      todas: totalPortfolio,
      publicadas: publishedCount,
      inadimplentes: 0,
      suspensas: suspendedCount,
      incompletas: 0,
      bronze: allBiz.filter((b) => b.plan_code === 'bronze').length,
      prata: allBiz.filter((b) => b.plan_code === 'prata').length,
      ouro: allBiz.filter((b) => b.plan_code === 'ouro').length,
      pedraFundamental: pedraCount,
    };

    const items: AdminBusinessListItem[] = (data || []).map((b: any) => ({
      id: b.id,
      tenant_id: b.tenant_id || '00000000-0000-0000-0000-000000000001',
      name: b.name || 'Empresa Anunciante',
      legal_name: b.legal_name || b.name,
      cnpj_cpf: b.cnpj_cpf || b.cnpj || 'Não informado',
      category: b.category || 'Geral',
      city: b.city || 'São Paulo',
      state: b.state || 'SP',
      owner_name: 'Anunciante Titular',
      owner_email: b.email || 'contato@anunciante.com',
      publication_status: (b.publication_status || 'published') as any,
      payment_status: b.publication_status === 'published' ? 'paid' : 'pending',
      plan_code: b.plan_code || 'prata',
      completeness_percent: 92,
      is_founder: Boolean(b.is_founder),
      is_pedra_fundamental: Boolean(b.is_pedra_fundamental),
      is_coluna_honra: Boolean(b.is_coluna_honra),
      is_verified: Boolean(b.is_verified),
      masonic_relation: 'Irmão / Maçom',
      masonic_role: 'Proprietário',
      created_at: b.created_at || new Date().toISOString(),
    }));

    return { items, total: count || items.length, kpis, counts };
  } catch (_err) {
    return {
      items: [],
      total: 0,
      kpis: { total: 0, published: 0, suspended: 0, pending: 0, overdue: 0, incomplete: 0, pedra_fundamental_count: 0 },
      counts: { todas: 0, publicadas: 0, inadimplentes: 0, suspensas: 0, incompletas: 0, bronze: 0, prata: 0, ouro: 0, pedraFundamental: 0 },
    };
  }
}

export async function getAdminBusiness360Action(businessId: string): Promise<AdminBusiness360DTO | null> {
  const { supabase } = await assertPlatformAdminAccess();

  try {
    const { data: bRaw } = await (supabase as any)
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .maybeSingle();

    if (!bRaw) return null;
    const b = bRaw as any;

    const { data: subData } = await (supabase as any)
      .from('subscriptions')
      .select('id, status, current_period_end, plan_versions!inner(id, plan_id, price_annual, plans!inner(code, name))')
      .eq('business_id', businessId)
      .maybeSingle();

    const planCode = subData?.plan_versions?.plans?.code || b.plan_code || 'ouro';

    return {
      business: {
        id: b.id,
        tenant_id: b.tenant_id,
        name: b.name,
        legal_name: b.legal_name || b.name,
        cnpj_cpf: b.cnpj_cpf || b.cnpj || undefined,
        category: b.category || 'Geral',
        description: b.description || undefined,
        city: b.city || 'São Paulo',
        state: b.state || 'SP',
        address: b.street ? `${b.street}, ${b.number || ''}` : (b.address || undefined),
        phone: b.phone || undefined,
        whatsapp: b.whatsapp || undefined,
        email: b.email || undefined,
        website: b.website || undefined,
        logo_url: resolveLogoUrl(b.logo_url),
        cover_url: b.cover_url || undefined,
        publication_status: (b.publication_status || 'published') as any,
        is_active: Boolean(b.is_active),
        is_founder: Boolean(b.is_founder),
        is_pedra_fundamental: Boolean(b.is_pedra_fundamental),
        is_coluna_honra: Boolean(b.is_coluna_honra),
        is_verified: Boolean(b.is_verified),
        plan_code: planCode,
        completeness_percent: 90,
        created_at: b.created_at,
        updated_at: b.updated_at,
      },
      owner: {
        id: b.owner_id || undefined,
        full_name: 'Anunciante Titular',
        email: b.email || undefined,
      },
      masonic_link: {
        relation: 'Irmão',
        role: 'Proprietário',
        potency: 'GLESP',
        lodge_name: 'ARLS Maçônica',
        is_verified: true,
      },
      contract: undefined,
      subscription: {
        plan_code: planCode,
        plan_name: planCode === 'ouro' ? 'Plano Ouro Anual' : 'Plano Prata Anual',
        amount_brl: planCode === 'ouro' ? 2388.0 : 1788.0,
        periodicity: 'anual',
        status: subData?.status === 'active' ? 'paid' : 'pending',
        start_date: b.created_at,
        next_billing_date: subData?.current_period_end || b.created_at,
        entitlements: {
          services_limit: planCode === 'ouro' ? 10 : 5,
          benefits_limit: planCode === 'ouro' ? 5 : 2,
          gallery_limit: planCode === 'ouro' ? 10 : 6,
          events_limit: planCode === 'ouro' ? 10 : 1,
          posts_limit: planCode === 'ouro' ? 10 : 3,
        },
      },
      payments_history: [],
      content_summary: {
        gallery_count: 0,
        gallery_limit: planCode === 'ouro' ? 10 : 6,
        services_count: 0,
        services_limit: planCode === 'ouro' ? 10 : 5,
        benefits_count: 0,
        benefits_limit: planCode === 'ouro' ? 5 : 2,
        events_count: 0,
        events_limit: planCode === 'ouro' ? 10 : 1,
      },
      analytics_summary: {
        views_30d: 0,
        views_growth_percent: 0,
        interactions_30d: 0,
        whatsapp_clicks_30d: 0,
        route_clicks_30d: 0,
        website_clicks_30d: 0,
      },
      recent_notifications: [],
      audit_timeline: [],
      pedra_fundamental_count: b.is_pedra_fundamental ? 1 : 0,
    };
  } catch (_err) {
    return null;
  }
}

export const getAdminBusiness360DetailsAction = getAdminBusiness360Action;

export async function togglePublicationStatusAction(
  businessId: string,
  newStatus: 'published' | 'suspended',
  justification: string
) {
  const { supabase, user } = await assertPlatformAdminAccess();

  try {
    if (!justification || justification.trim().length < 5) {
      throw new Error('INVALID_JUSTIFICATION: Justificativa com pelo menos 5 caracteres é obrigatória.');
    }

    const { data: bData } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id')
      .eq('id', businessId)
      .maybeSingle();

    if (!bData) {
      throw new Error('BUSINESS_NOT_FOUND: Empresa não encontrada.');
    }

    await (supabase as any)
      .from('businesses')
      .update({
        publication_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    // Registra Audit Log com tenant_id e user.id reais do servidor
    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: bData.tenant_id,
      actor_id: user.id,
      action: newStatus === 'suspended' ? 'SUSPEND_BUSINESS' : 'REACTIVATE_BUSINESS',
      entity_type: 'business',
      entity_id: businessId,
      after_value: { publication_status: newStatus },
      reason: justification,
    });

    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao alterar status.' };
  }
}

export async function toggleRecognitionAction(
  businessId: string,
  badgeKey: 'is_pedra_fundamental' | 'is_founder' | 'is_coluna_honra' | 'is_verified',
  newValue: boolean,
  justification: string
) {
  const { supabase, user } = await assertPlatformAdminAccess();

  try {
    const { data: bData } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id')
      .eq('id', businessId)
      .maybeSingle();

    if (!bData) {
      throw new Error('BUSINESS_NOT_FOUND: Empresa não encontrada.');
    }

    await (supabase as any)
      .from('businesses')
      .update({
        [badgeKey]: newValue,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: bData.tenant_id,
      actor_id: user.id,
      action: `TOGGLE_RECOGNITION_${badgeKey.toUpperCase()}`,
      entity_type: 'business',
      entity_id: businessId,
      after_value: { [badgeKey]: newValue },
      reason: justification,
    });

    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao alterar reconhecimento.' };
  }
}
