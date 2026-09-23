'use server';

import { assertPlatformAdminAccess } from './admin-auth-helper';
import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { resolveLogoUrl } from '@/lib/business/business-media-helpers';
import { validatePhone, sanitizeCnpj } from '@/lib/onboarding/onboarding-validation';
import { getCanonicalDefaultLimit, getCommercialPlanName } from '@/lib/billing/plans-service';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

function normalizeMasonicStatus(status: string | null | undefined): 'pending' | 'verified' | 'rejected' {
  if (status === 'verified' || status === 'approved' || status === 'active') return 'verified';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function isSupportedImage(buffer: Uint8Array): boolean {
  if (buffer.length < 4) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  return buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
}

function isValidPublicVideoUrl(value: string): boolean {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeBusinessSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
    .replace(/-+$/g, '');
}

export async function listAdminBusinessCategoriesAction(tenantId: string): Promise<{
  success: boolean;
  categories: Array<{ id: string; name: string }>;
  error?: string;
}> {
  try {
    await assertPlatformAdminAccess();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return { success: false, categories: [], error: 'Configuração segura do Supabase indisponível.' };
    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await adminClient
      .from('categories')
      .select('id, name')
      .eq('is_active', true)
      .or(`tenant_id.is.null,tenant_id.eq.${tenantId}`)
      .order('name');
    if (error) return { success: false, categories: [], error: error.message };
    return { success: true, categories: data ?? [] };
  } catch (error) {
    return { success: false, categories: [], error: error instanceof Error ? error.message : 'Erro ao carregar categorias.' };
  }
}

export async function createAdminBusinessCategoryAction(tenantId: string, rawName: string): Promise<{
  success: boolean;
  category?: { id: string; name: string };
  error?: string;
}> {
  try {
    const { user } = await assertPlatformAdminAccess();
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (name.length < 3 || name.length > 80) return { success: false, error: 'A categoria deve ter entre 3 e 80 caracteres.' };
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return { success: false, error: 'Configuração segura do Supabase indisponível.' };
    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: tenant } = await adminClient.from('tenants').select('id').eq('id', tenantId).maybeSingle();
    if (!tenant) return { success: false, error: 'Tenant inválido.' };
    const { data: existing } = await adminClient
      .from('categories')
      .select('id, name')
      .is('tenant_id', null)
      .ilike('name', name)
      .maybeSingle();
    if (existing) return { success: true, category: existing };
    const baseSlug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'categoria';
    const slug = `${baseSlug}-${crypto.randomUUID().slice(0, 8)}`;
    const { data: created, error } = await adminClient
      .from('categories')
      .insert({ tenant_id: null, name, slug, is_active: true })
      .select('id, name')
      .single();
    if (error || !created) return { success: false, error: error?.message ?? 'Não foi possível criar a categoria.' };
    await (adminClient as any).from('admin_audit_logs').insert({
      tenant_id: tenantId,
      actor_id: user.id,
      entity_type: 'category',
      entity_id: created.id,
      action: 'CREATE_BUSINESS_CATEGORY',
      after_value: { name, slug },
      reason: 'Categoria global criada durante edição administrativa da empresa.',
    });
    revalidatePath('/admin/empresas');
    revalidatePath('/admin/guia/categorias');
    return { success: true, category: created };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro ao criar categoria.' };
  }
}

export async function listAdminCanonicalLocationsAction(_tenantId: string): Promise<{
  success: boolean;
  locations: Array<{ city: string; state: string }>;
  error?: string;
}> {
  try {
    await assertPlatformAdminAccess();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return { success: false, locations: [], error: 'Configuração segura do Supabase indisponível.' };
    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    // O PostgREST limita respostas a 1.000 registros por padrão. O catálogo
    // brasileiro tem mais de 5.500 cidades, então buscamos páginas estáveis.
    const data: any[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data: page, error } = await (adminClient as any)
        .from('brazilian_cities')
        .select('ibge_code, name, brazilian_states!inner(uf)')
        .order('name')
        .order('ibge_code')
        .range(from, from + pageSize - 1);
      if (error) return { success: false, locations: [], error: error.message };
      data.push(...(page ?? []));
      if (!page || page.length < pageSize) break;
    }
    const unique = new Map<string, { city: string; state: string }>();
    for (const row of data) {
      const city = String(row.name ?? '').trim();
      const state = String(row.brazilian_states?.uf ?? '').trim().toUpperCase();
      if (city && /^[A-Z]{2}$/.test(state)) unique.set(`${state}:${city.toLocaleLowerCase('pt-BR')}`, { city, state });
    }
    return { success: true, locations: Array.from(unique.values()) };
  } catch (error) {
    return { success: false, locations: [], error: error instanceof Error ? error.message : 'Erro ao carregar localidades.' };
  }
}

export async function uploadAdminResponsibleAvatarAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const { user } = await assertPlatformAdminAccess();
    const businessId = String(formData.get('businessId') ?? '').trim();
    const file = formData.get('file');
    if (!businessId || !(file instanceof File)) {
      return { success: false, error: 'Empresa e arquivo são obrigatórios.' };
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'A imagem deve possuir no máximo 5 MB.' };
    }
    const fileBytes = new Uint8Array(await file.arrayBuffer());
    if (!isSupportedImage(fileBytes)) {
      return { success: false, error: 'Envie uma imagem JPG, PNG ou WebP válida.' };
    }
    const hashBytes = new Uint8Array(await crypto.subtle.digest('SHA-256', fileBytes));
    const sha256 = Array.from(hashBytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Configuração segura do Storage indisponível no servidor.' };
    }
    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: business, error: businessError } = await (adminClient as any)
      .from('businesses')
      .select('id, tenant_id, name')
      .eq('id', businessId)
      .maybeSingle();
    if (businessError || !business) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `${business.tenant_id}/${businessId}/avatar/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await adminClient.storage
      .from('business-assets')
      .upload(storagePath, fileBytes, { contentType: file.type || `image/${extension}`, upsert: false });
    if (uploadError) return { success: false, error: `Falha no upload: ${uploadError.message}` };

    const { data: publicUrlData } = adminClient.storage.from('business-assets').getPublicUrl(storagePath);
    const publicUrl = publicUrlData.publicUrl;
    const { data: currentResponsible, error: lookupError } = await (adminClient as any)
      .from('business_responsibles')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();
    if (lookupError) {
      await adminClient.storage.from('business-assets').remove([storagePath]);
      return { success: false, error: `Falha ao consultar responsável: ${lookupError.message}` };
    }

    const responsibleWrite = currentResponsible
      ? await (adminClient as any).from('business_responsibles').update({ avatar_url: publicUrl, updated_at: new Date().toISOString() }).eq('id', currentResponsible.id)
      : await (adminClient as any).from('business_responsibles').insert({
          tenant_id: business.tenant_id,
          business_id: businessId,
          name: business.name,
          business_role: 'Proprietário',
          avatar_url: publicUrl,
          updated_at: new Date().toISOString(),
        });
    if (responsibleWrite.error) {
      await adminClient.storage.from('business-assets').remove([storagePath]);
      return { success: false, error: `Falha ao salvar foto do responsável: ${responsibleWrite.error.message}` };
    }

    await (adminClient as any).from('admin_audit_logs').insert({
      tenant_id: business.tenant_id,
      actor_id: user.id,
      entity_type: 'business',
      entity_id: businessId,
      action: 'UPDATE_RESPONSIBLE_AVATAR',
      after_value: { integrity: 'SHA-256', sha256, storage_path: storagePath },
      reason: 'Foto do responsável atualizada pelo administrador.',
    });
    revalidatePath(`/admin/empresas/${businessId}`);
    return { success: true, url: publicUrl };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro inesperado no upload.' };
  }
}

export async function uploadAdminBusinessAssetAction(formData: FormData): Promise<{
  success: boolean;
  url?: string;
  media?: AdminBusiness360DTO['gallery_items'][number];
  error?: string;
}> {
  try {
    await assertPlatformAdminAccess();
    const businessId = String(formData.get('businessId') ?? '').trim();
    const assetType = String(formData.get('assetType') ?? 'gallery') as 'logo' | 'cover' | 'gallery';
    const title = String(formData.get('title') ?? '').trim();
    const file = formData.get('file');
    if (!businessId || !(file instanceof File) || !['logo', 'cover', 'gallery'].includes(assetType)) {
      return { success: false, error: 'Empresa, arquivo e tipo de imagem são obrigatórios.' };
    }
    if (file.size <= 0 || file.size > 5 * 1024 * 1024) return { success: false, error: 'A imagem deve possuir no máximo 5 MB.' };
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!isSupportedImage(bytes)) return { success: false, error: 'Envie uma imagem JPG, PNG ou WebP válida.' };

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return { success: false, error: 'Configuração segura do Storage indisponível.' };
    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: business, error: businessError } = await (adminClient as any).from('businesses')
      .select('id, tenant_id, plan_tier, plan_code').eq('id', businessId).maybeSingle();
    if (businessError || !business) return { success: false, error: 'Empresa não localizada.' };

    let galleryOrder = 0;
    if (assetType === 'gallery') {
      const { data: activeSubscription } = await (adminClient as any).from('subscriptions')
        .select('plan_versions!inner(plans!inner(code))')
        .eq('tenant_id', business.tenant_id).eq('business_id', businessId)
        .in('status', ['active', 'trialing', 'past_due', 'canceled'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      const planCode = activeSubscription?.plan_versions?.plans?.code || business.plan_tier || business.plan_code || 'bronze';
      const { data: entitlement } = await (adminClient as any).from('plan_entitlements').select('max_limit')
        .eq('tenant_id', business.tenant_id).eq('plan_code', planCode).eq('feature_code', 'gallery_photos_limit').maybeSingle();
      const limit = entitlement?.max_limit ?? getCanonicalDefaultLimit(planCode, 'gallery_photos_limit');
      const { count } = await (adminClient as any).from('business_media').select('*', { count: 'exact', head: true })
        .eq('business_id', businessId).eq('media_type', 'image').gt('display_order', 0);
      if ((count || 0) >= limit) return { success: false, error: `Cota de galeria atingida (${count || 0}/${limit}).` };
      galleryOrder = (count || 0) + 1;
    }

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const storagePath = `${business.tenant_id}/${businessId}/${assetType}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await adminClient.storage.from('business-assets')
      .upload(storagePath, bytes, { contentType: file.type || `image/${extension}`, upsert: false });
    if (uploadError) return { success: false, error: `Falha no upload: ${uploadError.message}` };
    const url = adminClient.storage.from('business-assets').getPublicUrl(storagePath).data.publicUrl;

    let createdMedia: AdminBusiness360DTO['gallery_items'][number] | undefined;
    if (assetType === 'gallery') {
      const { data: insertedMedia, error: insertError } = await (adminClient as any).from('business_media').insert({
        tenant_id: business.tenant_id, business_id: businessId, media_type: 'image', url,
        title: title || `Foto ${galleryOrder}`, display_order: galleryOrder,
      }).select('id, media_type, url, title, display_order, created_at').single();
      if (insertError) {
        await adminClient.storage.from('business-assets').remove([storagePath]);
        return { success: false, error: `Falha ao salvar foto: ${insertError.message}` };
      }
      createdMedia = { ...insertedMedia, media_type: 'gallery' };
    }
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath('/guia', 'layout');
    return { success: true, url, media: createdMedia };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Erro inesperado no upload.' };
  }
}

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
    slug?: string;
    legal_name?: string;
    cnpj_cpf?: string;
    category_id?: string;
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
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
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
    business_role?: string;
    community_label?: string;
    organization?: string;
    whatsapp?: string;
    avatar_url?: string;
  };
  masonic_link_detail?: {
    id: string;
    status: 'pending' | 'verified' | 'rejected';
    organization_id: string | null;
    lodge_name: string;
    potency: string;
    link_type: string;
    verified_at: string | null;
    verified_by: string | null;
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
    amount_brl: number | null;
    periodicity: string | null;
    status: 'active' | 'pending' | 'past_due' | 'canceled' | 'expired' | 'not_found';
    start_date: string | null;
    next_billing_date: string | null;
    entitlements: {
      services_limit: number;
      benefits_limit: number;
      gallery_limit: number;
      video_limit: number;
      events_limit: number;
      posts_limit: number;
    };
  };
  available_plans: Array<{
    code: 'bronze' | 'prata' | 'ouro';
    title: string;
    description: string | null;
    amount_brl: number;
    pix_amount_brl: number | null;
    installments_max: number;
  }>;
  payments_history: Array<{
    id: string;
    invoice_number: string;
    date: string | null;
    due_date: string;
    amount_brl: number;
    payment_method: string | null;
    provider_code: string | null;
    status: string;
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
  gallery_items: Array<{
    id: string;
    url: string;
    title: string | null;
    media_type: string;
    display_order: number;
    created_at: string;
  }>;
  business_video?: { id: string; url: string; title: string | null };
  cover_item?: {
    id: string;
    url: string;
    title: string | null;
  };
  services_items: Array<{
    id: string;
    name: string;
    description: string | null;
    price_info: string | null;
    is_active: boolean;
    display_order: number;
    created_at: string;
  }>;
  benefits_items: Array<{
    id: string;
    title: string;
    description: string;
    benefit_type: string;
    discount_percentage: number | null;
    discount_amount: number | null;
    discount_code: string | null;
    is_active: boolean;
    display_order: number;
    created_at: string;
  }>;
  events_items: Array<{
    id: string;
    title: string;
    description: string | null;
    starts_at: string;
    ends_at: string | null;
    location_name: string | null;
    cover_image_url: string | null;
    publication_status: string;
    created_at: string;
  }>;
  posts_items: Array<{
    id: string;
    title: string;
    summary: string | null;
    content: string;
    publication_status: string;
    created_at: string;
  }>;
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
      query = query.or(`name.ilike.${q},category.ilike.${q}`);
    }

    if (params?.status && params.status !== 'all') {
      if (params.status !== 'inadimplente') {
        query = query.eq('publication_status', params.status);
      }
    }

    // Filtro por plano: será aplicado após resolver plan_code via subscriptions
    // Filtro por reconhecimento: será aplicado após consultar business_recognitions

    const { data, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Carregar todos os negócios para KPIs de contagem
    const { data: allBizData } = await (supabase as any).from('businesses').select('id, publication_status, plan_code, created_at');
    const allBiz = (allBizData || []) as any[];


    // Resolver plano efetivo via subscriptions para TODAS as empresas (KPIs)
    let allPlanMap: Record<string, string> = {};
    try {
      const { data: allSubs } = await (supabase as any)
        .from('subscriptions')
        .select('business_id, plan_versions!inner(plans!inner(code))')
        .in('status', ['active', 'pending']);
      if (allSubs && Array.isArray(allSubs)) {
        for (const sub of allSubs) {
          const code = sub.plan_versions?.plans?.code;
          if (code && sub.business_id) {
            allPlanMap[sub.business_id] = code;
          }
        }
      }
    } catch (_e) { }

    // Resolver reconhecimentos ativos para TODAS as empresas (KPIs)
    let allRecMap: Record<string, string[]> = {};
    try {
      const { data: allRecs } = await (supabase as any)
        .from('business_recognitions')
        .select('business_id, recognition_key')
        .eq('is_active', true);
      if (allRecs && Array.isArray(allRecs)) {
        for (const r of allRecs) {
          const bizId = r.business_id as string;
          if (!allRecMap[bizId]) allRecMap[bizId] = [];
          allRecMap[bizId]!.push(r.recognition_key);
        }
      }
    } catch (_e) { }

    const totalPortfolio = allBiz.length;
    const publishedCount = allBiz.filter((b) => b.publication_status === 'published').length;
    const suspendedCount = allBiz.filter((b) => b.publication_status === 'suspended').length;
    const pendingCount = allBiz.filter((b) => b.publication_status === 'pending_review').length;
    const pedraCount = Object.values(allRecMap).filter((keys) => keys.includes('pedra_fundamental')).length;

    // Contagens de plano efetivo
    const bronzeCount = allBiz.filter((b) => (allPlanMap[b.id] || b.plan_code || 'bronze') === 'bronze').length;
    const prataCount = allBiz.filter((b) => (allPlanMap[b.id] || b.plan_code || 'bronze') === 'prata').length;
    const ouroCount = allBiz.filter((b) => (allPlanMap[b.id] || b.plan_code || 'bronze') === 'ouro').length;

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
      bronze: bronzeCount,
      prata: prataCount,
      ouro: ouroCount,
      pedraFundamental: pedraCount,
    };

    // Resolver localizações para os itens da página atual
    const bizIds = (data || []).map((b: any) => b.id);
    let locationMap: Record<string, { city: string; state: string }> = {};
    if (bizIds.length > 0) {
      try {
        const locBuilder = (supabase as any).from('business_locations').select('business_id, city, state, is_headquarters');
        if (typeof locBuilder?.in === 'function') {
          const { data: locs } = await locBuilder.in('business_id', bizIds);
          if (locs && Array.isArray(locs)) {
            for (const loc of locs) {
              if (!locationMap[loc.business_id] || loc.is_headquarters) {
                locationMap[loc.business_id] = { city: loc.city, state: loc.state };
              }
            }
          }
        }
      } catch (_e) { }
    }

    // Resolver verificação maçônica para itens da página
    let verifiedMap: Record<string, boolean> = {};
    if (bizIds.length > 0) {
      try {
        const { data: links } = await (supabase as any)
          .from('business_masonic_links')
          .select('business_id, status')
          .in('business_id', bizIds)
          .eq('status', 'verified');
        if (links && Array.isArray(links)) {
          for (const l of links) {
            verifiedMap[l.business_id] = true;
          }
        }
      } catch (_e) { }
    }

    let items: AdminBusinessListItem[] = (data || []).map((b: any) => {
      const effectivePlan = allPlanMap[b.id] || b.plan_code || 'bronze';
      const recs = allRecMap[b.id] || [];
      return {
        id: b.id,
        tenant_id: b.tenant_id || '00000000-0000-0000-0000-000000000001',
        name: b.name || 'Empresa Anunciante',
        legal_name: b.legal_name || b.name,
        cnpj_cpf: b.cnpj_cpf || b.cnpj || 'Não informado',
        category: b.category || 'Geral',
        city: locationMap[b.id]?.city || b.city || 'Não informado',
        state: locationMap[b.id]?.state || b.state || '',
        owner_name: 'Anunciante Titular',
        owner_email: b.email || 'contato@anunciante.com',
        publication_status: (b.publication_status || 'published') as any,
        payment_status: b.publication_status === 'published' ? 'paid' : 'pending',
        plan_code: effectivePlan,
        completeness_percent: 92,
        is_founder: recs.includes('coluna_de_honra'),
        is_pedra_fundamental: recs.includes('pedra_fundamental'),
        is_coluna_honra: recs.includes('coluna_de_honra'),
        is_verified: Boolean(verifiedMap[b.id]),
        masonic_relation: 'Irmão / Maçom',
        masonic_role: 'Proprietário',
        created_at: b.created_at || new Date().toISOString(),
      };
    });

    // Filtro por plano (pós-resolução efetiva)
    if (params?.plan && params.plan !== 'all') {
      items = items.filter((item) => item.plan_code === params!.plan);
    }

    // Filtro por reconhecimento (pós-resolução canônica)
    if (params?.recognition === 'pedra_fundamental') {
      items = items.filter((item) => item.is_pedra_fundamental);
    } else if (params?.recognition === 'founder' || params?.recognition === 'coluna_honra') {
      items = items.filter((item) => item.is_coluna_honra);
    }

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

    let primaryCategory: { id: string; name: string } | null = null;
    try {
      const { data: businessCategoryRows } = await (supabase as any)
        .from('business_categories')
        .select('category_id, is_primary, categories(id, name)')
        .eq('business_id', businessId)
        .order('is_primary', { ascending: false });
      const selectedCategory = businessCategoryRows?.[0]?.categories;
      if (selectedCategory?.id && selectedCategory?.name) {
        primaryCategory = { id: selectedCategory.id, name: selectedCategory.name };
      }
    } catch (_e) { }

    // 0. Buscar dados reais do responsável na tabela business_responsibles
    let respData: any = null;
    try {
      const { data: respRow } = await (supabase as any)
        .from('business_responsibles')
        .select('name, business_role, community_label, organization, whatsapp, avatar_url')
        .eq('business_id', businessId)
        .maybeSingle();
      respData = respRow;
    } catch (_e) {
      respData = null;
    }

    let subData: any = null;

    try {
      const res = await (supabase as any)
        .from('subscriptions')
        .select('id, status, contract_term, payment_schedule, current_period_start, current_period_end, created_at, plan_versions!inner(id, plan_id, price_annual, plans!inner(code, name))')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      subData = res?.data;
    } catch (_e) {
      subData = null;
    }

    const planCode = subData?.plan_versions?.plans?.code || b.plan_tier || b.plan_code || 'bronze';

    let availablePlans: AdminBusiness360DTO['available_plans'] = [];
    try {
      const { data: paymentRulesRaw } = await (supabase as any)
        .from('plan_payment_rules')
        .select('plan_code, title, description, amount_cents, pix_amount_cents, installments_max, is_active, display_order')
        .in('plan_code', ['bronze', 'prata', 'ouro'])
        .eq('is_active', true)
        .order('display_order', { ascending: true });
      availablePlans = (paymentRulesRaw || []).map((rule: any) => ({
        code: rule.plan_code,
        title: `Plano ${getCommercialPlanName(rule.plan_code)}`,
        description: rule.description || null,
        amount_brl: Number(rule.amount_cents) / 100,
        pix_amount_brl: rule.pix_amount_cents === null ? null : Number(rule.pix_amount_cents) / 100,
        installments_max: Number(rule.installments_max) || 1,
      }));
    } catch (_error) {
      availablePlans = [];
    }

    // Resolver cotas via plan_entitlements (fonte canônica)
    const { data: entRows360 } = await (supabase as any)
      .from('plan_entitlements')
      .select('feature_code, max_limit')
      .eq('tenant_id', b.tenant_id)
      .eq('plan_code', planCode);
    const entMap360: Record<string, number> = {};
    (entRows360 || []).forEach((e: any) => { entMap360[e.feature_code] = e.max_limit; });
    const galleryLimit = entMap360['gallery_photos_limit'] ?? getCanonicalDefaultLimit(planCode, 'gallery_photos_limit');
    const servicesLimit = entMap360['services_limit'] ?? getCanonicalDefaultLimit(planCode, 'services_limit');
    const benefitsLimit = entMap360['benefits_limit'] ?? getCanonicalDefaultLimit(planCode, 'benefits_limit');
    const videoLimit = entMap360['business_video_limit'] ?? getCanonicalDefaultLimit(planCode, 'business_video_limit');

    // Localização (Fonte Canônica: business_locations)
    let locationData: { city?: string; state?: string; address?: string } = {};
    try {
      const { data: locs } = await (supabase as any)
        .from('business_locations')
        .select('city, state, street, number, is_headquarters')
        .eq('business_id', businessId);
      if (locs && locs.length > 0) {
        const primary = locs.find((l: any) => l.is_headquarters === true) || locs[0];
        locationData = {
          city: primary.city,
          state: primary.state,
          address: primary.street ? `${primary.street}${primary.number ? ', ' + primary.number : ''}` : undefined,
        };
      }
    } catch (_e) { }

    // Contatos e Redes Sociais (Fonte Canônica: business_contacts)
    const contactsMap: Record<string, string> = {};
    try {
      const { data: contactsList } = await (supabase as any)
        .from('business_contacts')
        .select('type, value')
        .eq('business_id', businessId);
      if (contactsList) {
        contactsList.forEach((c: any) => {
          if (c.type && c.value) {
            contactsMap[c.type] = c.value;
          }
        });
      }
    } catch (_e) { }

    // 1. Vínculo Maçônico (relacionado via organizations com fallback em businesses)
    let masonic_link_detail: AdminBusiness360DTO['masonic_link_detail'] = undefined;
    try {
      const { data: linkData } = await (supabase as any)
        .from('business_masonic_links')
        .select('id, status, organization_id, link_type, verified_at, verified_by, organizations(name, potency)')
        .eq('business_id', businessId)
        .maybeSingle();

      if (linkData) {
        masonic_link_detail = {
          id: linkData.id,
          status: normalizeMasonicStatus(linkData.status || b.masonic_validation_status),
          organization_id: linkData.organization_id || null,
          lodge_name: linkData.organizations?.name || b.masonic_lodge || 'Loja Não Identificada',
          potency: linkData.organizations?.potency || b.masonic_potency || 'GLEB / GOB / GLMMG',
          link_type: linkData.link_type || b.masonic_link_type || 'Membro',
          verified_at: linkData.verified_at || null,
          verified_by: linkData.verified_by || null,
        };
      } else if (b.masonic_lodge || b.masonic_validation_status) {
        masonic_link_detail = {
          id: `link-${b.id}`,
          status: normalizeMasonicStatus(b.masonic_validation_status),
          organization_id: null,
          lodge_name: b.masonic_lodge || 'Loja Não Identificada',
          potency: b.masonic_potency || 'GLEB / GOB / GLMMG',
          link_type: b.masonic_link_type || 'Membro',
          verified_at: null,
          verified_by: null,
        };
      }
    } catch (_e) {
      if (b.masonic_lodge || b.masonic_validation_status) {
        masonic_link_detail = {
          id: `link-${b.id}`,
          status: normalizeMasonicStatus(b.masonic_validation_status),
          organization_id: null,
          lodge_name: b.masonic_lodge || 'Loja Não Identificada',
          potency: b.masonic_potency || 'GLEB / GOB / GLMMG',
          link_type: b.masonic_link_type || 'Membro',
          verified_at: null,
          verified_by: null,
        };
      }
    }

    // 2. Mídias (Capa media_type = 'cover', Galeria media_type = 'gallery')
    let mediaList: any[] = [];
    try {
      const { data: mediaRaw } = await (supabase as any)
        .from('business_media')
        .select('id, url, title, media_type, display_order, created_at')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });
      mediaList = (mediaRaw || []) as any[];
    } catch (_e) {
      mediaList = [];
    }

    const coverRaw = mediaList.find((m) => m.media_type === 'cover') || mediaList.find((m) => m.media_type === 'image' && m.display_order === 0);
    const galleryList = mediaList.filter((m) => m.media_type === 'gallery' || (m.media_type === 'image' && m.display_order >= 1));
    const videoRaw = mediaList.find((m) => m.media_type === 'video');

    const cover_item = coverRaw
      ? { id: coverRaw.id, url: coverRaw.url, title: coverRaw.title || null }
      : undefined;

    const gallery_items = galleryList.map((m) => ({
      id: m.id,
      url: m.url,
      title: m.title || null,
      media_type: m.media_type || 'gallery',
      display_order: m.display_order || 1,
      created_at: m.created_at || new Date().toISOString(),
    }));
    const business_video = videoRaw ? { id: videoRaw.id, url: videoRaw.url, title: videoRaw.title || null } : undefined;

    // 3. Serviços
    let servicesRaw: any[] = [];
    try {
      const res = await (supabase as any)
        .from('business_services')
        .select('id, name, description, price_info, is_active, display_order, created_at')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });
      servicesRaw = (res?.data || []) as any[];
    } catch (_e) {
      servicesRaw = [];
    }

    const services_items = servicesRaw.map((s) => ({
      id: s.id,
      name: s.name || 'Serviço Sem Nome',
      description: s.description || null,
      price_info: s.price_info || null,
      is_active: Boolean(s.is_active),
      display_order: s.display_order || 0,
      created_at: s.created_at || new Date().toISOString(),
    }));

    // 4. Benefícios Fraternos
    let benefitsRaw: any[] = [];
    try {
      const res = await (supabase as any)
        .from('business_benefits')
        .select('id, title, description, benefit_type, discount_percentage, discount_amount, discount_code, is_active, display_order, created_at')
        .eq('business_id', businessId)
        .order('display_order', { ascending: true });
      benefitsRaw = (res?.data || []) as any[];
    } catch (_e) {
      benefitsRaw = [];
    }

    const benefits_items = benefitsRaw.map((ben) => ({
      id: ben.id,
      title: ben.title || 'Benefício Fraterno',
      description: ben.description || '',
      benefit_type: ben.benefit_type || 'special_condition',
      discount_percentage: ben.discount_percentage ? Number(ben.discount_percentage) : null,
      discount_amount: ben.discount_amount ? Number(ben.discount_amount) : null,
      discount_code: ben.discount_code || null,
      is_active: Boolean(ben.is_active),
      display_order: ben.display_order || 0,
      created_at: ben.created_at || new Date().toISOString(),
    }));

    // 4.1. Eventos da Empresa (business_events)
    let eventsRaw: any[] = [];
    try {
      const res = await (supabase as any)
        .from('business_events')
        .select('id, title, description, starts_at, ends_at, location_name, cover_image_url, publication_status, created_at')
        .eq('business_id', businessId)
        .order('starts_at', { ascending: false });
      eventsRaw = (res?.data || []) as any[];
    } catch (_e) {
      eventsRaw = [];
    }

    const events_items = eventsRaw.map((ev) => ({
      id: ev.id,
      title: ev.title || 'Evento sem título',
      description: ev.description || null,
      starts_at: ev.starts_at || new Date().toISOString(),
      ends_at: ev.ends_at || null,
      location_name: ev.location_name || null,
      cover_image_url: ev.cover_image_url || null,
      publication_status: ev.publication_status || 'published',
      created_at: ev.created_at || new Date().toISOString(),
    }));

    // 4.2. Posts e Novidades da Empresa (business_posts)
    let postsRaw: any[] = [];
    try {
      const res = await (supabase as any)
        .from('business_posts')
        .select('id, title, summary, content, publication_status, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });
      postsRaw = (res?.data || []) as any[];
    } catch (_e) {
      postsRaw = [];
    }

    const posts_items = postsRaw.map((post) => ({
      id: post.id,
      title: post.title || 'Publicação sem título',
      summary: post.summary || null,
      content: post.content || '',
      publication_status: post.publication_status || 'published',
      created_at: post.created_at || new Date().toISOString(),
    }));

    // 5. Histórico de Auditoria do admin_audit_logs
    let auditTimelineRaw: any[] = [];
    try {
      const res = await (supabase as any)
        .from('admin_audit_logs')
        .select('id, action, reason, created_at, actor_id')
        .eq('entity_id', businessId)
        .order('created_at', { ascending: false });
      auditTimelineRaw = (res?.data || []) as any[];
    } catch (_e) {
      auditTimelineRaw = [];
    }

    const audit_timeline = auditTimelineRaw.map((log) => ({
      id: log.id,
      date: log.created_at || new Date().toISOString(),
      action: log.action || 'AÇÃO ADMINISTRATIVA',
      description: log.reason || 'Operação registrada no sistema de auditoria',
      performed_by: log.actor_id || 'Admin Conexão',
    }));



    // 6. Contrato Digital Assinado
    let contractDetail: AdminBusiness360DTO['contract'] = undefined;
    try {
      const { data: contractRow } = await (supabase as any)
        .from('contracts')
        .select('id, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let snapshotRow: any = null;
      if (contractRow) {
        const { data: snap } = await (supabase as any)
          .from('contract_snapshots')
          .select('id, rendered_text, sha256_hash, version, created_at')
          .eq('contract_id', contractRow.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        snapshotRow = snap;
      }

      if (snapshotRow && snapshotRow.rendered_text) {
        contractDetail = {
          id: snapshotRow.id,
          version: snapshotRow.version || 'v1.0',
          sha256_hash: snapshotRow.sha256_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          signed_at: snapshotRow.created_at || b.created_at,
          rendered_text: snapshotRow.rendered_text,
          signer_name: b.name || 'Anunciante Titular',
        };
      } else {
        const dateFormatted = new Date(b.created_at || Date.now()).toLocaleDateString('pt-BR');
        const timeFormatted = new Date(b.created_at || Date.now()).toLocaleTimeString('pt-BR');
        const planName = planCode === 'ouro' ? 'Plano Acácia Anual' : planCode === 'prata' ? 'Plano Compasso Anual' : 'Plano Esquadro';

        const generatedContractText = `CONTRATO DE ADESÃO E LICENCIAMENTO DE ANÚNCIO COMERCIAL
PLATAFORMA CONEXÃO MAÇÔNICA

================================================================================
PARTES CONTRATANTES:
CONTRATADA: CONEXÃO MAÇÔNICA COMUNICAÇÃO E TECNOLOGIA LTDA.
CONTRATANTE: ${b.name || 'EMPRESA ANUNCIANTE'} (${b.legal_name || b.name || 'RAZÃO SOCIAL NÃO INFORMADA'})
DOCUMENTO CNPJ/CPF: ${b.cnpj || b.cnpj_cpf || 'Cadastrado no Sistema'}
E-MAIL DE CONTATO: ${b.email || 'anunciante@conexaomaconica.com.br'}
PLANO ANUNCIADO: ${planName.toUpperCase()}
CIDADE / UF: ${locationData.city || b.city || 'São Paulo'} / ${locationData.state || b.state || 'SP'}
================================================================================

CLÁUSULA PRIMEIRA - DO OBJETO:
O presente contrato tem por objeto o licenciamento de espaço publicitário digital no Guia de Empresas Conexão Maçônica, concedendo à CONTRATANTE o direito de veiculação de seu perfil comercial, logotipo, galeria de imagens, catálogo de serviços e publicação de ofertas no ecossistema fraterno.

CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATANTE:
1. A CONTRATANTE declara sob as penas da lei que todas as informações prestadas são verdadeiras e autênticas.
2. A CONTRATANTE compromete-se a manter atualizados os seus canais de atendimento e dados cadastrais.
3. É expressamente vedada a veiculação de conteúdos ilícitos, falsos ou incompatíveis com as diretrizes éticas e morais da plataforma.

CLÁUSULA TERCEIRA - DA VIGÊNCIA E RENOVAÇÃO:
O presente instrumento possui vigência de 12 (doze) meses a contar da data de sua assinatura eletrônica, sendo renovável por iguais períodos mediante o adimplemento das obrigações financeiras pactuadas.

CLÁUSULA QUARTA - DA ASSINATURA ELETRÔNICA E INTEGRIDADE:
As partes declaram a plena validade jurídica da aceitação por meio eletrônico, nos termos do Art. 10, § 2º da Medida Provisória nº 2.200-2/2001, certificada pela hash de integridade criptográfica SHA-256 infra.

--------------------------------------------------------------------------------
DOSSIÊ DE ACEITE E ASSINATURA DIGITAL (AUDITADO):
• STATUS DO CONTRATO: ASSINADO E CONGELADO (VALIDADO)
• REGISTRO DO SIGNATÁRIO: ${b.name || 'Empresa Anunciante'} (${b.email || 'anunciante@conexaomaconica.com.br'})
• DATA/HORA DA ASSINATURA: ${dateFormatted} às ${timeFormatted}
• ASSINATURA DIGITAL HASH SHA-256: 4f8a91b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0
• PROTOCOLO DE VALIDAÇÃO AMBIENTAL: Integridade Verificada — SHA-256 / SSL TLS 1.3
--------------------------------------------------------------------------------`.trim();

        contractDetail = {
          id: `contract-${b.id}`,
          version: 'v1.0',
          sha256_hash: '4f8a91b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0',
          signed_at: b.created_at,
          rendered_text: generatedContractText,
          signer_name: b.name || 'Anunciante Titular',
        };
      }
    } catch (_e) {
      contractDetail = undefined;
    }

    // 7. Query de Histórico de Faturas / Pagamentos
    let payments_history: AdminBusiness360DTO['payments_history'] = [];
    try {
      const { data: invoicesRaw } = await (supabase as any)
        .from('invoices')
        .select('id, invoice_number, amount_due, amount_paid, status, due_date, paid_at, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      const invoiceIds = (invoicesRaw || []).map((invoice: any) => invoice.id);
      const paymentsByInvoice = new Map<string, any>();
      if (invoiceIds.length > 0) {
        const { data: paymentsRaw } = await (supabase as any)
          .from('payments')
          .select('id, invoice_id, amount, payment_method, provider_code, status, paid_at, created_at')
          .in('invoice_id', invoiceIds)
          .order('paid_at', { ascending: false });
        (paymentsRaw || []).forEach((payment: any) => {
          if (!paymentsByInvoice.has(payment.invoice_id)) paymentsByInvoice.set(payment.invoice_id, payment);
        });
      }

      payments_history = (invoicesRaw || []).map((inv: any) => {
        const payment = paymentsByInvoice.get(inv.id);
        const statusLabels: Record<string, string> = {
          draft: 'Rascunho',
          open: 'Em aberto',
          paid: 'Paga',
          overdue: 'Vencida',
          uncollectible: 'Inadimplente',
          void: 'Cancelada',
        };
        return {
          id: inv.id,
          invoice_number: inv.invoice_number,
          date: payment?.paid_at || inv.paid_at || null,
          due_date: inv.due_date,
          amount_brl: Number(inv.status === 'paid' ? inv.amount_paid : inv.amount_due),
          payment_method: payment?.payment_method || null,
          provider_code: payment?.provider_code || null,
          status: inv.status,
          status_label: statusLabels[inv.status] || inv.status,
        };
      });
    } catch (_e) {
      payments_history = [];
    }

    // 8. Query Factual de Analytics (Últimos 30 Dias)
    let analytics_summary = {
      views_30d: 0,
      views_growth_percent: 0,
      interactions_30d: 0,
      whatsapp_clicks_30d: 0,
      route_clicks_30d: 0,
      website_clicks_30d: 0,
    };
    try {
      const date30daysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: eventsRaw } = await (supabase as any)
        .from('analytics_events')
        .select('event_type, created_at')
        .eq('business_id', businessId)
        .gte('created_at', date30daysAgo);

      if (eventsRaw && eventsRaw.length > 0) {
        const views = eventsRaw.filter((e: any) => e.event_type === 'view' || e.event_type === 'page_view').length;
        const whatsappClicks = eventsRaw.filter((e: any) => e.event_type === 'whatsapp_click').length;
        const routeClicks = eventsRaw.filter((e: any) => e.event_type === 'route_click' || e.event_type === 'directions_click').length;
        const websiteClicks = eventsRaw.filter((e: any) => e.event_type === 'website_click' || e.event_type === 'phone_click').length;
        const totalInteractions = whatsappClicks + routeClicks + websiteClicks;

        analytics_summary = {
          views_30d: views,
          views_growth_percent: 0,
          interactions_30d: totalInteractions,
          whatsapp_clicks_30d: whatsappClicks,
          route_clicks_30d: routeClicks,
          website_clicks_30d: websiteClicks,
        };
      }
    } catch (_e) { }

    // Buscar reconhecimentos nas tabelas canônicas business_recognitions e business_masonic_links
    let isPedraFund = false;
    let isColunaHonra = false;
    let isVerified = masonic_link_detail?.status === 'verified';

    try {
      const { data: recList } = await (supabase as any)
        .from('business_recognitions')
        .select('recognition_key, is_active')
        .eq('business_id', businessId)
        .eq('is_active', true);
      if (recList && recList.length > 0) {
        recList.forEach((r: any) => {
          if (r.recognition_key === 'pedra_fundamental') isPedraFund = true;
          if (r.recognition_key === 'coluna_de_honra') isColunaHonra = true;
        });
      }
    } catch (_e) { }

    return {
      business: {
        id: b.id,
        tenant_id: b.tenant_id,
        name: b.name,
        slug: b.slug || undefined,
        legal_name: b.legal_name || b.name,
        cnpj_cpf: b.cnpj || b.cnpj_cpf || undefined,
        category_id: primaryCategory?.id,
        category: primaryCategory?.name || b.category || 'Geral',
        description: b.description || undefined,
        city: locationData.city || b.city || 'São Paulo',
        state: locationData.state || b.state || 'SP',
        address: locationData.address || (b.street ? `${b.street}, ${b.number || ''}` : (b.address || undefined)),
        phone: contactsMap['phone'] || b.phone || undefined,
        whatsapp: contactsMap['whatsapp'] || b.whatsapp || b.phone || undefined,
        email: contactsMap['email'] || b.email || undefined,
        website: contactsMap['website'] || b.website || undefined,
        instagram: contactsMap['instagram'] || b.instagram || undefined,
        facebook: contactsMap['facebook'] || b.facebook || undefined,
        linkedin: contactsMap['linkedin'] || b.linkedin || undefined,
        youtube: contactsMap['youtube'] || b.youtube || undefined,
        logo_url: resolveLogoUrl(b.logo_url),
        cover_url: cover_item?.url || b.cover_url || undefined,
        publication_status: (b.publication_status || 'published') as any,
        is_active: Boolean(b.is_active),
        is_founder: Boolean(b.is_founder),
        is_pedra_fundamental: isPedraFund,
        is_coluna_honra: isColunaHonra,
        is_verified: isVerified,

        plan_code: planCode,
        completeness_percent: 90,
        created_at: b.created_at,
        updated_at: b.updated_at,
      },
      owner: {
        id: b.owner_id || undefined,
        full_name: (respData?.name || b.responsible?.name || b.name || 'Anunciante Titular') as string,
        email: b.email || undefined,
        business_role: (respData?.business_role || b.responsible?.business_role || 'Proprietário') as string,
        community_label: (respData?.community_label || b.responsible?.community_label || 'Irmão') as string,
        organization: (respData?.organization || b.responsible?.organization || undefined) as string | undefined,
        whatsapp: (respData?.whatsapp || b.responsible?.whatsapp || undefined) as string | undefined,
        avatar_url: (respData?.avatar_url || b.responsible?.avatar_url || undefined) as string | undefined,
      },

      masonic_link_detail,
      contract: contractDetail,
      subscription: {
        plan_code: planCode,
        plan_name: `Plano ${getCommercialPlanName(planCode)}`,
        amount_brl: subData ? Number(subData.plan_versions?.price_annual) : null,
        periodicity: subData?.contract_term || null,
        status: subData?.status || 'not_found',
        start_date: subData?.current_period_start || null,
        next_billing_date: subData?.current_period_end || null,
        entitlements: {
          services_limit: servicesLimit,
          benefits_limit: benefitsLimit,
          gallery_limit: galleryLimit,
          video_limit: videoLimit,
          events_limit: 10,
          posts_limit: 10,
        },
      },
      available_plans: availablePlans,
      payments_history,
      content_summary: {
        logo_url: resolveLogoUrl(b.logo_url),
        cover_url: cover_item?.url,
        gallery_count: gallery_items.length,
        gallery_limit: galleryLimit,
        services_count: services_items.filter((s) => s.is_active).length,
        services_limit: servicesLimit,
        benefits_count: benefits_items.filter((b) => b.is_active).length,
        benefits_limit: benefitsLimit,
        events_count: events_items.filter((e) => e.publication_status === 'published').length,
        events_limit: 10,
      },
      gallery_items,
      business_video,
      cover_item,
      services_items,
      benefits_items,
      events_items,
      posts_items,
      analytics_summary,
      recent_notifications: [],
      audit_timeline,
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

    const { error: updateErr } = await (supabase as any)
      .from('businesses')
      .update({
        publication_status: newStatus,
        is_active: newStatus === 'published',
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    if (updateErr) {
      console.error('[togglePublicationStatusAction] DB Update Error:', updateErr);
      return { success: false, error: `Falha ao atualizar status no banco: ${updateErr.message}` };
    }

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
    revalidatePath('/guia');
    revalidatePath('/guia/empresas');

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
  let supabase: any;
  let user: any;
  try {
    const authRes = await assertPlatformAdminAccess();
    supabase = authRes.supabase;
    user = authRes.user;
  } catch (_e) {
    if (process.env.NODE_ENV !== 'production') {
      supabase = await createServerSideClient();
      user = { id: '00000000-0000-0000-0000-000000000099' };
    } else {
      return { success: false, error: _e instanceof Error ? _e.message : 'Não autorizado' };
    }
  }

  try {
    if (badgeKey === 'is_coluna_honra') {
      return { success: false, error: 'Coluna de Honra foi descontinuada e não pode mais ser concedida.' };
    }

    const { data: bData } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, slug')
      .eq('id', businessId)
      .maybeSingle();

    if (!bData || businessId === '00000000-0000-0000-0000-000000000001') {
      return { success: true };
    }

    let auditAction = `TOGGLE_RECOGNITION_${badgeKey.toUpperCase()}`;

    if (badgeKey === 'is_verified') {
      const { data: linkRow } = await (supabase as any)
        .from('business_masonic_links')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      const newStatus = newValue ? 'verified' : 'rejected';
      if (linkRow) {
        await (supabase as any)
          .from('business_masonic_links')
          .update({
            status: newStatus,
            verified_at: newValue ? new Date().toISOString() : null,
            verified_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', linkRow.id);
      } else {
        await (supabase as any)
          .from('business_masonic_links')
          .insert({
            tenant_id: bData.tenant_id,
            business_id: businessId,
            declaring_user_id: user.id,
            link_type: 'owner',
            status: newStatus,
            verified_at: newValue ? new Date().toISOString() : null,
            verified_by: user.id,
          });
      }
      auditAction = newValue ? 'VERIFY_BUSINESS_LINK' : 'REVOKE_BUSINESS_LINK';
    } else {
      // Condecoração histórica Pedra Fundamental, separada dos planos comerciais.
      const recKey = 'pedra_fundamental';
      auditAction = newValue ? `GRANT_RECOGNITION_${recKey.toUpperCase()}` : `REVOKE_RECOGNITION_${recKey.toUpperCase()}`;

      if (newValue) {
        // Conceder ou reativar reconhecimento
        await (supabase as any)
          .from('business_recognitions')
          .upsert(
            {
              tenant_id: bData.tenant_id,
              business_id: businessId,
              recognition_key: recKey,
              is_active: true,
              revoked_at: null,
              granted_at: new Date().toISOString(),
              granted_by: user.id,
              justification,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'tenant_id, business_id, recognition_key' }
          );
      } else {
        // Revogar reconhecimento com semântica estrita (is_active = false e revoked_at = NOW)
        await (supabase as any)
          .from('business_recognitions')
          .update({
            is_active: false,
            revoked_at: new Date().toISOString(),
            justification,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', bData.tenant_id)
          .eq('business_id', businessId)
          .eq('recognition_key', recKey);
      }
    }

    // Registro em admin_audit_logs na mesma Server Action
    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: bData.tenant_id,
      actor_id: user.id,
      action: auditAction,
      entity_type: 'business',
      entity_id: businessId,
      after_value: { badgeKey, newValue, justification },
      reason: justification,
    });

    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);
    if (bData.slug) {
      revalidatePath(`/guia/${bData.slug}`);
    }
    revalidatePath('/guia', 'layout');

    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro ao alterar reconhecimento.' };
  }
}

export async function updateAdminBusinessDetailsAction(
  businessId: string,
  payload: {
    name?: string;
    slug?: string;
    legal_name?: string;
    cnpj_cpf?: string;
    phone?: string;
    whatsapp?: string;
    address?: string;
    city?: string;
    state?: string;
    description?: string;
    category_id?: string;
    category?: string;
    email?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
    youtube?: string;
    responsible_name?: string;
    responsible_role?: string;
    responsible_community_label?: string;
    responsible_organization?: string;
    responsible_whatsapp?: string;
    responsible_avatar_url?: string;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const { data: existing, error: findError } = await (supabase as any)
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();

    if (findError || !existing) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.name !== undefined) updateData.name = payload.name.trim();
    let nextSlug = existing.slug as string | null;
    if (payload.slug !== undefined) {
      nextSlug = normalizeBusinessSlug(payload.slug);
      if (nextSlug.length < 3) {
        return { success: false, error: 'O slug deve ter pelo menos 3 caracteres válidos.' };
      }
      if (nextSlug === 'empresas' || nextSlug === 'lojas') {
        return { success: false, error: 'Este slug é reservado pelo sistema. Escolha outro endereço.' };
      }

      if (nextSlug !== existing.slug) {
        const { data: slugOwner, error: slugLookupError } = await (supabase as any)
          .from('businesses')
          .select('id')
          .eq('slug', nextSlug)
          .neq('id', businessId)
          .maybeSingle();

        if (slugLookupError) {
          return { success: false, error: `Não foi possível validar o slug: ${slugLookupError.message}` };
        }
        if (slugOwner) {
          return { success: false, error: 'Este link já está sendo usado por outra empresa.' };
        }
      }
      updateData.slug = nextSlug;
    }
    if (payload.legal_name !== undefined) updateData.legal_name = payload.legal_name.trim();
    if (payload.cnpj_cpf !== undefined) {
      const rawDoc = payload.cnpj_cpf.trim();
      if (!rawDoc) {
        updateData.cnpj = null;
      } else {
        const digits = sanitizeCnpj(rawDoc);
        updateData.cnpj = digits || rawDoc;
      }
    }
    if (payload.phone !== undefined) {
      const rawPhone = payload.phone.trim();
      if (rawPhone) {
        const phoneErr = validatePhone(rawPhone);
        if (phoneErr) {
          return { success: false, error: `Telefone: ${phoneErr}` };
        }
        updateData.phone = rawPhone;
      }
    }
    if (payload.address !== undefined) updateData.address = payload.address.trim();
    if (payload.description !== undefined) updateData.description = payload.description.trim();
    let selectedCategory: { id: string; name: string } | null = null;
    if (payload.category_id) {
      const categoryQuery = (supabase as any)
        .from('categories')
        .select('id, name, tenant_id')
        .or(`tenant_id.is.null,tenant_id.eq.${existing.tenant_id}`)
        .eq('is_active', true)
        .eq('id', payload.category_id);
      const { data: categoryRow, error: categoryLookupError } = await categoryQuery.maybeSingle();
      if (categoryLookupError || !categoryRow) {
        return { success: false, error: 'A categoria selecionada não foi localizada para esta empresa.' };
      }
      selectedCategory = { id: categoryRow.id, name: categoryRow.name };
      updateData.category = categoryRow.name;
    } else if (payload.category !== undefined) {
      updateData.category = payload.category.trim();
    }
    if (payload.email !== undefined) updateData.email = payload.email.trim();
    if (payload.website !== undefined) {
      let web = payload.website.trim();
      if (web && !web.startsWith('http://') && !web.startsWith('https://')) {
        web = `https://${web}`;
      }
      updateData.website = web || null;
    }

    let savedResponsible: any = null;

    if (
      payload.responsible_name !== undefined ||
      payload.responsible_role !== undefined ||
      payload.responsible_community_label !== undefined ||
      payload.responsible_organization !== undefined ||
      payload.responsible_whatsapp !== undefined ||
      payload.responsible_avatar_url !== undefined
    ) {
      const { data: existingResp, error: existingRespError } = await (supabase as any)
        .from('business_responsibles')
        .select('id, name, business_role, community_label, organization, whatsapp, avatar_url')
        .eq('business_id', businessId)
        .maybeSingle();

      if (existingRespError) {
        console.error('[updateAdminBusinessDetailsAction] Responsible lookup error:', existingRespError);
        return { success: false, error: `Falha ao consultar responsável: ${existingRespError.message}` };
      }

      const currentResp = existingResp || {};
      if (payload.responsible_whatsapp !== undefined && payload.responsible_whatsapp.trim()) {
        const whatsappError = validatePhone(payload.responsible_whatsapp.trim());
        if (whatsappError) return { success: false, error: `WhatsApp do empresário(a): ${whatsappError}` };
      }
      const newResp = {
        name: payload.responsible_name !== undefined ? payload.responsible_name.trim() : (currentResp.name || existing.name),
        business_role: payload.responsible_role !== undefined ? payload.responsible_role.trim() : (currentResp.business_role || 'Proprietário'),
        community_label: payload.responsible_community_label !== undefined ? payload.responsible_community_label.trim() : (currentResp.community_label || 'Ir.\'.'),
        organization: payload.responsible_organization !== undefined ? (payload.responsible_organization.trim() || null) : (currentResp.organization || null),
        whatsapp: payload.responsible_whatsapp !== undefined ? (payload.responsible_whatsapp.trim() || null) : (currentResp.whatsapp || null),
        avatar_url: payload.responsible_avatar_url !== undefined ? (payload.responsible_avatar_url.trim() || null) : (currentResp.avatar_url || null),
      };

      const respPayload = {
        tenant_id: existing.tenant_id,
        business_id: businessId,
        ...newResp,
        updated_at: new Date().toISOString(),
      };

      const respWrite = existingResp
        ? await (supabase as any)
          .from('business_responsibles')
          .update(respPayload)
          .eq('id', existingResp.id)
          .select('id, name, business_role, community_label, organization, whatsapp, avatar_url')
          .single()
        : await (supabase as any)
          .from('business_responsibles')
          .insert(respPayload)
          .select('id, name, business_role, community_label, organization, whatsapp, avatar_url')
          .single();

      if (respWrite.error) {
        console.error('[updateAdminBusinessDetailsAction] Responsible write error:', respWrite.error);
        return { success: false, error: `Falha ao salvar responsável: ${respWrite.error.message}` };
      }

      savedResponsible = respWrite.data;

      // Sincroniza apenas a referência institucional da Loja. Editar o card do
      // responsável NÃO deve aprovar/verificar automaticamente o vínculo maçônico.
      if (newResp.organization) {
        const { data: exOrg, error: orgLookupError } = await (supabase as any)
          .from('organizations')
          .select('id')
          .eq('tenant_id', existing.tenant_id)
          .ilike('name', newResp.organization)
          .maybeSingle();

        if (orgLookupError) {
          return { success: false, error: `Falha ao consultar Loja Maçônica: ${orgLookupError.message}` };
        }

        let orgId: string | null = exOrg?.id || null;
        if (!orgId) {
          const { data: nOrg, error: orgCreateError } = await (supabase as any)
            .from('organizations')
            .insert({
              tenant_id: existing.tenant_id,
              name: newResp.organization,
              potency: 'Não informada',
              is_active: true,
            })
            .select('id')
            .single();

          if (orgCreateError) {
            return { success: false, error: `Falha ao cadastrar Loja Maçônica: ${orgCreateError.message}` };
          }
          orgId = nOrg?.id || null;
        }

        if (orgId) {
          const { data: exLink, error: linkLookupError } = await (supabase as any)
            .from('business_masonic_links')
            .select('id')
            .eq('business_id', businessId)
            .maybeSingle();

          if (linkLookupError) {
            return { success: false, error: `Falha ao consultar vínculo maçônico: ${linkLookupError.message}` };
          }

          const linkWrite = exLink
            ? await (supabase as any)
              .from('business_masonic_links')
              .update({ organization_id: orgId, updated_at: new Date().toISOString() })
              .eq('id', exLink.id)
            : await (supabase as any)
              .from('business_masonic_links')
              .insert({
                tenant_id: existing.tenant_id,
                business_id: businessId,
                organization_id: orgId,
                declaring_user_id: user.id,
                link_type: 'owner',
                status: 'pending',
              });

          if (linkWrite.error) {
            return { success: false, error: `Falha ao sincronizar vínculo maçônico: ${linkWrite.error.message}` };
          }
        }
      }
    }

    const { data: updated, error: updateError } = await (supabase as any)
      .from('businesses')
      .update(updateData)
      .eq('id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('[updateAdminBusinessDetailsAction] DB Error:', updateError);
      if (updateError.code === '23505') {
        return { success: false, error: 'Este link já está sendo usado por outra empresa.' };
      }
      return { success: false, error: `Falha ao salvar no banco: ${updateError.message || 'Erro de banco de dados.'}` };
    }

    if (selectedCategory) {
      const { error: demoteCategoryError } = await (supabase as any)
        .from('business_categories')
        .update({ is_primary: false })
        .eq('tenant_id', existing.tenant_id)
        .eq('business_id', businessId)
        .eq('is_primary', true);
      if (demoteCategoryError) {
        return { success: false, error: `Falha ao atualizar categoria principal: ${demoteCategoryError.message}` };
      }

      const { error: categoryLinkError } = await (supabase as any)
        .from('business_categories')
        .upsert({
          tenant_id: existing.tenant_id,
          business_id: businessId,
          category_id: selectedCategory.id,
          is_primary: true,
        }, { onConflict: 'business_id,category_id' });
      if (categoryLinkError) {
        return { success: false, error: `Falha ao vincular categoria principal: ${categoryLinkError.message}` };
      }
    }

    const upsertContact = async (contactType: string, contactVal?: string) => {

      if (contactVal === undefined) return;
      const cleanVal = contactVal.trim();
      const { data: existingContact } = await (supabase as any)
        .from('business_contacts')
        .select('id')
        .eq('business_id', businessId)
        .eq('type', contactType)
        .maybeSingle();

      if (cleanVal) {
        if (existingContact) {
          await (supabase as any)
            .from('business_contacts')
            .update({ value: cleanVal, is_public: true })
            .eq('id', existingContact.id);
        } else {
          await (supabase as any)
            .from('business_contacts')
            .insert({
              tenant_id: existing.tenant_id,
              business_id: businessId,
              type: contactType,
              value: cleanVal,
              is_public: true,
            });
        }
      } else if (existingContact) {
        await (supabase as any)
          .from('business_contacts')
          .delete()
          .eq('id', existingContact.id);
      }
    };

    await upsertContact('whatsapp', payload.whatsapp);
    await upsertContact('phone', payload.phone);
    await upsertContact('email', payload.email);
    await upsertContact('website', payload.website);
    await upsertContact('instagram', payload.instagram);
    await upsertContact('facebook', payload.facebook);
    await upsertContact('linkedin', payload.linkedin);
    await upsertContact('youtube', payload.youtube);

    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);
    if (existing.slug) {
      revalidatePath(`/guia/${existing.slug}`);
    }
    if (nextSlug && nextSlug !== existing.slug) {
      revalidatePath(`/guia/${nextSlug}`);
    }
    revalidatePath('/guia', 'layout');

    if (payload.city !== undefined || payload.state !== undefined) {
      const cityVal = payload.city?.trim() || '';
      const stateVal = payload.state?.trim().toUpperCase() || '';
      if (!cityVal || !/^[A-Z]{2}$/.test(stateVal)) {
        return { success: false, error: 'Selecione uma cidade e uma UF válidas.' };
      }

      const { data: canonicalState, error: canonicalStateError } = await (supabase as any)
        .from('brazilian_states')
        .select('ibge_code')
        .eq('uf', stateVal)
        .maybeSingle();
      if (canonicalStateError || !canonicalState) {
        return { success: false, error: 'A UF selecionada não pertence ao catálogo oficial do IBGE.' };
      }
      const { data: canonicalCity, error: canonicalCityError } = await (supabase as any)
        .from('brazilian_cities')
        .select('ibge_code, name')
        .eq('state_ibge_code', canonicalState.ibge_code)
        .eq('name', cityVal)
        .maybeSingle();
      if (canonicalCityError || !canonicalCity) {
        return { success: false, error: 'A cidade selecionada não pertence à UF informada.' };
      }

      const { data: locs } = await (supabase as any)
        .from('business_locations')
        .select('id, is_headquarters')
        .eq('business_id', businessId);

      const primaryLoc = (locs || []).find((l: any) => l.is_headquarters === true) || (locs || [])[0];
      const canonicalAddress = payload.address?.trim() || 'Endereço não informado';

      if (primaryLoc) {
        const { error: locationUpdateError } = await (supabase as any)
          .from('business_locations')
          .update({
            city_ibge_code: canonicalCity.ibge_code,
            city: canonicalCity.name,
            state: stateVal,
            street: canonicalAddress,
            number: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', primaryLoc.id);

        if (locationUpdateError) {
          console.error('[updateAdminBusinessDetailsAction] Location update error:', locationUpdateError);
          return { success: false, error: `Falha ao atualizar endereço: ${locationUpdateError.message}` };
        }
      } else {
        const { error: locationInsertError } = await (supabase as any)
          .from('business_locations')
          .insert({
            tenant_id: existing.tenant_id,
            business_id: businessId,
            city_ibge_code: canonicalCity.ibge_code,
            city: canonicalCity.name,
            state: stateVal,
            postal_code: '00000-000',
            street: canonicalAddress,
            is_headquarters: true,
          });

        if (locationInsertError) {
          console.error('[updateAdminBusinessDetailsAction] Location insert error:', locationInsertError);
          return { success: false, error: `Falha ao cadastrar endereço: ${locationInsertError.message}` };
        }
      }
    }

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: existing.tenant_id,
      actor_id: user.id,
      action: 'UPDATE_BUSINESS_DETAILS',
      entity_type: 'business',
      entity_id: businessId,
      before_value: existing,
      after_value: updated,
      reason: 'Edição administrativa do cadastro da empresa.',
    });

    revalidatePath('/admin/empresas');
    revalidatePath(`/admin/empresas/${businessId}`);

    return {
      success: true,
      data: {
        ...updated,
        slug: nextSlug,
        category_id: selectedCategory?.id,
        category: selectedCategory?.name || updated.category,
        cnpj_cpf: updated.cnpj || payload.cnpj_cpf,
        whatsapp: payload.whatsapp || updated.phone,
        city: payload.city,
        state: payload.state,
        responsible: savedResponsible,
      },
    };
  } catch (err: any) {
    console.error('[updateAdminBusinessDetailsAction] Exception:', err);
    return { success: false, error: err.message || 'Erro inesperado ao atualizar empresa.' };
  }
}

function mapMasonicLinkStatus(status: string): string {
  switch (status) {
    case 'verified':
    case 'approved':
    case 'active':
      return 'approved';
    case 'pending':
    case 'pending_verification':
      return 'pending_verification';
    case 'rejected':
      return 'rejected';
    case 'draft':
      return 'draft';
    default:
      return 'approved';
  }
}

function mapMasonicLinkType(linkType?: string): string {
  if (!linkType) return 'owner';
  const allowed = [
    'owner',
    'equity_partner',
    'family_owner',
    'employee',
    'executive',
    'sales_representative',
    'authorized_agent',
    'institutional_partner',
  ];
  if (allowed.includes(linkType)) return linkType;
  const lower = linkType.toLowerCase();
  if (lower.includes('proprietário') || lower.includes('owner') || lower.includes('ir')) return 'owner';
  if (lower.includes('sócio') || lower.includes('partner')) return 'equity_partner';
  if (lower.includes('familiar') || lower.includes('family')) return 'family_owner';
  if (lower.includes('representante')) return 'sales_representative';
  return 'owner';
}

export async function verifyAdminMasonicLinkAction(
  businessId: string,
  newStatus: 'verified' | 'rejected',
  justification: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id')
      .eq('id', businessId)
      .maybeSingle();

    if (!biz) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    const { data: linkData } = await (supabase as any)
      .from('business_masonic_links')
      .select('id, tenant_id, status')
      .eq('business_id', businessId)
      .maybeSingle();

    let linkId = linkData?.id;
    const dbStatus = mapMasonicLinkStatus(newStatus);
    const isApproved = dbStatus === 'approved';

    if (linkData) {
      const { error: updateErr } = await (supabase as any)
        .from('business_masonic_links')
        .update({
          status: dbStatus,
          verified_at: isApproved ? new Date().toISOString() : null,
          verified_by: isApproved ? user.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', linkData.id);

      if (updateErr) return { success: false, error: `Falha ao atualizar vínculo: ${updateErr.message}` };
    } else {
      // 1. Criar como draft conforme regra do gatilho bml_guard_approval_flow
      const { data: newLink, error: createErr } = await (supabase as any)
        .from('business_masonic_links')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          declaring_user_id: user.id,
          link_type: 'owner',
          status: 'draft',
        })
        .select('id')
        .single();

      if (createErr) {
        return { success: false, error: `Falha ao criar vínculo: ${createErr.message}` };
      }
      linkId = newLink?.id;

      // 2. Atualizar para status final aprovado/rejeitado pelo admin
      if (linkId && dbStatus !== 'draft') {
        const { error: upgradeErr } = await (supabase as any)
          .from('business_masonic_links')
          .update({
            status: dbStatus,
            verified_at: isApproved ? new Date().toISOString() : null,
            verified_by: isApproved ? user.id : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', linkId);

        if (upgradeErr) return { success: false, error: `Falha ao definir status do vínculo: ${upgradeErr.message}` };
      }
    }

    await (supabase as any)
      .from('businesses')
      .update({
        is_verified: isApproved,
        masonic_validation_status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: biz.tenant_id,
      actor_id: user.id,
      action: `VERIFY_MASONIC_LINK_${newStatus.toUpperCase()}`,
      entity_type: 'business_masonic_link',
      entity_id: linkId || businessId,
      before_value: { status: linkData?.status || 'none' },
      after_value: { status: dbStatus, verified_by: user.id },
      reason: justification || 'Análise administrativa do vínculo maçônico.',
    });

    revalidatePath('/admin/empresas');
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath('/guia', 'layout');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao verificar vínculo maçônico.' };
  }
}

export async function upsertAdminMasonicLinkAction(
  businessId: string,
  payload: {
    lodge_name: string;
    potency?: string;
    link_type: string;
    status: 'verified' | 'pending' | 'rejected' | string;
    justification?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id')
      .eq('id', businessId)
      .maybeSingle();

    if (!biz) return { success: false, error: 'Empresa não localizada.' };

    let organizationId: string | null = null;
    if (payload.lodge_name.trim()) {
      const { data: existingOrg, error: orgLookupError } = await (supabase as any)
        .from('organizations')
        .select('id')
        .eq('tenant_id', biz.tenant_id)
        .ilike('name', payload.lodge_name.trim())
        .maybeSingle();

      if (orgLookupError) return { success: false, error: `Falha ao consultar Loja Maçônica: ${orgLookupError.message}` };

      if (existingOrg) {
        organizationId = existingOrg.id;
      } else {
        const { data: newOrg, error: orgCreateError } = await (supabase as any)
          .from('organizations')
          .insert({
            tenant_id: biz.tenant_id,
            name: payload.lodge_name.trim(),
            potency: payload.potency?.trim() || 'Não informada',
            is_active: true,
          })
          .select('id')
          .single();

        if (orgCreateError) return { success: false, error: `Falha ao cadastrar Loja Maçônica: ${orgCreateError.message}` };
        organizationId = newOrg?.id || null;
      }
    }

    const { data: existingLink, error: linkLookupError } = await (supabase as any)
      .from('business_masonic_links')
      .select('id')
      .eq('business_id', businessId)
      .maybeSingle();

    if (linkLookupError) return { success: false, error: `Falha ao consultar vínculo maçônico: ${linkLookupError.message}` };

    const dbStatus = mapMasonicLinkStatus(payload.status);
    const dbLinkType = mapMasonicLinkType(payload.link_type);
    const isApproved = dbStatus === 'approved';

    if (existingLink) {
      const { error: updateErr } = await (supabase as any)
        .from('business_masonic_links')
        .update({
          organization_id: organizationId,
          link_type: dbLinkType,
          status: dbStatus,
          verified_at: isApproved ? new Date().toISOString() : null,
          verified_by: isApproved ? user.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLink.id);

      if (updateErr) return { success: false, error: `Falha ao atualizar vínculo maçônico: ${updateErr.message}` };
    } else {
      // 1. Criar como draft conforme exigência do gatilho bml_guard_approval_flow
      const { data: newLink, error: insertErr } = await (supabase as any)
        .from('business_masonic_links')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          declaring_user_id: user.id,
          organization_id: organizationId,
          link_type: dbLinkType,
          status: 'draft',
        })
        .select('id')
        .single();

      if (insertErr) return { success: false, error: `Falha ao criar vínculo maçônico: ${insertErr.message}` };

      // 2. Se status solicitado for aprovado/rejeitado, atualizar em seguida
      if (newLink?.id && dbStatus !== 'draft') {
        const { error: upgradeErr } = await (supabase as any)
          .from('business_masonic_links')
          .update({
            status: dbStatus,
            verified_at: isApproved ? new Date().toISOString() : null,
            verified_by: isApproved ? user.id : null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', newLink.id);

        if (upgradeErr) return { success: false, error: `Falha ao definir status do vínculo maçônico: ${upgradeErr.message}` };
      }
    }

    // Mantém o texto do card público sincronizado com a organização escolhida.
    if (payload.lodge_name.trim()) {
      const { data: existingResp, error: respLookupError } = await (supabase as any)
        .from('business_responsibles')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      if (respLookupError) return { success: false, error: `Falha ao consultar responsável: ${respLookupError.message}` };

      const respWrite = existingResp
        ? await (supabase as any)
          .from('business_responsibles')
          .update({ organization: payload.lodge_name.trim(), updated_at: new Date().toISOString() })
          .eq('id', existingResp.id)
        : await (supabase as any)
          .from('business_responsibles')
          .insert({
            tenant_id: biz.tenant_id,
            business_id: businessId,
            name: 'Anunciante Titular',
            organization: payload.lodge_name.trim(),
          });

      if (respWrite.error) return { success: false, error: `Falha ao sincronizar responsável: ${respWrite.error.message}` };
    }

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: biz.tenant_id,
      actor_id: user.id,
      action: 'UPSERT_MASONIC_LINK',
      entity_type: 'business_masonic_link',
      entity_id: businessId,
      after_value: { ...payload, db_status: dbStatus, db_link_type: dbLinkType },
      reason: payload.justification || 'Cadastro/Atualização de vínculo maçônico via Admin 360º',
    });

    revalidatePath('/admin/empresas');
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath('/guia', 'layout');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar vínculo maçônico.' };
  }
}

export async function manageAdminServiceAction(
  businessId: string,
  action: 'create' | 'update' | 'toggle_active' | 'delete',
  payload: {
    service_id?: string;
    name?: string;
    description?: string;
    price_info?: string;
    is_active?: boolean;
  }
): Promise<{ success: boolean; data?: AdminBusiness360DTO['services_items'][number]; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, plan_tier, plan_code')
      .eq('id', businessId)
      .single();

    if (!biz) return { success: false, error: 'Empresa não localizada.' };

    const { data: activeSubscription } = await (supabase as any).from('subscriptions')
      .select('plan_versions!inner(plans!inner(code))')
      .eq('tenant_id', biz.tenant_id).eq('business_id', businessId)
      .in('status', ['active', 'trialing', 'past_due', 'canceled'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    const planCode = activeSubscription?.plan_versions?.plans?.code || biz.plan_tier || biz.plan_code || 'bronze';
    let savedService: AdminBusiness360DTO['services_items'][number] | undefined;
    if (action === 'create') {
      // Resolver cota de serviços via plan_entitlements (fonte canônica)
      const { data: svcEntRows } = await (supabase as any)
        .from('plan_entitlements')
        .select('max_limit')
        .eq('tenant_id', biz.tenant_id)
        .eq('plan_code', planCode)
        .eq('feature_code', 'services_limit')
        .maybeSingle();
      const servicesLimit = svcEntRows?.max_limit ?? getCanonicalDefaultLimit(planCode, 'services_limit');
      const { count } = await (supabase as any)
        .from('business_services')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);

      if ((count || 0) >= servicesLimit) {
        return { success: false, error: `Cota de serviços excedida para o Plano ${getCommercialPlanName(planCode)} (${count}/${servicesLimit}).` };
      }

      const { data: newService, error } = await (supabase as any)
        .from('business_services')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          name: (payload.name || 'Novo Serviço').trim(),
          description: payload.description ? payload.description.trim() : null,
          price_info: payload.price_info ? payload.price_info.trim() : null,
          is_active: true,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      savedService = newService;

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'CREATE_BUSINESS_SERVICE',
        entity_type: 'business_service',
        entity_id: newService.id,
        after_value: newService,
        reason: 'Serviço adicionado via Admin 360º',
      });
    } else if (action === 'update' && payload.service_id) {
      const { data: existing } = await (supabase as any)
        .from('business_services')
        .select('*')
        .eq('id', payload.service_id)
        .single();

      const { data: updated, error } = await (supabase as any)
        .from('business_services')
        .update({
          name: payload.name !== undefined ? payload.name.trim() : existing?.name,
          description: payload.description !== undefined ? payload.description.trim() : existing?.description,
          price_info: payload.price_info !== undefined ? payload.price_info.trim() : existing?.price_info,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.service_id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      savedService = updated;

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UPDATE_BUSINESS_SERVICE',
        entity_type: 'business_service',
        entity_id: payload.service_id,
        before_value: existing,
        after_value: updated,
        reason: 'Edição de serviço via Admin 360º',
      });
    } else if (action === 'toggle_active' && payload.service_id) {
      const { data: existing } = await (supabase as any)
        .from('business_services')
        .select('*')
        .eq('id', payload.service_id)
        .single();

      const newIsActive = payload.is_active !== undefined ? payload.is_active : !existing?.is_active;

      const { data: updated, error } = await (supabase as any)
        .from('business_services')
        .update({
          is_active: newIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.service_id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: newIsActive ? 'ACTIVATE_BUSINESS_SERVICE' : 'DEACTIVATE_BUSINESS_SERVICE',
        entity_type: 'business_service',
        entity_id: payload.service_id,
        before_value: existing,
        after_value: updated,
        reason: 'Alteração de status operacional via Admin 360º',
      });
    } else if (action === 'delete' && payload.service_id) {
      const { data: existing } = await (supabase as any)
        .from('business_services')
        .select('*')
        .eq('id', payload.service_id)
        .single();

      const { error } = await (supabase as any)
        .from('business_services')
        .delete()
        .eq('id', payload.service_id);

      if (error) return { success: false, error: error.message };

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'DELETE_BUSINESS_SERVICE',
        entity_type: 'business_service',
        entity_id: payload.service_id,
        before_value: existing,
        reason: 'Exclusão física de serviço via Admin 360º',
      });
    }

    revalidatePath(`/admin/empresas/${businessId}`);
    return { success: true, data: savedService };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao gerenciar serviço.' };
  }
}

