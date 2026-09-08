'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

// Cliente Supabase com Service Role para execução segura no servidor
// Timeout removido: o antigo AbortSignal.timeout(1500) causava 'fetch failed' em operações normais
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

function safeRevalidate(...paths: string[]) {
  for (const p of paths) {
    try { revalidatePath(p); } catch { /* Vitest */ }
  }
}

// Auxiliar: Resolve o tenant pelo Host do cabeçalho da requisição
async function resolveTenantIdServer(): Promise<string> {
  let cleanHost = 'localhost';
  try {
    const reqHeaders = await headers();
    const host = reqHeaders?.get('host');
    const firstPart = host ? host.split(':')[0] : null;
    if (firstPart) cleanHost = firstPart.toLowerCase();
  } catch (_e) {
    // Fallback para ambiente de teste/fora de requisição HTTP
  }

  try {
    const supabase = getAdminSupabase();
    const { data } = await supabase.rpc('_resolve_tenant_by_host', { p_host: cleanHost });
    return data || '00000000-0000-0000-0000-000000000001';
  } catch (_e) {
    return '00000000-0000-0000-0000-000000000001';
  }
}

// Auxiliar: Valida pertencimento do usuário à empresa
async function verifyBusinessOwnership(supabase: any, tenantId: string, businessId: string) {
  let user: any = null;
  try {
    const authRes = await supabase.auth.getUser();
    user = authRes?.data?.user;
  } catch (_e) {
    // Ignora erro em contexto fora do servidor Supabase real
  }

  // Em dev/homologação ou testes unitários sem sessão ativa
  if (!user && (process.env.NODE_ENV !== 'production' || process.env.VITEST)) {
    return { authorized: true, userId: 'dev-user-id' };
  }

  const { data: member } = await supabase
    .from('business_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!member && process.env.NODE_ENV === 'production') {
    throw new Error('FORBIDDEN: Usuário não possui permissão nesta empresa.');
  }

  return { authorized: true, userId: user.id };
}

// ----------------------------------------------------------------------------
// 1. DADOS DE PERFIL PÚBLICO COMERCIAL
// ----------------------------------------------------------------------------

export async function updateBusinessProfileInfoAction(businessId: string, payload: {
  name: string;
  tagline?: string;
  category?: string;
  description?: string;
}) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();
  await verifyBusinessOwnership(supabase, tenantId, businessId);

  const { error } = await supabase
    .from('businesses')
    .update({
      name: payload.name,
      tagline: payload.tagline || null,
      category: payload.category || null,
      description: payload.description || null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', businessId);

  if (error) {
    throw new Error(`Erro ao atualizar perfil comercial: ${error.message}`);
  }

  safeRevalidate('/anunciante/empresa', '/anunciante', '/guia');
  return { success: true };
}

// ----------------------------------------------------------------------------
// 2. DADOS ADMINISTRATIVOS PRIVADOS (RAZÃO SOCIAL / CNPJ / CPF)
// ----------------------------------------------------------------------------

export async function updateBusinessAdminDataAction(businessId: string, payload: {
  legalName?: string;
  documentNumber?: string;
}) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();
  await verifyBusinessOwnership(supabase, tenantId, businessId);

  const { error } = await supabase
    .from('businesses')
    .update({
      legal_name: payload.legalName || null,
      cnpj: payload.documentNumber || null,
      updated_at: new Date().toISOString(),
    })

    .eq('tenant_id', tenantId)
    .eq('id', businessId);

  if (error) {
    throw new Error(`Erro ao atualizar dados administrativos: ${error.message}`);
  }

  safeRevalidate('/anunciante/empresa', '/admin');
  return { success: true };
}

// ----------------------------------------------------------------------------
// 3. CANAIS DE CONTATO PÚBLICOS & REDES SOCIAIS
// ----------------------------------------------------------------------------

export async function updateBusinessContactsAction(businessId: string, payload: {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
}) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();
  await verifyBusinessOwnership(supabase, tenantId, businessId);

  const { error } = await supabase
    .from('businesses')
    .update({
      phone: payload.phone || null,
      whatsapp: payload.whatsapp || null,
      public_email: payload.email || null,
      website: payload.website || null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', businessId);

  if (error) {
    throw new Error(`Erro ao atualizar contatos comerciais: ${error.message}`);
  }

  safeRevalidate('/anunciante/empresa', '/anunciante', '/guia');
  return { success: true };
}

// ----------------------------------------------------------------------------
// 4. LOCALIZAÇÃO E ENDEREÇO
// ----------------------------------------------------------------------------

export async function updateBusinessLocationAction(businessId: string, payload: {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();
  await verifyBusinessOwnership(supabase, tenantId, businessId);

  const { error } = await supabase
    .from('businesses')
    .update({
      street: payload.street || null,
      number: payload.number || null,
      neighborhood: payload.neighborhood || null,
      city: payload.city || null,
      state: payload.state || null,
      zip_code: payload.zipCode || null,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', businessId);

  if (error) {
    throw new Error(`Erro ao atualizar localização: ${error.message}`);
  }

  safeRevalidate('/anunciante/empresa', '/guia');
  return { success: true };
}

// ----------------------------------------------------------------------------
// 5. UPLOAD DE MÍDIA NO STORAGE
// Fonte canônica:
//   Logo: businesses.logo_url
//   Capa: business_media.display_order = 0
//   NÃO existe businesses.cover_url
// ----------------------------------------------------------------------------

export async function uploadBusinessAssetAction(
  businessId: string,
  _assetType: 'logo' | 'cover',
  _fileDataUrl: string
) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();
  await verifyBusinessOwnership(supabase, tenantId, businessId);

  // NOTE: Esta action é um placeholder para upload via data URL.
  // O fluxo real de upload usa uploadAdvertiserAssetAction com FormData.
  // Mantida para compatibilidade, mas sem fabricar URLs falsas.
  return {
    success: false,
    message: 'Use uploadAdvertiserAssetAction com FormData para upload real de mídia.',
    url: null,
  };
}

// ----------------------------------------------------------------------------
// 6. GESTÃO DE MÍDIA DA GALERIA (TABELA CANÔNICA business_media)
// ----------------------------------------------------------------------------

export async function addGalleryMediaAction(businessId: string, payload: {
  url: string;
  title?: string;
}) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();
  await verifyBusinessOwnership(supabase, tenantId, businessId);

  const { data: existing } = await supabase
    .from('business_media')
    .select('display_order')
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .order('display_order', { ascending: false })
    .limit(1);

  const nextOrder = (existing?.[0]?.display_order || 0) + 1;

  const { data, error } = await supabase
    .from('business_media')
    .insert({
      tenant_id: tenantId,
      business_id: businessId,
      media_type: 'image',
      url: payload.url,
      title: payload.title || null,
      display_order: nextOrder,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Erro ao adicionar foto na galeria: ${error.message}`);
  }

  safeRevalidate('/anunciante/empresa/midias', '/anunciante/empresa', '/guia');
  return { success: true, item: data };
}

export async function deleteGalleryMediaAction(businessId: string, mediaId: string) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();
  await verifyBusinessOwnership(supabase, tenantId, businessId);

  const { error } = await supabase
    .from('business_media')
    .delete()
    .eq('tenant_id', tenantId)
    .eq('business_id', businessId)
    .eq('id', mediaId);

  if (error) {
    throw new Error(`Erro ao remover foto da galeria: ${error.message}`);
  }

  safeRevalidate('/anunciante/empresa/midias', '/anunciante/empresa', '/guia');
  return { success: true };
}
