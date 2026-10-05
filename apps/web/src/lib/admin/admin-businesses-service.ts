'use server';

import { assertPlatformAdminAccess } from './admin-auth-helper';
import { resolveCanonicalAdminTenant } from './admin-tenant-context';
import { createServerSideClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { resolveLogoUrl } from '@/lib/business/business-media-helpers';
import { validateCpf, validatePhone, sanitizeCnpj } from '@/lib/onboarding/onboarding-validation';
import {
  getCanonicalDefaultLimit,
  getCommercialPlanName,
  normalizeCanonicalPlanCode,
} from '@/lib/billing/plans-service';
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import {
  COMMUNITY_LINK_TYPES,
  type CommunityLinkType,
  type MasonicEligibilityType,
  MASONIC_ELIGIBILITY_TYPES,
} from '@/lib/masonic/masonic-links-service';
import {
  assertCommercialStatusTransition,
  COMMERCIAL_STATUS_ORDER,
  type CommercialStatus,
} from '@/lib/commercial-onboarding-status';
import { evaluateBusinessProfileReadiness } from './admin-commercial-dossier-readiness';

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

/**
 * Remove de um texto de endereço os trechos de cidade, UF e CEP que já vivem em
 * colunas próprias (business_locations). Evita duplicar esses dados a cada salvamento.
 */
function stripLocationTail(address: string, city: string, state: string): string {
  const cityKey = city.trim().toLowerCase();
  const segments = address
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => {
      if (!segment) return false;
      if (/^CEP\b/i.test(segment)) return false;
      if (/^\d{5}-?\d{3}$/.test(segment)) return false;
      if (/\s-\s[A-Za-z]{2}$/.test(segment)) return false;
      if (cityKey && segment.toLowerCase() === cityKey) return false;
      if (state.trim() && segment.toLowerCase() === state.trim().toLowerCase()) return false;
      return true;
    });
  return segments.join(', ');
}