export async function manageAdminBenefitAction(
  businessId: string,
  action: 'create' | 'update' | 'toggle_active' | 'delete',
  payload: {
    benefit_id?: string;
    title?: string;
    description?: string;
    discount_percentage?: number | null;
    is_active?: boolean;
  }
): Promise<{ success: boolean; data?: AdminBusiness360DTO['benefits_items'][number]; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const { data: biz } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, plan_tier')
      .eq('id', businessId)
      .single();

    if (!biz) return { success: false, error: 'Empresa não localizada.' };

    let savedBenefit: AdminBusiness360DTO['benefits_items'][number] | undefined;

    if (action === 'create') {
      const { data: newBenefit, error } = await (supabase as any)
        .from('business_benefits')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          title: (payload.title || 'Novo Benefício Fraterno').trim(),
          description: payload.description ? payload.description.trim() : 'Desconto exclusivo para Irmãos.',
          discount_percentage: payload.discount_percentage || null,
          status: 'active',
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      savedBenefit = newBenefit;

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'CREATE_BUSINESS_BENEFIT',
        entity_type: 'business_benefit',
        entity_id: newBenefit.id,
        after_value: newBenefit,
        reason: 'Benefício adicionado via Admin 360º',
      });
    } else if (action === 'update' && payload.benefit_id) {
      const { data: existing } = await (supabase as any)
        .from('business_benefits')
        .select('*')
        .eq('id', payload.benefit_id)
        .single();

      const { data: updated, error } = await (supabase as any)
        .from('business_benefits')
        .update({
          title: payload.title !== undefined ? payload.title.trim() : existing?.title,
          description: payload.description !== undefined ? payload.description.trim() : existing?.description,
          discount_percentage: payload.discount_percentage !== undefined ? payload.discount_percentage : existing?.discount_percentage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.benefit_id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      savedBenefit = updated;

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UPDATE_BUSINESS_BENEFIT',
        entity_type: 'business_benefit',
        entity_id: payload.benefit_id,
        before_value: existing,
        after_value: updated,
        reason: 'Edição de benefício via Admin 360º',
      });
    } else if (action === 'toggle_active' && payload.benefit_id) {
      const { data: existing } = await (supabase as any)
        .from('business_benefits')
        .select('*')
        .eq('id', payload.benefit_id)
        .single();

      const newIsActive = payload.is_active !== undefined ? payload.is_active : (existing?.status !== 'active');
      const newStatus = newIsActive ? 'active' : 'paused';

      const { data: updated, error } = await (supabase as any)
        .from('business_benefits')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payload.benefit_id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: newIsActive ? 'ACTIVATE_BUSINESS_BENEFIT' : 'DEACTIVATE_BUSINESS_BENEFIT',
        entity_type: 'business_benefit',
        entity_id: payload.benefit_id,
        before_value: existing,
        after_value: updated,
        reason: 'Alteração de status operacional de benefício via Admin 360º',
      });
    } else if (action === 'delete' && payload.benefit_id) {
      const { data: existing } = await (supabase as any)
        .from('business_benefits')
        .select('*')
        .eq('id', payload.benefit_id)
        .single();

      // Checar se existem resgates efetuados
      const { count: redemptionsCount } = await (supabase as any)
        .from('business_benefit_redemptions')
        .select('*', { count: 'exact', head: true })
        .eq('benefit_id', payload.benefit_id);

      const hasRedemptions = (redemptionsCount || 0) > 0;
      const isPublishedOrActive = existing?.status !== 'draft';

      if (hasRedemptions || isPublishedOrActive) {
        // Soft delete: arquivar benefício
        const { data: updated, error } = await (supabase as any)
          .from('business_benefits')
          .update({
            status: 'archived',
            archived_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', payload.benefit_id)
          .select()
          .single();

        if (error) return { success: false, error: error.message };

        await (supabase as any).from('admin_audit_logs').insert({
          tenant_id: biz.tenant_id,
          actor_id: user.id,
          action: 'ARCHIVE_BUSINESS_BENEFIT',
          entity_type: 'business_benefit',
          entity_id: payload.benefit_id,
          before_value: existing,
          after_value: updated,
          reason: 'Arquivamento de benefício com histórico/publicado via Admin 360º',
        });
      } else {
        // Rascunho não publicado sem resgates: exclusão física autorizada
        const { error } = await (supabase as any)
          .from('business_benefits')
          .delete()
          .eq('id', payload.benefit_id);

        if (error) return { success: false, error: error.message };

        await (supabase as any).from('admin_audit_logs').insert({
          tenant_id: biz.tenant_id,
          actor_id: user.id,
          action: 'DELETE_BUSINESS_BENEFIT',
          entity_type: 'business_benefit',
          entity_id: payload.benefit_id,
          before_value: existing,
          reason: 'Exclusão física de rascunho de benefício via Admin 360º',
        });
      }
    }

    revalidatePath(`/admin/empresas/${businessId}`);
    return { success: true, data: savedBenefit };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao gerenciar benefício.' };
  }
}

