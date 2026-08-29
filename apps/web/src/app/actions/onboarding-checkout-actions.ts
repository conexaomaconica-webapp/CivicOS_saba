'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import { getPlanPaymentRulesAction } from '@/lib/payment/payment-service';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

async function resolveTenantIdServer(): Promise<string> {
  let cleanHost = 'localhost';
  try {
    const reqHeaders = await headers();
    const host = reqHeaders?.get('host');
    const firstPart = host ? host.split(':')[0] : null;
    if (firstPart) cleanHost = firstPart.toLowerCase();
  } catch (_e) {
    // Test fallback
  }

  try {
    const supabase = getAdminSupabase();
    const { data } = await supabase.rpc('_resolve_tenant_by_host', { p_host: cleanHost });
    return data || '00000000-0000-0000-0000-000000000001';
  } catch (_e) {
    return '00000000-0000-0000-0000-000000000001';
  }
}

// ----------------------------------------------------------------------------
// 1. CRIAR EMPRESA RASCUNHO (DRAFT) & VINCULAR OWNER IMEDIATAMENTE NO PASSO 2
// ----------------------------------------------------------------------------

export async function createDraftBusinessAction(payload: {
  name: string;
  category?: string;
  city?: string;
  state?: string;
  whatsapp?: string;
  phone?: string;
}) {
  const supabase = getAdminSupabase();
  const tenantId = await resolveTenantIdServer();

  let userId = 'dev-user-id';
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) userId = user.id;
  } catch (_e) {
    // Mock user em dev/test
  }

  const slug = payload.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `empresa-${Date.now()}`;

  try {
    const { data: created, error } = await supabase
      .from('businesses')
      .insert({
        tenant_id: tenantId,
        name: payload.name,
        slug: `${slug}-${Math.floor(Math.random() * 1000)}`,
        category: payload.category || 'Outros',
        city: payload.city || 'São Paulo',
        state: payload.state || 'SP',
        whatsapp: payload.whatsapp || null,
        phone: payload.phone || null,
        is_published: false,
        publication_status: 'draft',
      })
      .select('id, name, slug')
      .single();

    if (error) {
      throw new Error(`Erro ao criar rascunho de empresa: ${error.message}`);
    }

    const businessId = created.id;

    await supabase
      .from('business_members')
      .insert({
        tenant_id: tenantId,
        business_id: businessId,
        user_id: userId,
        role: 'owner',
      })
      .select();

    return {
      success: true,
      business: { id: businessId, name: payload.name, slug: created.slug || slug },
    };
  } catch (err: any) {
    console.error('Erro em createDraftBusinessAction:', err);
    throw err;
  }
}

// ----------------------------------------------------------------------------
// 2. SELECIONAR PLANO E GERAR CHECKOUT (COM RESOLUÇÃO CANÔNICA DE PREÇOS)
// ----------------------------------------------------------------------------

export async function selectPlanAndGenerateCheckoutAction(
  businessId: string,
  rawPlanCode: string,
  provider: 'asaas' | 'stripe' | 'mercadopago' = 'asaas'
) {
  await resolveTenantIdServer();

  const isFounderRequested = rawPlanCode === 'ouro_founder';
  const planCode = isFounderRequested ? 'ouro' : rawPlanCode;

  if (!['bronze', 'prata', 'ouro'].includes(planCode)) {
    throw new Error('INVALID_PLAN: Plano selecionado é inválido.');
  }

  // Consulta regras canônicas de pagamento no banco
  const rules = await getPlanPaymentRulesAction(planCode);
  const amountCents = rules.amountCents;

  const checkoutId = `chk_${provider}_${Date.now()}_${businessId.substring(0, 8)}`;

  return {
    success: true,
    checkoutSession: {
      id: checkoutId,
      businessId,
      provider,
      planCode,
      isFounderRequested,
      amountCents,
      currency: 'BRL',
      paymentUrl: `/anunciar/passo-6?checkoutId=${checkoutId}&businessId=${businessId}&plan=${planCode}&provider=${provider}`,
    },
  };
}