async function geocodeBusinessAddress(input: {
  address: string;
  city: string;
  state: string;
}): Promise<{ latitude: number; longitude: number } | null> {
  const query = [input.address, input.city, input.state, 'Brasil']
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');

  if (!input.address || !input.city || !input.state) return null;

  try {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', countrycodes: 'br' });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ConexaoMaconica/1.0 (geocodificacao administrativa)',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;

    const results = (await response.json()) as Array<{ lat: string; lon: string }>;
    const latitude = Number(results[0]?.lat);
    const longitude = Number(results[0]?.lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;
  } catch {
    return null;
  }
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
    const { user, tenantId: canonicalTenantId } = await resolveCanonicalAdminTenant();
    if (tenantId !== canonicalTenantId) return { success: false, error: 'Tenant informado diverge do tenant administrado.' };
    const name = rawName.trim().replace(/\s+/g, ' ');
    if (name.length < 3 || name.length > 80) return { success: false, error: 'A categoria deve ter entre 3 e 80 caracteres.' };
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return { success: false, error: 'Configuração segura do Supabase indisponível.' };
    const adminClient = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
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
      .select('id, tenant_id, plan_tier').eq('id', businessId).maybeSingle();
    if (businessError) {
      console.error('[uploadAdminBusinessAssetAction] Falha ao consultar empresa:', {
        businessId,
        code: businessError.code,
        message: businessError.message,
        details: businessError.details,
        hint: businessError.hint,
      });
      return { success: false, error: `Falha ao consultar empresa: ${businessError.message}` };
    }
    if (!business) return { success: false, error: 'Empresa não localizada.' };

    let galleryOrder = 0;
    if (assetType === 'gallery') {
      const { data: activeSubscription } = await (adminClient as any).from('subscriptions')
        .select('plan_versions!inner(plans!inner(code))')
        .eq('tenant_id', business.tenant_id).eq('business_id', businessId)
        .in('status', ['active', 'trialing', 'past_due', 'canceled'])
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      const planCode = activeSubscription?.plan_versions?.plans?.code || business.plan_tier || 'bronze';
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
  completeness_missing?: string[];
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
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    postal_code?: string;
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
    cnpj?: string;
    commercial_status?: string;
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
    eligibility_type?: 'mason' | 'mason_spouse' | 'mason_family' | string | null;
    reference_mason_name?: string | null;
    reference_mason_cim?: string | null;
    family_relationship?: string | null;
    notes?: string | null;
    verified_at: string | null;
    verified_by: string | null;
  };
  contract?: {
    id: string;
    snapshot_id: string;
    status: 'draft' | 'awaiting_signature' | 'signed' | 'voided' | 'superseded';
    version: string;
    sha256_hash: string;
    signed_at: string | null;
    acceptance_id: string | null;
    rendered_text: string;
    signer_name: string;
    signer_cpf?: string | null;
    signature_image_data?: string | null;
  };
  commercial_activation: {
    commercial_status: string;
    contract_id: string | null;
    contract_status: string | null;
    snapshot_id: string | null;
    acceptance_id: string | null;
    contract_signed: boolean;
    payment_confirmed: boolean;
  };
  commercial_terms?: {
    id: string;
    plan_code: string;
    plan_name: string;
    billing_cycle: 'annual' | 'biennial';
    payment_method: 'avista' | 'parcelado';
    amount_cents: number;
    installments_count: number;
    installment_amount_cents: number;
    is_pedra_fundamental: boolean;
    notes?: string | null;
    status: 'conferido' | 'desatualizado' | 'contratado';
    conferred_at: string;
    conferred_by?: string | null;
    responsible_cpf?: string | null;
    contract_start_date?: string | null;
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
    const { data: allBizData } = await (supabase as any)
      .from('businesses')
      .select('id, publication_status, plan_code, plan_tier, created_at');
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
    const bronzeCount = allBiz.filter((b) => normalizeCanonicalPlanCode(allPlanMap[b.id] || b.plan_tier || b.plan_code) === 'esquadro').length;
    const prataCount = allBiz.filter((b) => normalizeCanonicalPlanCode(allPlanMap[b.id] || b.plan_tier || b.plan_code) === 'compasso').length;
    const ouroCount = allBiz.filter((b) => normalizeCanonicalPlanCode(allPlanMap[b.id] || b.plan_tier || b.plan_code) === 'acacia').length;

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
    let contactMap: Record<string, { phone?: string; whatsapp?: string }> = {};
    let categoryMap: Record<string, { id?: string; name?: string }> = {};
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
      try {
        const { data: contacts } = await (supabase as any)
          .from('business_contacts')
          .select('business_id, type, value')
          .in('business_id', bizIds)
          .in('type', ['phone', 'whatsapp']);
        for (const contact of contacts || []) {
          contactMap[contact.business_id] ||= {};
          contactMap[contact.business_id]![contact.type as 'phone' | 'whatsapp'] = contact.value;
        }
      } catch (_e) { }
      try {
        const { data: categories } = await (supabase as any)
          .from('business_categories')
          .select('business_id, category_id, is_primary, categories(name)')
          .in('business_id', bizIds)
          .order('is_primary', { ascending: false });
        for (const row of categories || []) {
          if (!categoryMap[row.business_id]) categoryMap[row.business_id] = { id: row.category_id, name: row.categories?.name };
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

    // Nome do responsável cadastrado para cada empresa (mesma fonte da tela 360).
    const responsibleNameMap: Record<string, string> = {};
    if (bizIds.length > 0) {
      try {
        const { data: responsibles } = await (supabase as any)
          .from('business_responsibles')
          .select('business_id, name')
          .in('business_id', bizIds);
        for (const r of responsibles || []) {
          if (r.name && !responsibleNameMap[r.business_id]) responsibleNameMap[r.business_id] = r.name;
        }
      } catch (_e) { }
    }

    let items: AdminBusinessListItem[] = (data || []).map((b: any) => {
      const effectivePlan = normalizeCanonicalPlanCode(allPlanMap[b.id] || b.plan_tier || b.plan_code);
      const recs = allRecMap[b.id] || [];
      const readiness = evaluateBusinessProfileReadiness({
        name: b.name,
        legal_name: b.legal_name,
        description: b.description,
        category_id: categoryMap[b.id]?.id || b.category_id,
        category: categoryMap[b.id]?.name || b.category,
        city: locationMap[b.id]?.city || b.city,
        state: locationMap[b.id]?.state || b.state,
        phone: contactMap[b.id]?.phone || b.phone,
        whatsapp: contactMap[b.id]?.whatsapp || b.whatsapp,
        logo_url: b.logo_url,
      });
      return {
        id: b.id,
        tenant_id: b.tenant_id,
        name: b.name || 'Empresa Anunciante',
        legal_name: b.legal_name || b.name,
        cnpj_cpf: b.cnpj_cpf || b.cnpj || 'Não informado',
        category: categoryMap[b.id]?.name || b.category || 'Geral',
        city: locationMap[b.id]?.city || b.city || 'Não informado',
        state: locationMap[b.id]?.state || b.state || '',
        owner_name: responsibleNameMap[b.id] || 'Responsável não informado',
        owner_email: b.email || 'contato@anunciante.com',
        publication_status: (b.publication_status || 'published') as any,
        payment_status: b.publication_status === 'published' ? 'paid' : 'pending',
        plan_code: effectivePlan,
        completeness_percent: readiness.completion_percentage,
        completeness_missing: readiness.missing_labels,
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
      items = items.filter(
        (item) => normalizeCanonicalPlanCode(item.plan_code) === normalizeCanonicalPlanCode(params!.plan),
      );
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
      const { data: subscriptionRow, error: subscriptionError } = await (supabase as any)
        .from('subscriptions')
        .select('id, status, contract_term, payment_schedule, current_period_start, current_period_end, created_at, plan_version_id')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subscriptionError) throw subscriptionError;
      subData = subscriptionRow;

      // A relação aninhada pode não estar disponível no cache do PostgREST.
      // Busca o plano separadamente para não descartar as datas da assinatura.
      if (subData?.plan_version_id) {
        const { data: planVersion } = await (supabase as any)
          .from('plan_versions')
          .select('id, plan_id, price_annual, plans(code, name)')
          .eq('id', subData.plan_version_id)
          .maybeSingle();
        if (planVersion) subData.plan_versions = planVersion;
      }
    } catch (error) {
      console.error('[getAdminBusiness360Action] Falha ao carregar assinatura:', error);
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
    let locationData: {
      city?: string;
      state?: string;
      address?: string;
      street?: string;
      number?: string;
      complement?: string;
      neighborhood?: string;
      postal_code?: string;
      latitude?: number;
      longitude?: number;
    } = {};
    try {
      const { data: locs } = await (supabase as any)
        .from('business_locations')
        .select('city, state, street, number, complement, neighborhood, postal_code, latitude, longitude, is_headquarters')
        .eq('business_id', businessId);
      if (locs && locs.length > 0) {
        const primary = locs.find((l: any) => l.is_headquarters === true) || locs[0];
        const formattedParts = [
          primary.street ? `${primary.street}${primary.number ? ', ' + primary.number : ''}` : '',
          primary.complement,
          primary.neighborhood,
          primary.city ? [primary.city, primary.state].filter(Boolean).join(' - ') : '',
          primary.postal_code ? `CEP ${primary.postal_code}` : '',
        ].filter(Boolean);

        locationData = {
          city: primary.city,
          state: primary.state,
          address: formattedParts.length > 0 ? formattedParts.join(', ') : undefined,
          street: primary.street || undefined,
          number: primary.number || undefined,
          complement: primary.complement || undefined,
          neighborhood: primary.neighborhood || undefined,
          postal_code: primary.postal_code || undefined,
          latitude: primary.latitude == null ? undefined : Number(primary.latitude),
          longitude: primary.longitude == null ? undefined : Number(primary.longitude),
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

    // 1. Vínculo Maçônico (fonte canônica: business_masonic_links + organizations)
    let masonic_link_detail: AdminBusiness360DTO['masonic_link_detail'] = undefined;
    try {
      const { data: linkData } = await (supabase as any)
        .from('business_masonic_links')
        .select('id, status, organization_id, link_type, eligibility_type, reference_mason_name, reference_mason_cim, family_relationship, notes, verified_at, verified_by, organizations(name, potency)')
        .eq('business_id', businessId)
        .maybeSingle();

      if (linkData) {
        masonic_link_detail = {
          id: linkData.id,
          status: normalizeMasonicStatus(linkData.status),
          organization_id: linkData.organization_id || null,
          lodge_name: linkData.organizations?.name || 'Loja Não Identificada',
          potency: linkData.organizations?.potency || 'Potência não informada',
          link_type: linkData.link_type,
          eligibility_type: linkData.eligibility_type || null,
          reference_mason_name: linkData.reference_mason_name || null,
          reference_mason_cim: linkData.reference_mason_cim || null,
          family_relationship: linkData.family_relationship || null,
          notes: linkData.notes || null,
          verified_at: linkData.verified_at || null,
          verified_by: linkData.verified_by || null,
        };
      }
    } catch (_e) { }

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



    // 6. Contrato digital: nunca inferir assinatura a partir da existência do contrato/snapshot.
    let contractDetail: AdminBusiness360DTO['contract'] = undefined;
    try {
      const contractSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const contractServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!contractSupabaseUrl || !contractServiceRoleKey) throw new Error('Configuração administrativa do Supabase ausente.');
      const contractReader = createSupabaseAdminClient<Database>(contractSupabaseUrl, contractServiceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: contractRows, error: contractsError } = await (contractReader as any)
        .from('contracts')
        .select('id, status, version_id, created_at')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (contractsError) throw contractsError;

      const contracts = (contractRows || []).filter(
        (contract: any) => !['voided', 'superseded'].includes(contract.status)
      );
      const contractIds = contracts.map((contract: any) => contract.id);
      let acceptanceRow: any = null;
      if (contractIds.length > 0) {
        const { data: acceptance } = await (contractReader as any)
          .from('contract_acceptances')
          .select('id, contract_id, snapshot_id, accepted_at')
          .in('contract_id', contractIds)
          .order('accepted_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        acceptanceRow = acceptance;
      }

      const contractRow = acceptanceRow
        ? contracts.find((contract: any) => contract.id === acceptanceRow.contract_id)
        : contracts.find((contract: any) => contract.status === 'signed') || contracts[0];

      let snapshotRow: any = null;
      if (contractRow) {
        let snapshotQuery = (contractReader as any)
          .from('contract_snapshots')
          .select('id, rendered_text, sha256_hash, created_at')
          .eq('contract_id', contractRow.id);
        snapshotQuery = acceptanceRow?.snapshot_id
          ? snapshotQuery.eq('id', acceptanceRow.snapshot_id)
          : snapshotQuery.order('created_at', { ascending: false }).limit(1);
        const { data: snap } = await snapshotQuery.maybeSingle();
        snapshotRow = snap;
        if (snapshotRow) {
          const { data: evidence } = await (contractReader as any)
            .from('contract_snapshots')
            .select('signature_image_data, signer_cpf')
            .eq('id', snapshotRow.id)
            .maybeSingle();
          if (evidence) snapshotRow = { ...snapshotRow, ...evidence };
        }
      }

      if (snapshotRow && snapshotRow.rendered_text) {
        const [{ data: versionRow }] = await Promise.all([
          (contractReader as any)
            .from('contract_versions')
            .select('version')
            .eq('id', contractRow.version_id)
            .maybeSingle(),
        ]);

        contractDetail = {
          id: contractRow.id,
          snapshot_id: snapshotRow.id,
          status: acceptanceRow ? 'signed' : contractRow.status,
          version: versionRow?.version || 'sem versão',
          sha256_hash: snapshotRow.sha256_hash,
          signed_at: acceptanceRow?.accepted_at || null,
          acceptance_id: acceptanceRow?.id || null,
          rendered_text: snapshotRow.rendered_text,
          signer_name: acceptanceRow ? (b.name || 'Anunciante Titular') : '',
          signer_cpf: snapshotRow.signer_cpf || null,
          signature_image_data: snapshotRow.signature_image_data || null,
        };
      }
    } catch (error) {
      console.error('[getAdminBusiness360Action] Falha ao carregar contrato:', error);
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
        .select('event_name, created_at')
        .eq('business_id', businessId)
        .gte('created_at', date30daysAgo);

      if (eventsRaw && eventsRaw.length > 0) {
        const views = eventsRaw.filter((e: any) => e.event_name === 'view' || e.event_name === 'page_view').length;
        const whatsappClicks = eventsRaw.filter((e: any) => e.event_name === 'whatsapp_click').length;
        const routeClicks = eventsRaw.filter((e: any) => e.event_name === 'route_click' || e.event_name === 'directions_click').length;
        const websiteClicks = eventsRaw.filter((e: any) => e.event_name === 'website_click').length;
        const totalInteractions = eventsRaw.filter((e: any) =>
          ['whatsapp_click', 'phone_click', 'website_click', 'route_click', 'directions_click', 'benefit_click', 'social_click'].includes(e.event_name)
        ).length;

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

    let commercialTermsDetail: AdminBusiness360DTO['commercial_terms'] = undefined;
    try {
      const { data: ctRow } = await (supabase as any)
        .from('business_commercial_terms')
        .select('*')
        .eq('business_id', businessId)
        .maybeSingle();

      if (ctRow) {
        commercialTermsDetail = {
          id: ctRow.id,
          plan_code: ctRow.plan_code,
          plan_name: ctRow.plan_name,
          billing_cycle: ctRow.billing_cycle,
          payment_method: ctRow.payment_method,
          amount_cents: Number(ctRow.amount_cents),
          installments_count: Number(ctRow.installments_count),
          installment_amount_cents: Number(ctRow.installment_amount_cents || 0),
          is_pedra_fundamental: Boolean(ctRow.is_pedra_fundamental),
          notes: ctRow.notes || null,
          status: ctRow.status,
          conferred_at: ctRow.conferred_at,
          conferred_by: ctRow.conferred_by || null,
          responsible_cpf: ctRow.responsible_cpf || null,
          contract_start_date: ctRow.contract_start_date || null,
        };
      }
    } catch (_e) { }

    const effectivePlanCode = subData?.plan_versions?.plans?.code || commercialTermsDetail?.plan_code || planCode;
    const firstConfirmedPayment = payments_history
      .filter((payment) => ['paid', 'succeeded'].includes(payment.status) && Boolean(payment.date))
      .sort((a, b) => new Date(a.date as string).getTime() - new Date(b.date as string).getTime())[0];

    const effectiveStartDate =
      subData?.current_period_start ||
      commercialTermsDetail?.contract_start_date ||
      contractDetail?.signed_at ||
      firstConfirmedPayment?.date ||
      null;

    const nextOpenInvoice = payments_history
      .filter((payment) => !['paid', 'void'].includes(payment.status) && Boolean(payment.due_date))
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())[0];

    let effectiveNextBillingDate = subData?.current_period_end || nextOpenInvoice?.due_date || null;
    if (!effectiveNextBillingDate && effectiveStartDate) {
      const renewalDate = new Date(effectiveStartDate);
      if (!Number.isNaN(renewalDate.getTime())) {
        renewalDate.setUTCFullYear(
          renewalDate.getUTCFullYear() + (commercialTermsDetail?.billing_cycle === 'biennial' ? 2 : 1),
        );
        effectiveNextBillingDate = renewalDate.toISOString();
      }
    }

    const hasConfirmedCommercialPayment =
      ['pagamento_confirmado', 'prontuario_em_configuracao', 'pronto_para_publicar', 'publicado'].includes(
        b.commercial_status || '',
      ) || payments_history.some((payment) => payment.status === 'paid' || payment.status === 'succeeded');

    return {
      business: {
        id: b.id,
        tenant_id: b.tenant_id,
        name: b.name,
        slug: b.slug || undefined,
        legal_name: b.legal_name || b.name,
        cnpj: b.cnpj || b.cnpj_cpf || undefined,
        cnpj_cpf: b.cnpj || b.cnpj_cpf || undefined,
        commercial_status: b.commercial_status || 'pre_cadastro',
        category_id: primaryCategory?.id,
        category: primaryCategory?.name || b.category || 'Geral',
        description: b.description || undefined,
        city: locationData.city || b.city || '',
        state: locationData.state || b.state || '',
        address: locationData.address || (b.street ? `${b.street}, ${b.number || ''}` : (b.address || undefined)),
        street: locationData.street || b.street || undefined,
        number: locationData.number || b.number || undefined,
        complement: locationData.complement || b.complement || undefined,
        neighborhood: locationData.neighborhood || b.neighborhood || undefined,
        postal_code: locationData.postal_code || b.postal_code || undefined,
        latitude: locationData.latitude,
        longitude: locationData.longitude,
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
        completeness_percent: evaluateBusinessProfileReadiness({
          name: b.name,
          legal_name: b.legal_name,
          description: b.description,
          category_id: primaryCategory?.id,
          category: primaryCategory?.name || b.category,
          city: locationData.city || b.city,
          state: locationData.state || b.state,
          phone: contactsMap['phone'] || b.phone,
          whatsapp: contactsMap['whatsapp'] || b.whatsapp,
          logo_url: b.logo_url,
        }).completion_percentage,
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
      commercial_activation: {
        commercial_status: b.commercial_status || 'pre_cadastro',
        contract_id: contractDetail?.id || null,
        contract_status: contractDetail?.status || null,
        snapshot_id: contractDetail?.snapshot_id || null,
        acceptance_id: contractDetail?.acceptance_id || null,
        contract_signed: Boolean(contractDetail?.status === 'signed'),
        payment_confirmed: hasConfirmedCommercialPayment,
      },
      subscription: {
        plan_code: effectivePlanCode,
        plan_name: commercialTermsDetail?.plan_name || `Plano ${getCommercialPlanName(effectivePlanCode)}`,
        amount_brl: subData?.plan_versions?.price_annual != null
          ? Number(subData.plan_versions.price_annual)
          : commercialTermsDetail
            ? commercialTermsDetail.amount_cents / 100
            : null,
        periodicity: subData?.contract_term || commercialTermsDetail?.billing_cycle || null,
        status: subData?.status || (hasConfirmedCommercialPayment ? 'active' : 'not_found'),
        start_date: effectiveStartDate,
        next_billing_date: effectiveNextBillingDate,
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
      commercial_terms: commercialTermsDetail,
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
          const { error } = await (supabase as any)
            .from('business_contacts')
            .update({ value: cleanVal, is_public: true })
            .eq('id', existingContact.id);
          if (error) throw new Error(`Falha ao atualizar contato ${contactType}: ${error.message}`);
        } else {
          const { error } = await (supabase as any)
            .from('business_contacts')
            .insert({
              tenant_id: existing.tenant_id,
              business_id: businessId,
              type: contactType,
              value: cleanVal,
              is_public: true,
            });
          if (error) throw new Error(`Falha ao cadastrar contato ${contactType}: ${error.message}`);
        }
      } else if (existingContact) {
        const { error } = await (supabase as any)
          .from('business_contacts')
          .delete()
          .eq('id', existingContact.id);
        if (error) throw new Error(`Falha ao remover contato ${contactType}: ${error.message}`);
      }
    };

    await upsertContact('whatsapp', payload.whatsapp);
    await upsertContact('phone', payload.phone);
    await upsertContact('email', payload.email);
    await upsertContact('website', payload.website);
    await upsertContact('instagram', payload.instagram);
    await upsertContact('facebook', payload.facebook);
    await upsertContact('linkedin', payload.linkedin);
    const normalizedYoutube = payload.youtube?.trim().startsWith('@')
      ? `https://www.youtube.com/${payload.youtube.trim()}`
      : payload.youtube;
    await upsertContact('youtube', normalizedYoutube);

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
      const canonicalAddress =
        stripLocationTail(payload.address?.trim() || '', canonicalCity.name, stateVal) || 'Endereço não informado';

      const coordinates = payload.address?.trim()
        ? await geocodeBusinessAddress({ address: payload.address.trim(), city: canonicalCity.name, state: stateVal })
        : null;

      if (primaryLoc) {
        const { error: locationUpdateError } = await (supabase as any)
          .from('business_locations')
          .update({
            city_ibge_code: canonicalCity.ibge_code,
            city: canonicalCity.name,
            state: stateVal,
            street: canonicalAddress,
            number: null,
            ...(coordinates || {}),
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
            latitude: coordinates?.latitude ?? null,
            longitude: coordinates?.longitude ?? null,
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

function mapMasonicLinkStatus(status: string): 'approved' | 'pending_verification' | 'rejected' | 'draft' {
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
      throw new Error(`Status de vínculo inválido: ${status}`);
  }
}

function mapMasonicLinkType(linkType?: string): CommunityLinkType {
  if (!linkType) {
    throw new Error('Tipo de vínculo empresarial é obrigatório.');
  }
  if (COMMUNITY_LINK_TYPES.includes(linkType as CommunityLinkType)) {
    return linkType as CommunityLinkType;
  }
  const lower = linkType.toLowerCase();
  if (lower.includes('proprietário') || lower.includes('owner')) return 'owner';
  if (lower.includes('sócio') || lower.includes('partner')) return 'equity_partner';
  if (lower.includes('familiar') || lower.includes('family')) return 'family_owner';
  if (lower.includes('representante')) return 'sales_representative';
  throw new Error(`Tipo de vínculo empresarial inválido: ${linkType}`);
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
      .select('id, tenant_id, owner_id, commercial_status')
      .eq('id', businessId)
      .maybeSingle();

    if (!biz) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    const { data: linkData } = await (supabase as any)
      .from('business_masonic_links')
      .select('id, tenant_id, status, declaring_user_id')
      .eq('business_id', businessId)
      .maybeSingle();

    let linkId = linkData?.id;
    const dbStatus = mapMasonicLinkStatus(newStatus);
    const isApproved = dbStatus === 'approved';
    const targetDeclaringUserId = (biz.owner_id && biz.owner_id !== user.id) ? biz.owner_id : null;

    if (linkData) {
      const updatePayload: Record<string, any> = {
        status: dbStatus,
        verified_at: isApproved ? new Date().toISOString() : null,
        verified_by: isApproved ? user.id : null,
        updated_at: new Date().toISOString(),
      };

      if (isApproved && linkData.declaring_user_id === user.id) {
        updatePayload.declaring_user_id = targetDeclaringUserId;
      }

      const { error: updateErr } = await (supabase as any)
        .from('business_masonic_links')
        .update(updatePayload)
        .eq('id', linkData.id);

      if (updateErr) return { success: false, error: `Falha ao atualizar vínculo: ${updateErr.message}` };
    } else {
      // 1. Criar como draft conforme regra do gatilho bml_guard_approval_flow
      const { data: newLink, error: createErr } = await (supabase as any)
        .from('business_masonic_links')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          declaring_user_id: targetDeclaringUserId,
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

    const currentCommercialStatus = (biz.commercial_status || 'pre_cadastro') as CommercialStatus;
    let nextCommercialStatus: CommercialStatus | null = null;
    if (isApproved && currentCommercialStatus === 'pre_cadastro') {
      assertCommercialStatusTransition('pre_cadastro', 'vinculo_informado');
      assertCommercialStatusTransition('vinculo_informado', 'vinculo_verificado');
      nextCommercialStatus = 'vinculo_verificado';
    } else if (isApproved && currentCommercialStatus === 'vinculo_informado') {
      assertCommercialStatusTransition('vinculo_informado', 'vinculo_verificado');
      nextCommercialStatus = 'vinculo_verificado';
    }

    const businessUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (nextCommercialStatus) businessUpdates.commercial_status = nextCommercialStatus;

    const { error: businessUpdateError } = await (supabase as any)
      .from('businesses')
      .update(businessUpdates)
      .eq('id', businessId);

    if (businessUpdateError) {
      return {
        success: false,
        error: `Vínculo atualizado, mas o status comercial não foi sincronizado: ${businessUpdateError.message}`,
      };
    }

    await (supabase as any).from('admin_audit_logs').insert({   tenant_id: biz.tenant_id,
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
    revalidatePath(`/admin/empresas/${businessId}/contratacao`);
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
    eligibility_type?: 'mason' | 'mason_spouse' | 'mason_family' | string;
    reference_mason_name?: string;
    reference_mason_cim?: string;
    family_relationship?: string;
    notes?: string;
    status: 'verified' | 'pending' | 'rejected' | string;
    justification?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    // 1. Busca paralela dos registros essenciais
    const [{ data: biz }, { data: existingLink }, { data: existingResp }] = await Promise.all([
      (supabase as any)
        .from('businesses')
        .select('id, tenant_id, owner_id, commercial_status')
        .eq('id', businessId)
        .maybeSingle(),
      (supabase as any)
        .from('business_masonic_links')
        .select('id, declaring_user_id')
        .eq('business_id', businessId)
        .maybeSingle(),
      payload.lodge_name.trim()
        ? (supabase as any)
            .from('business_responsibles')
            .select('id')
            .eq('business_id', businessId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

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
        if (payload.potency && payload.potency.trim()) {
          await (supabase as any)
            .from('organizations')
            .update({
              potency: payload.potency.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', existingOrg.id);
        }
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

    const dbStatus = mapMasonicLinkStatus(payload.status);
    const dbLinkType = mapMasonicLinkType(payload.link_type);
    const isApproved = dbStatus === 'approved';
    const targetDeclaringUserId = (biz.owner_id && biz.owner_id !== user.id) ? biz.owner_id : null;

    let eligibilityType: MasonicEligibilityType | null = null;
    if (payload.eligibility_type) {
      if (!MASONIC_ELIGIBILITY_TYPES.includes(payload.eligibility_type as MasonicEligibilityType)) {
        return { success: false, error: `Tipo de elegibilidade maçônica inválido: ${payload.eligibility_type}` };
      }
      eligibilityType = payload.eligibility_type as MasonicEligibilityType;
    }

    if (existingLink) {
      const updatePayload: Record<string, any> = {
        organization_id: organizationId,
        link_type: dbLinkType,
        eligibility_type: eligibilityType,
        reference_mason_name: payload.reference_mason_name?.trim() || null,
        reference_mason_cim: payload.reference_mason_cim?.trim() || null,
        family_relationship: payload.family_relationship?.trim() || null,
        notes: payload.notes?.trim() || null,
        status: dbStatus,
        verified_at: isApproved ? new Date().toISOString() : null,
        verified_by: isApproved ? user.id : null,
        updated_at: new Date().toISOString(),
      };

      if (isApproved && existingLink.declaring_user_id === user.id) {
        updatePayload.declaring_user_id = targetDeclaringUserId;
      }

      const { error: updateErr } = await (supabase as any)
        .from('business_masonic_links')
        .update(updatePayload)
        .eq('id', existingLink.id);

      if (updateErr) return { success: false, error: `Falha ao atualizar vínculo maçônico: ${updateErr.message}` };
    } else {
      // 1. Criar como draft conforme exigência do gatilho bml_guard_approval_flow
      const { data: newLink, error: insertErr } = await (supabase as any)
        .from('business_masonic_links')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          declaring_user_id: targetDeclaringUserId,
          organization_id: organizationId,
          link_type: dbLinkType,
          eligibility_type: eligibilityType,
          reference_mason_name: payload.reference_mason_name?.trim() || null,
          reference_mason_cim: payload.reference_mason_cim?.trim() || null,
          family_relationship: payload.family_relationship?.trim() || null,
          notes: payload.notes?.trim() || null,
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

    // Transições formais de commercial_status
    const currentCommercialStatus = (biz.commercial_status || 'pre_cadastro') as CommercialStatus;
    let nextCommercialStatus: CommercialStatus | null = null;

    if (dbStatus === 'pending_verification') {
      if (currentCommercialStatus === 'pre_cadastro') {
        assertCommercialStatusTransition('pre_cadastro', 'vinculo_informado');
        nextCommercialStatus = 'vinculo_informado';
      }
    } else if (dbStatus === 'approved') {
      if (currentCommercialStatus === 'pre_cadastro') {
        assertCommercialStatusTransition('pre_cadastro', 'vinculo_informado');
        assertCommercialStatusTransition('vinculo_informado', 'vinculo_verificado');
        nextCommercialStatus = 'vinculo_verificado';
      } else if (currentCommercialStatus === 'vinculo_informado') {
        assertCommercialStatusTransition('vinculo_informado', 'vinculo_verificado');
        nextCommercialStatus = 'vinculo_verificado';
      }
    }

    // businesses guarda apenas o estado do funil comercial. Os dados do
    // vínculo maçônico permanecem exclusivamente em business_masonic_links.
    const businessUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (nextCommercialStatus) {
      businessUpdates.commercial_status = nextCommercialStatus;
    }

    // Gravações finais em paralelo para máxima performance
    const finishPromises: Promise<any>[] = [
      (supabase as any).from('businesses').update(businessUpdates).eq('id', businessId),
      (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'UPSERT_MASONIC_LINK',
        entity_type: 'business_masonic_link',
        entity_id: businessId,
        after_value: { ...payload, db_status: dbStatus, db_link_type: dbLinkType },
        reason: payload.justification || 'Cadastro/Atualização de vínculo maçônico via Admin 360º',
      }),
    ];

    if (payload.lodge_name.trim()) {
      if (existingResp) {
        finishPromises.push(
          (supabase as any)
            .from('business_responsibles')
            .update({ organization: payload.lodge_name.trim(), updated_at: new Date().toISOString() })
            .eq('id', existingResp.id)
        );
      } else {
        finishPromises.push(
          (supabase as any)
            .from('business_responsibles')
            .insert({
              tenant_id: biz.tenant_id,
              business_id: businessId,
              name: 'Anunciante Titular',
              organization: payload.lodge_name.trim(),
            })
        );
      }
    }

    const finishResults = await Promise.all(finishPromises);
    const businessUpdateError = finishResults[0]?.error;
    if (businessUpdateError) {
      return {
        success: false,
        error: `Vínculo salvo, mas o status comercial não foi sincronizado: ${businessUpdateError.message}`,
      };
    }

    revalidatePath('/admin/empresas');
    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath(`/admin/empresas/${businessId}/vinculo-maconico`);
    revalidatePath(`/admin/empresas/${businessId}/contratacao`);

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao salvar vínculo maçônico.' };
  }
}

const PRE_LINK_COMMERCIAL_STATUSES: CommercialStatus[] = ['pre_cadastro', 'vinculo_informado'];

/**
 * Reconcilia o domínio maçônico com a máquina de estados comercial.
 * SE existe vínculo aprovado/verificado E commercial_status é anterior ao vínculo
 * ENTÃO avança para vinculo_verificado. Nunca regride estados posteriores.
 */
async function reconcileMasonicCommercialStatusWithClient(
  supabase: any,
  businessId: string,
  currentStatus: CommercialStatus
): Promise<{ status: CommercialStatus; reconciled: boolean; error?: string }> {
  if (!PRE_LINK_COMMERCIAL_STATUSES.includes(currentStatus)) {
    return { status: currentStatus, reconciled: false };
  }

  const { data: verifiedLink, error: verifiedLinkError } = await supabase
    .from('business_masonic_links')
    .select('id, status, verified_at')
    .eq('business_id', businessId)
    .in('status', ['approved', 'verified'])
    .not('verified_at', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (verifiedLinkError) {
    return {
      status: currentStatus,
      reconciled: false,
      error: `Falha ao validar o vínculo maçônico: ${verifiedLinkError.message}`,
    };
  }
  if (!verifiedLink) return { status: currentStatus, reconciled: false };

  const { error: reconcileError } = await supabase
    .from('businesses')
    .update({
      commercial_status: 'vinculo_verificado',
      updated_at: new Date().toISOString(),
    })
    .eq('id', businessId)
    .in('commercial_status', PRE_LINK_COMMERCIAL_STATUSES);

  if (reconcileError) {
    return {
      status: currentStatus,
      reconciled: false,
      error: `Falha ao sincronizar o status comercial: ${reconcileError.message}`,
    };
  }
  return { status: 'vinculo_verificado', reconciled: true };
}

/**
 * Central de Ativação: sincroniza manualmente commercial_status com o vínculo maçônico verificado.
 * Idempotente e forward-only.
 */
export async function reconcileMasonicCommercialStatus(
  businessId: string
): Promise<{ success: boolean; error?: string; commercial_status?: string; reconciled?: boolean }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();
    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, commercial_status')
      .eq('id', businessId)
      .single();

    if (bizErr) {
      console.error('[reconcileMasonicCommercialStatus] Erro ao consultar empresa:', {
        businessId,
        code: bizErr.code,
        message: bizErr.message,
        details: bizErr.details,
        hint: bizErr.hint,
      });
      return { success: false, error: `Falha ao consultar empresa: ${bizErr.message}` };
    }
    if (!biz) return { success: false, error: 'Empresa não encontrada no banco de dados.' };

    const before = (biz.commercial_status || 'pre_cadastro') as CommercialStatus;
    const result = await reconcileMasonicCommercialStatusWithClient(supabase, biz.id, before);
    if (result.error) return { success: false, error: result.error };

    if (!result.reconciled && PRE_LINK_COMMERCIAL_STATUSES.includes(before)) {
      return {
        success: false,
        error: 'Nenhum vínculo maçônico verificado foi encontrado. Verifique o vínculo antes de sincronizar.',
      };
    }

    if (result.reconciled) {
      await (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'RECONCILE_MASONIC_COMMERCIAL_STATUS',
        entity_type: 'business',
        entity_id: biz.id,
        before_value: { commercial_status: before },
        after_value: { commercial_status: result.status },
        reason: 'Sincronização do status comercial com vínculo maçônico verificado (Central de Ativação).',
      });

      revalidatePath('/admin/empresas');
      revalidatePath(`/admin/empresas/${biz.id}`);
      revalidatePath(`/admin/empresas/${biz.id}/contratacao`);
    }

    return { success: true, commercial_status: result.status, reconciled: result.reconciled };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao sincronizar status comercial.' };
  }
}

export interface ConfirmAdminCommercialTermsInput {
  business_id: string;
  plan_code: string;
  billing_cycle: 'annual' | 'biennial';
  payment_method: 'avista' | 'parcelado';
  amount_cents: number;
  installments_count: number;
  installment_amount_cents?: number;
  is_pedra_fundamental?: boolean;
  notes?: string;
  contract_start_date?: string | null; // ISO date string YYYY-MM-DD ou null
  responsible_cpf?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    postal_code?: string;
  };
}

export interface SaveAdminBusinessContractAddressInput {
  business_id?: string;
  street: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city: string;
  state: string;
  postal_code?: string;
}

export async function saveAdminBusinessContractAddressAction(
  businessIdOrInput: string | SaveAdminBusinessContractAddressInput,
  maybeInput?: SaveAdminBusinessContractAddressInput
): Promise<{ success: boolean; error?: string; formatted_address?: string }> {
  try {
    const { supabase } = await assertPlatformAdminAccess();

    const businessId =
      typeof businessIdOrInput === 'string'
        ? businessIdOrInput
        : businessIdOrInput.business_id || '';
    const input = typeof businessIdOrInput === 'string' ? maybeInput || ({} as any) : businessIdOrInput;

    if (!businessId?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }

    const street = input.street?.trim() || '';
    const city = input.city?.trim() || '';
    const state = input.state?.trim() || '';

    if (!street || !city || !state) {
      return { success: false, error: 'Logradouro, Cidade e Estado (UF) são obrigatórios para o contrato.' };
    }

    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }

    const number = input.number?.trim() || null;
    const complement = input.complement?.trim() || null;
    const neighborhood = input.neighborhood?.trim() || null;
    const postal_code = input.postal_code?.trim() || null;

    const parts = [
      street ? `${street}${number ? ', ' + number : ''}` : '',
      complement,
      neighborhood,
      city ? `${city} - ${state}` : '',
      postal_code ? `CEP ${postal_code}` : '',
    ].filter(Boolean);
    const fullAddress = parts.join(', ');

    // 1. Busca localização Matriz
    const { data: existingLoc } = await (supabase as any)
      .from('business_locations')
      .select('id')
      .eq('business_id', businessId)
      .eq('is_headquarters', true)
      .maybeSingle();

    if (existingLoc) {
      await (supabase as any)
        .from('business_locations')
        .update({
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          postal_code: postal_code || '00000-000',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingLoc.id);
    } else {
      await (supabase as any)
        .from('business_locations')
        .insert({
          tenant_id: biz.tenant_id,
          business_id: businessId,
          title: 'Matriz',
          street,
          number,
          complement,
          neighborhood,
          city,
          state,
          postal_code: postal_code || '00000-000',
          is_headquarters: true,
          is_active: true,
        });
    }

    // 2. Atualiza tabela businesses com endereço sincronizado
    await (supabase as any)
      .from('businesses')
      .update({
        address: fullAddress,
        city,
        state,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);

    revalidatePath(`/admin/empresas/${businessId}`);
    revalidatePath(`/admin/empresas/${businessId}/contratacao`);

    return {
      success: true,
      formatted_address: fullAddress,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Falha ao salvar endereço do contratante.',
    };
  }
}

export async function confirmAdminCommercialTermsAction(
  input: ConfirmAdminCommercialTermsInput
): Promise<{ success: boolean; error?: string; commercial_status?: string }> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    // 1. Validação de campos obrigatórios
    if (!input.business_id?.trim()) {
      return { success: false, error: 'Identificador da empresa é obrigatório.' };
    }
    if (!input.plan_code?.trim()) {
      return { success: false, error: 'O plano comercial deve ser selecionado.' };
    }
    if (!input.billing_cycle || !['annual', 'biennial'].includes(input.billing_cycle)) {
      return { success: false, error: 'Vigência do contrato é obrigatória (anual ou bienal).' };
    }
    if (!input.payment_method || !['avista', 'parcelado'].includes(input.payment_method)) {
      return { success: false, error: 'Condição de pagamento é obrigatória (à vista ou parcelado).' };
    }
    if (typeof input.amount_cents !== 'number' || input.amount_cents <= 0) {
      return { success: false, error: 'Valor contratado deve ser maior que zero.' };
    }
    if (typeof input.installments_count !== 'number' || input.installments_count < 1) {
      return { success: false, error: 'Quantidade de parcelas deve ser de no mínimo 1.' };
    }
    const responsibleCpf = input.responsible_cpf?.replace(/\D/g, '') || '';
    const cpfValidationError = validateCpf(responsibleCpf);
    if (cpfValidationError) {
      return { success: false, error: cpfValidationError };
    }

    // 2. Consulta da empresa
    const { data: biz, error: bizErr } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, commercial_status, plan_tier')
      .eq('id', input.business_id)
      .single();

    if (bizErr) {
      console.error('[confirmAdminCommercialTermsAction] Erro ao consultar empresa:', {
        businessId: input.business_id,
        code: bizErr.code,
        message: bizErr.message,
        details: bizErr.details,
        hint: bizErr.hint,
      });
      return { success: false, error: `Falha ao consultar empresa: ${bizErr.message}` };
    }

    if (!biz) {
      return { success: false, error: 'Empresa não encontrada no banco de dados.' };
    }
    // 3. Validação da máquina de estados
    let currentStatus = (biz.commercial_status || 'pre_cadastro') as CommercialStatus;

    // Reconcilia registros legados em que o vínculo foi aprovado, mas a máquina
    // comercial permaneceu em uma etapa anterior. Nunca regride estados posteriores.
    const reconcile = await reconcileMasonicCommercialStatusWithClient(supabase, biz.id, currentStatus);
    if (reconcile.error) {
      return { success: false, error: reconcile.error };
    }
    currentStatus = reconcile.status;

    const currentStatusIndex = COMMERCIAL_STATUS_ORDER.indexOf(currentStatus);
    const commercialTermsStatusIndex = COMMERCIAL_STATUS_ORDER.indexOf('dados_comerciais_conferidos');
    const hasAdvancedPastCommercialTerms = currentStatusIndex > commercialTermsStatusIndex;

    if (currentStatus !== 'dados_comerciais_conferidos' && !hasAdvancedPastCommercialTerms) {
      try {
        assertCommercialStatusTransition(currentStatus, 'dados_comerciais_conferidos');
      } catch (transitionErr: any) {
        return {
          success: false,
          error: transitionErr?.message || `Transição inválida de ${currentStatus} para dados_comerciais_conferidos.`,
        };
      }
    }

    // 4. Preparação dos dados para persistência
    const installmentsCount = input.payment_method === 'avista' ? 1 : input.installments_count;
    const installmentAmountCents =
      input.installment_amount_cents && input.installment_amount_cents > 0
        ? input.installment_amount_cents
        : Math.round(input.amount_cents / installmentsCount);

    const planName = input.is_pedra_fundamental
      ? 'Plano Acácia (Pedra Fundamental)'
      : `Plano ${getCommercialPlanName(input.plan_code)}`;

    const termsPayload = {
      business_id: biz.id,
      tenant_id: biz.tenant_id,
      plan_code: input.plan_code,
      plan_name: planName,
      billing_cycle: input.billing_cycle,
      payment_method: input.payment_method,
      amount_cents: input.amount_cents,
      installments_count: installmentsCount,
      installment_amount_cents: installmentAmountCents,
      is_pedra_fundamental: Boolean(input.is_pedra_fundamental),
      notes: input.notes?.trim() || null,
      contract_start_date: input.contract_start_date?.trim() || null,
      responsible_cpf: responsibleCpf,
      status: 'conferido',
      conferred_at: new Date().toISOString(),
      conferred_by: user.id,
      updated_at: new Date().toISOString(),
    };

    // 4.1. Atualização do Endereço se fornecido no formulário
    let fullAddressToSync: string | undefined = undefined;
    if (input.address && (input.address.street?.trim() || input.address.city?.trim())) {
      const street = input.address.street?.trim() || '';
      const city = input.address.city?.trim() || '';
      const state = input.address.state?.trim() || '';
      if (!city || !state) {
        return { success: false, error: 'Informe cidade e UF do endereço. Não há cidade padrão.' };
      }
      const number = input.address.number?.trim() || null;
      const complement = input.address.complement?.trim() || null;
      const neighborhood = input.address.neighborhood?.trim() || null;
      const postal_code = input.address.postal_code?.trim() || null;

      // businesses.address guarda somente a linha de logradouro. Cidade, UF e CEP
      // vivem em business_locations e são exibidos a partir dessas colunas.
      const parts = [
        street ? `${street}${number ? ', ' + number : ''}` : '',
        complement,
        neighborhood,
      ].filter(Boolean);
      fullAddressToSync = parts.join(', ');

      const { data: existingLoc } = await (supabase as any)
        .from('business_locations')
        .select('id')
        .eq('business_id', biz.id)
        .eq('is_headquarters', true)
        .maybeSingle();

      if (existingLoc) {
        await (supabase as any)
          .from('business_locations')
          .update({
            street: street || 'Não informado',
            number,
            complement,
            neighborhood,
            city,
            state,
            postal_code: postal_code || '00000-000',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLoc.id);
      } else if (street) {
        await (supabase as any)
          .from('business_locations')
          .insert({
            tenant_id: biz.tenant_id,
            business_id: biz.id,
            title: 'Matriz',
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            postal_code: postal_code || '00000-000',
            is_headquarters: true,
            is_active: true,
          });
      }
    }

    // 5. Gravação concorrente para máxima velocidade
    const bizUpdatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (!hasAdvancedPastCommercialTerms) {
      bizUpdatePayload.commercial_status = 'dados_comerciais_conferidos';
    }
    if (fullAddressToSync) {
      bizUpdatePayload.address = fullAddressToSync;
    }

    const [termsRes, bizRes] = await Promise.all([
      (supabase as any)
        .from('business_commercial_terms')
        .upsert(termsPayload, { onConflict: 'business_id' }),
      (supabase as any)
        .from('businesses')
        .update(bizUpdatePayload)
        .eq('id', biz.id),
      (supabase as any).from('admin_audit_logs').insert({
        tenant_id: biz.tenant_id,
        actor_id: user.id,
        action: 'CONFERIR_DADOS_COMERCIAIS',
        entity_type: 'businesses',
        entity_id: biz.id,
        reason: input.notes?.trim() || 'Conferência e congelamento de dados comerciais (Microetapa 3.2)',
        after_value: termsPayload,
      }),
    ]);

    if (termsRes.error) {
      return {
        success: false,
        error: `Falha ao gravar termos comerciais: ${termsRes.error.message}`,
      };
    }

    if (bizRes.error) {
      return {
        success: false,
        error: `Falha ao atualizar status comercial da empresa: ${bizRes.error.message}`,
      };
    }

    // 7. Revalidação das rotas
    revalidatePath(`/admin/empresas/${biz.id}/contratacao`);
    revalidatePath(`/admin/empresas/${biz.id}`);
    revalidatePath('/admin/empresas');

    return {
      success: true,
      commercial_status: hasAdvancedPastCommercialTerms ? currentStatus : 'dados_comerciais_conferidos',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Erro inesperado ao conferir dados comerciais.',
    };
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
  requestedPlanCode: string,
  justification: string
): Promise<{
  success: boolean;
  data?: { plan_code: 'esquadro' | 'compasso' | 'acacia'; plan_name: string; entitlements: Record<string, number> };
  error?: string;
}> {
  try {
    const { supabase, user } = await assertPlatformAdminAccess();

    // A coluna canônica é businesses.plan_tier, com os códigos comerciais
    // (esquadro, compasso, acacia). Códigos legados da tela são normalizados.
    const newPlanCode = normalizeCanonicalPlanCode(requestedPlanCode);

    const { data: bData, error: findErr } = await (supabase as any)
      .from('businesses')
      .select('id, tenant_id, slug, plan_tier')
      .eq('id', businessId)
      .maybeSingle();

    if (findErr || !bData) {
      return { success: false, error: 'Empresa não localizada.' };
    }

    const oldPlan = bData.plan_tier || 'esquadro';

    // Escrita server-side autorizada: a RPC valida admin de plataforma e acesso ao tenant.
    const { error: updateErr } = await (supabase as any).rpc('admin_set_business_plan_tier', {
      p_business_id: businessId,
      p_plan_code: newPlanCode,
      p_justification: justification,
    });

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
    // Cotas do plano: as linhas de plan_entitlements usam o mesmo código canônico.
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
        plan_name: newPlanCode === 'acacia' ? 'Plano Acácia' : newPlanCode === 'compasso' ? 'Plano Compasso' : 'Plano Esquadro',
        entitlements,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Erro ao alterar plano comercial.' };
  }
}