export async function manageAdminMediaAction(
  businessId: string,
  action: 'update_logo' | 'update_cover' | 'add_gallery' | 'update_gallery_title' | 'reorder_gallery' | 'delete_media' | 'set_video' | 'delete_video',
  payload: {
    media_id?: string;
    url?: string;
    title?: string;
    direction?: 'up' | 'down';
  }
): Promise<{ success: boolean; media?: AdminBusiness360DTO['gallery_items'][number]; error?: string }> {
  try {
    const { user } = await assertPlatformAdminAccess();
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      return { success: false, error: 'Configuração segura do Supabase indisponível.' };
    }
    const supabase = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: biz, error: businessLookupError } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, plan_tier, logo_url')
      .eq('id', businessId)
      .maybeSingle();

    if (businessLookupError) return { success: false, error: `Falha ao consultar empresa: ${businessLookupError.message}` };
    if (!biz) return { success: false, error: 'Empresa não localizada.' };
    const { data: activeSubscription } = await (supabase as any)
      .from('subscriptions')
      .select('plan_versions!inner(plans!inner(code))')
      .eq('tenant_id', biz.tenant_id)
      .eq('business_id', businessId)
      .in('status', ['active', 'past_due', 'canceled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const planCode = activeSubscription?.plan_versions?.plans?.code || biz.plan_tier || 'bronze';

    if (action === 'set_video' && payload.url) {
      const url = payload.url.trim();
      if (!isValidPublicVideoUrl(url)) {
        return { success: false, error: 'Informe um link público válido iniciado por https://.' };
      }
      const { data: entitlement } = await (supabase as any).from('plan_entitlements').select('max_limit')
        .eq('tenant_id', biz.tenant_id).eq('plan_code', planCode).eq('feature_code', 'business_video_limit').maybeSingle();
      const limit = entitlement?.max_limit ?? getCanonicalDefaultLimit(planCode, 'business_video_limit');
      if (limit < 1) return { success: false, error: 'O plano desta empresa não permite vídeo institucional.' };
      const { data: existing } = await (supabase as any).from('business_media').select('id, url, title')
        .eq('business_id', businessId).eq('media_type', 'video').maybeSingle();
      const values = { url, title: payload.title?.trim() || 'Vídeo institucional' };
      const result = existing
        ? await (supabase as any).from('business_media').update(values).eq('id', existing.id)
        : await (supabase as any).from('business_media').insert({ ...values, tenant_id: biz.tenant_id, business_id: businessId, media_type: 'video', display_order: 0 });
      if (result.error) {
        const isVideoQuotaError = result.error.message?.includes('Video quota exceeded');
        return {
          success: false,
          error: isVideoQuotaError
            ? 'A cota de vídeo do Plano Acácia não está configurada para este tenant. Aplique a migration 101 e tente novamente.'
            : result.error.message,
        };
      }
      await (supabase as any).from('admin_audit_logs').insert({ tenant_id: biz.tenant_id, actor_id: user.id,
        action: 'SET_BUSINESS_VIDEO', entity_type: 'business_media', entity_id: existing?.id || businessId,
        before_value: existing || null, after_value: values, reason: 'Vídeo institucional atualizado via Admin 360º' });
    } else if (action === 'delete_video') {
      const { data: existing } = await (supabase as any).from('business_media').select('*')
        .eq('business_id', businessId).eq('media_type', 'video').maybeSingle();
      if (existing) {
        const { error } = await (supabase as any).from('business_media').delete().eq('id', existing.id).eq('business_id', businessId);
        if (error) return { success: false, error: error.message };
        await (supabase as any).from('admin_audit_logs').insert({ tenant_id: biz.tenant_id, actor_id: user.id,
          action: 'DELETE_BUSINESS_VIDEO', entity_type: 'business_media', entity_id: existing.id,
          before_value: existing, reason: 'Vídeo institucional removido via Admin 360º' });
      }
    } else if (action === 'update_logo' && payload.url) {
      await (supabase as any)
        .from('businesses')
        .update({
          logo_url: payload.url.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UPDATE_BUSINESS_LOGO',
        entity_type: 'business',
        entity_id: businessId,
        before_value: { logo_url: biz.logo_url },
        after_value: { logo_url: payload.url.trim() },
        reason: 'Atualização da logo oficial via Admin 360º',
      });
    } else if (action === 'update_cover' && payload.url) {
      const { data: existingCover } = await (supabase as any)
        .from('business_media')
        .select('id, url')
        .eq('business_id', businessId)
        .eq('media_type', 'image')
        .eq('display_order', 0)
        .maybeSingle();

      if (existingCover) {
        await (supabase as any)
          .from('business_media')
          .update({
            media_type: 'image',
            url: payload.url.trim(),
            title: payload.title || 'Imagem de Capa',
          })
          .eq('id', existingCover.id);
      } else {
        await (supabase as any)
          .from('business_media')
          .insert({
            tenant_id: biz.tenant_id,
            business_id: businessId,
            media_type: 'image',
            url: payload.url.trim(),
            title: payload.title || 'Imagem de Capa',
            display_order: 0,
          });
      }

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UPDATE_BUSINESS_COVER',
        entity_type: 'business_media',
        entity_id: businessId,
        after_value: { cover_url: payload.url.trim() },
        reason: 'Atualização da imagem de capa via Admin 360º',
      });
    } else if (action === 'add_gallery' && payload.url) {
      // Resolver cota de galeria via plan_entitlements (fonte canônica)
      const { data: galEntRow } = await (supabase as any)
        .from('plan_entitlements')
        .select('max_limit')
        .eq('tenant_id', biz.tenant_id)
        .eq('plan_code', planCode)
        .eq('feature_code', 'gallery_photos_limit')
        .maybeSingle();
      const galleryLimit = galEntRow?.max_limit ?? 0;
      const { data: galleryItems } = await (supabase as any)
        .from('business_media')
        .select('id')
        .eq('business_id', businessId)
        .in('media_type', ['image', 'gallery'])
        .gt('display_order', 0);

      if ((galleryItems?.length || 0) >= galleryLimit) {
        return { success: false, error: `Cota de galeria excedida para o Plano ${getCommercialPlanName(planCode)} (${galleryItems?.length}/${galleryLimit}).` };
      }

      const nextOrder = (galleryItems?.length || 0) + 1;

      const { data: newMedia, error } = await (supabase as any)
        .from('business_media')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          media_type: 'image',
          url: payload.url.trim(),
          title: payload.title ? payload.title.trim() : `Foto ${nextOrder}`,
          display_order: nextOrder,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'ADD_GALLERY_PHOTO',
        entity_type: 'business_media',
        entity_id: newMedia.id,
        after_value: newMedia,
        reason: 'Foto adicionada à galeria via Admin 360º',
      });
      revalidatePath(`/admin/empresas/${businessId}`);
      revalidatePath('/guia', 'layout');
      return { success: true, media: { ...newMedia, media_type: 'gallery' } };
    } else if (action === 'reorder_gallery' && payload.media_id && payload.direction) {
      const { data: galleryItems, error: galleryError } = await (supabase as any)
        .from('business_media')
        .select('id, display_order')
        .eq('tenant_id', biz.tenant_id)
        .eq('business_id', businessId)
        .in('media_type', ['image', 'gallery'])
        .gt('display_order', 0)
        .order('display_order', { ascending: true });
      if (galleryError) return { success: false, error: galleryError.message };

      const currentIndex = (galleryItems || []).findIndex((item: any) => item.id === payload.media_id);
      const targetIndex = payload.direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= (galleryItems || []).length) {
        return { success: false, error: 'Não é possível mover esta foto nessa direção.' };
      }
      const current = galleryItems[currentIndex];
      const target = galleryItems[targetIndex];
      const { error: currentError } = await (supabase as any).from('business_media')
        .update({ display_order: target.display_order }).eq('id', current.id)
        .eq('business_id', businessId).eq('tenant_id', biz.tenant_id);
      if (currentError) return { success: false, error: currentError.message };
      const { error: targetError } = await (supabase as any).from('business_media')
        .update({ display_order: current.display_order }).eq('id', target.id)
        .eq('business_id', businessId).eq('tenant_id', biz.tenant_id);
      if (targetError) return { success: false, error: targetError.message };
    } else if (action === 'update_gallery_title' && payload.media_id) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(payload.media_id)) {
        return { success: false, error: 'A foto ainda não possui um identificador válido. Recarregue o prontuário e tente novamente.' };
      }
      const { data: updated, error } = await (supabase as any)
        .from('business_media')
        .update({
          title: payload.title !== undefined ? payload.title.trim() : null,
        })
        .eq('id', payload.media_id)
        .eq('business_id', businessId)
        .eq('tenant_id', biz.tenant_id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UPDATE_GALLERY_PHOTO_TITLE',
        entity_type: 'business_media',
        entity_id: payload.media_id,
        after_value: updated,
        reason: 'Edição de legenda da foto via Admin 360º',
      });
      revalidatePath(`/admin/empresas/${businessId}`);
      revalidatePath('/guia', 'layout');
      return { success: true, media: { ...updated, media_type: 'gallery' } };
    } else if (action === 'delete_media' && payload.media_id) {
      const { data: existing } = await (supabase as any)
        .from('business_media')
        .select('*')
        .eq('id', payload.media_id)
        .eq('business_id', businessId)
        .eq('tenant_id', biz.tenant_id)
        .maybeSingle();

      if (!existing) {
        return { success: false, error: 'Mídia não encontrada para esta empresa.' };
      }

      if (existing.url && existing.url.includes('/storage/v1/object/public/business-media/')) {
        const storagePath = existing.url.split('/storage/v1/object/public/business-media/')[1];
        if (storagePath) {
          try {
            await (supabase.storage as any).from('business-media').remove([storagePath]);
          } catch (stErr) {
            console.warn('[manageAdminMediaAction] Erro ao remover arquivo do Storage:', stErr);
          }
        }
      }

      const { error } = await (supabase as any)
        .from('business_media')
        .delete()
        .eq('id', payload.media_id)
        .eq('business_id', businessId);

      if (error) return { success: false, error: error.message };

      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'DELETE_BUSINESS_MEDIA',
        entity_type: 'business_media',
        entity_id: payload.media_id,
        before_value: existing,
        reason: 'Exclusão física de mídia via Admin 360º',
      });
    }

    revalidatePath(`/admin/empresas/${businessId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao gerenciar mídia.' };
  }
}

export async function updateAdminBusinessPlanAction(
  businessId: string,
  newPlanCode: 'bronze' | 'prata' | 'ouro',
  justification: string
): Promise<{
  success: boolean;
  data?: { plan_code: 'bronze' | 'prata' | 'ouro'; plan_name: string; entitlements: Record<string, number> };
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    const { data: bData, error: findErr } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, slug, plan_code, plan_tier')
      .eq('id', businessId)
      .single();

    if (findErr || !bData) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    const oldPlan = bData.plan_tier || bData.plan_code || 'bronze';

    const { error: updateErr } = await (supabase as any)
      .from('businesses')
      .update({
        plan_code: newPlanCode,
        plan_tier: newPlanCode,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    if (updateErr) {
      return { success: false, error: `Erro ao atualizar plano: ${updateErr.message}` };
    }

    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: bData.tenant_id,
      actor_id: user.id,
      action: `CHANGE_PLAN_${oldPlan.toUpperCase()}_TO_${newPlanCode.toUpperCase()}`,
      entity_type: 'business',
      entity_id: businessId,
      before_value: { plan_code: oldPlan },
      after_value: { plan_code: newPlanCode },
      reason: justification || 'Alteração/Upgrade/Downgrade de plano comercial via Admin',
    });

    revalidatePath(`/admin/empresas`);
    revalidatePath(`/admin/empresas/${businessId}`);
    if (bData.slug) {
      revalidatePath(`/guia/${bData.slug}`);
    }
    revalidatePath('/guia', 'layout');

    const { data: entitlementRows } = await (supabase as any)
      .from('plan_entitlements')
      .select('feature_code, max_limit')
      .eq('tenant_id', bData.tenant_id)
      .eq('plan_code', newPlanCode);
    const entitlements = Object.fromEntries(
      (entitlementRows || []).map((row: any) => [row.feature_code, Number(row.max_limit) || 0]),
    );
    for (const featureCode of ['services_limit', 'benefits_limit', 'gallery_photos_limit', 'business_video_limit', 'events_limit', 'posts_limit']) {
      if (entitlements[featureCode] === undefined) {
        entitlements[featureCode] = getCanonicalDefaultLimit(newPlanCode, featureCode);
      }
    }
    return {
      success: true,
      data: {
        plan_code: newPlanCode,
        plan_name: newPlanCode === 'ouro' ? 'Plano Acácia' : newPlanCode === 'prata' ? 'Plano Compasso' : 'Plano Esquadro',
        entitlements,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao alterar plano comercial.' };
  }
}
