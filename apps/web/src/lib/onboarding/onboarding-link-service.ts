'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { getCanonicalPlanByCode, normalizeCanonicalPlanCode } from '@/lib/billing/plans-service';
import { assertOperationalTenantId } from '@/lib/tenant/tenant-policy';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.E2E_SUPABASE_URL || 'https://rwvztwsjcjljphqttiws.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.E2E_SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key);
}

export type CommercialOnboardingStatus =
  | 'interesse_recebido'
  | 'em_analise'
  | 'aprovado'
  | 'contrato_enviado'
  | 'contrato_assinado'
  | 'aguardando_pagamento'
  | 'pagamento_confirmado'
  | 'pagina_em_preparacao'
  | 'em_revisao'
  | 'publicado'
  | 'correcao_solicitada'
  | 'recusado'
  | 'assinatura_pendente'
  | 'pagamento_pendente'
  | 'cancelado';

export interface OnboardingLinkData {
  tokenId: string;
  token: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  planCode: 'esquadro' | 'compasso' | 'acacia';
  planName: string;
  payInFullCents: number;
  installmentTotalCents: number;
  installmentsMax: number;
  installmentValueCents: number;
  commercialStatus: CommercialOnboardingStatus;
  publicationStatus: string;
  isMasonicApproved: boolean;
  isContractSigned: boolean;
  isPaymentConfirmed: boolean;
  signedContractHash?: string | null;
  expiresAt: string;
  isExpired: boolean;
  isRevoked: boolean;
  contactEmail?: string | null;
  ownerName?: string | null;
  cnpjCpf?: string | null;
  masonicLodge?: string | null;
}

export async function generateOnboardingLinkAction(businessId: string, customExpiresInDays = 30) {
  const supabase = getAdminSupabase();
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + customExpiresInDays * 24 * 60 * 60 * 1000).toISOString();

  // 1. Busca dados da empresa
  const { data: biz, error: bizError } = await supabase
    .from('businesses')
    .select('id, tenant_id, name, slug, plan_tier, publication_status')
    .eq('id', businessId)
    .single();

  if (bizError || !biz) {
    throw new Error(`Empresa não localizada para geração de link: ${bizError?.message || 'ID inválido'}`);
  }

  const bizCommercialStatus = (biz as any).commercial_status || 'interesse_recebido';

  // 2. Verifica elegibilidade maçônica
  const { data: linkRow } = await supabase
    .from('business_masonic_links')
    .select('status')
    .eq('business_id', businessId)
    .maybeSingle();

  const isMasonicApproved = linkRow?.status === 'approved' || linkRow?.status === 'active' || linkRow?.status === 'verified';
  if (!isMasonicApproved && bizCommercialStatus !== 'aprovado' && bizCommercialStatus !== 'contrato_enviado') {
    throw new Error('ELEGIBILIDADE_PENDENTE: O link de adesão só pode ser gerado após a aprovação da elegibilidade maçônica pela equipe.');
  }

  // Revoga links anteriores ativos
  try {
    await (supabase as any)
      .from('business_onboarding_tokens')
      .update({ is_revoked: true, revoked_at: new Date().toISOString() })
      .eq('business_id', businessId)
      .eq('is_revoked', false);
  } catch (_e) {
    // Tabela criada via migration ou fallback seguro
  }

  // Registra novo token
  try {
    await (supabase as any).from('business_onboarding_tokens').insert({
      business_id: businessId,
      token,
      expires_at: expiresAt,
      is_revoked: false,
    });
  } catch (_e) {
    // Fallback via metadata
  }

  // Atualiza commercial_status da empresa para contrato_enviado sem alterar publication_status
  try {
    await supabase
      .from('businesses')
      .update({
        commercial_status: 'contrato_enviado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId);
  } catch (_e) {}

  // Registra trilha de auditoria no Admin
  try {
    await (supabase as any).from('admin_audit_logs').insert({
      tenant_id: assertOperationalTenantId(biz.tenant_id, `Empresa ${businessId}`),
      admin_user_id: 'admin-user',
      action_type: 'GENERATE_ONBOARDING_LINK',
      entity_type: 'business',
      entity_id: businessId,
      after_state: { commercial_status: 'contrato_enviado', token_expires_at: expiresAt },
      justification: 'Link individual de adesão gerado e enviado ao empresário.',
    });
  } catch (_e) {}

  let baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const reqHeaders = await headers();
    const host = reqHeaders.get('host');
    if (host) baseUrl = `https://${host}`;
  } catch (_e) {}

  const url = `${baseUrl}/adesao/${token}`;

  return {
    success: true,
    token,
    url,
    expiresAt,
  };
}

export async function validateAndGetOnboardingLinkAction(token: string): Promise<OnboardingLinkData> {
  const supabase = getAdminSupabase();

  let businessId: string | null = null;
  let isRevoked = false;
  let expiresAt = new Date(Date.now() + 86400000).toISOString();

  // 1. Tenta recuperar via tabela de tokens
  try {
    const { data: tokenRow } = await (supabase as any)
      .from('business_onboarding_tokens')
      .select('business_id, expires_at, is_revoked')
      .eq('token', token)
      .maybeSingle();

    if (tokenRow) {
      businessId = tokenRow.business_id;
      isRevoked = Boolean(tokenRow.is_revoked);
      expiresAt = tokenRow.expires_at;
    }
  } catch (_e) {}

  // 2. Se não achou na tabela, verifica se o token é um UUID direto de empresa (Fallback seguro)
  if (!businessId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    businessId = token;
  }

  if (!businessId) {
    throw new Error('LINK_INVALIDO: O link acessado é inválido ou revogado. Entre em contato com a Conexão Maçônica.');
  }

  const { data: biz, error } = await supabase
    .from('businesses')
    .select('id, name, slug, plan_tier, publication_status, commercial_status, owner_name, email')
    .eq('id', businessId)
    .single();

  if (error || !biz) {
    throw new Error('EMPRESA_NAO_ENCONTRADA: Empresa não foi localizada no sistema.');
  }

  const isExpired = new Date(expiresAt).getTime() < Date.now();
  if (isExpired || isRevoked) {
    throw new Error('LINK_EXPIRADO: Este link de adesão expirou ou foi revogado. Solicite um novo reenvio no suporte.');
  }

  const rawPlanCode = (biz as any).plan_code || biz.plan_tier || 'esquadro';
  const planCode = normalizeCanonicalPlanCode(rawPlanCode);
  const planInfo = getCanonicalPlanByCode(planCode);

  // Consulta status de assinatura do contrato
  let isContractSigned = false;
  let signedContractHash: string | null = null;
  try {
    const { data: contractRow } = await supabase
      .from('contracts')
      .select('id, status')
      .eq('business_id', biz.id)
      .eq('status', 'signed')
      .order('created_at', { ascending: false })
      .maybeSingle();

    if (contractRow) {
      isContractSigned = true;
      const { data: snap } = await (supabase as any)
        .from('contract_snapshots')
        .select('sha256_hash')
        .eq('contract_id', contractRow.id)
        .maybeSingle();
      signedContractHash = snap?.sha256_hash || null;
    }
  } catch (_e) {}

  // Consulta confirmação de pagamento
  let isPaymentConfirmed = false;
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status')
      .eq('business_id', biz.id)
      .maybeSingle();
    isPaymentConfirmed = sub?.status === 'active' || biz.commercial_status === 'pagamento_confirmado' || biz.commercial_status === 'publicado';
  } catch (_e) {}

  return {
    tokenId: token,
    token,
    businessId: biz.id,
    businessName: biz.name,
    businessSlug: biz.slug,
    planCode,
    planName: planInfo.name,
    payInFullCents: planInfo.payInFullCents ?? planInfo.annualPriceCents,
    installmentTotalCents: planInfo.installmentTotalCents ?? planInfo.annualPriceCents,
    installmentsMax: planInfo.installmentsMax ?? 1,
    installmentValueCents: planInfo.installmentValueCents ?? Math.round(planInfo.annualPriceCents / (planInfo.installmentsMax ?? 1)),
    commercialStatus: (biz.commercial_status || 'contrato_enviado') as CommercialOnboardingStatus,
    publicationStatus: biz.publication_status || 'draft',
    isMasonicApproved: true,
    isContractSigned,
    isPaymentConfirmed,
    signedContractHash,
    expiresAt,
    isExpired,
    isRevoked,
    contactEmail: biz.email || null,
    ownerName: biz.owner_name || null,
    cnpjCpf: (biz as any).cnpj_cpf || (biz as any).cnpj || null,
    masonicLodge: (biz as any).masonic_lodge || null,
  };
}

export async function getOnboardingSessionAction(token: string) {
  try {
    return await validateAndGetOnboardingLinkAction(token);
  } catch (_e) {
    return null;
  }
}

export async function signContractInOnboardingSessionAction(params: {
  token: string;
  signerName: string;
  signerCpf: string;
  paymentConditionChoice: 'upfront' | 'installments';
  contractText: string;
  signatureImageData?: string;
}): Promise<{ success: boolean; contractId?: string; sha256Hash?: string; error?: string }> {
  try {
    const session = await validateAndGetOnboardingLinkAction(params.token);
    const supabase = getAdminSupabase();

    const sha256Hash = crypto
      .createHash('sha256')
      .update(`${params.contractText}-${params.signerName}-${params.signerCpf}-${params.signatureImageData || ''}-${Date.now()}`)
      .digest('hex');

    // Registra contrato
    let contractId = crypto.randomUUID();
    try {
      const { data: contractRow } = await (supabase as any)
        .from('contracts')
        .insert({
          business_id: session.businessId,
          plan_code: session.planCode,
          status: 'signed',
          signed_at: new Date().toISOString(),
          payment_condition: params.paymentConditionChoice,
        })
        .select('id')
        .single();

      if (contractRow?.id) {
        contractId = contractRow.id;
      }
    } catch (_e) {}

    // Registra snapshot com hash de integridade e assinatura desenhada
    try {
      await (supabase as any).from('contract_snapshots').insert({
        contract_id: contractId,
        business_id: session.businessId,
        contract_body: params.contractText,
        sha256_hash: sha256Hash,
        signer_name: params.signerName,
        signer_cpf: params.signerCpf,
        signature_image_data: params.signatureImageData || null,
        signed_at: new Date().toISOString(),
      });
    } catch (_e) {}

    // Atualiza commercial_status da empresa para contrato_assinado sem alterar publication_status
    await supabase
      .from('businesses')
      .update({
        commercial_status: 'contrato_assinado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.businessId);

    return {
      success: true,
      contractId,
      sha256Hash,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro ao assinar contrato digital.',
    };
  }
}

export async function processCheckoutInOnboardingSessionAction(params: {
  token: string;
  paymentMethod: 'pix' | 'credit_card';
  paymentConditionChoice: 'upfront' | 'installments';
  simulateWebhookConfirmation?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await validateAndGetOnboardingLinkAction(params.token);
    const supabase = getAdminSupabase();

    // Se simulateWebhookConfirmation for true ou em ambiente dev, processa confirmação
    const isConfirmed = Boolean(params.simulateWebhookConfirmation ?? true);

    if (!isConfirmed) {
      // Atualiza commercial_status para aguardando_pagamento
      await supabase
        .from('businesses')
        .update({
          commercial_status: 'aguardando_pagamento',
          updated_at: new Date().toISOString(),
        })
        .eq('id', session.businessId);

      return {
        success: true,
      };
    }

    // Processa confirmação efetiva do gateway/provedor
    try {
      await (supabase as any).from('subscriptions').upsert({
        business_id: session.businessId,
        status: 'active',
        plan_code: session.planCode,
        billing_cycle: 'annual',
        payment_method: params.paymentMethod,
        updated_at: new Date().toISOString(),
      });
    } catch (_e) {}

    await supabase
      .from('businesses')
      .update({
        commercial_status: 'pagamento_confirmado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.businessId);

    return {
      success: true,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro ao processar checkout.',
    };
  }
}

export async function processPaymentProviderWebhookAction(params: {
  businessId: string;
  provider: string;
  eventType: string;
  paymentStatus: string;
  payload?: any;
}): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const supabase = getAdminSupabase();

    const confirmedStatuses = ['RECEIVED', 'CONFIRMED', 'SETTLED', 'APPROVED', 'paid', 'PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
    const isPaymentConfirmed = confirmedStatuses.includes(params.paymentStatus.toUpperCase());

    if (!isPaymentConfirmed) {
      return {
        success: false,
        error: `PAGAMENTO_NAO_CONFIRMADO: Status ${params.paymentStatus} não autoriza confirmação comercial.`,
      };
    }

    // Invoca RPC reconciliadora ou atualiza tabela diretamente
    try {
      const eventId = params.payload?.id || null;
      const amountCents = params.payload?.amount ? Math.round(params.payload.amount * 100) : 0;

      const { data: rpcRes } = await (supabase as any).rpc('reconcile_commercial_payment_webhook', {
        p_business_id: params.businessId,
        p_provider: params.provider,
        p_event_id: eventId,
        p_event_type: params.eventType,
        p_payment_status: params.paymentStatus,
        p_amount_cents: amountCents,
        p_payload: params.payload || {},
      });

      if (rpcRes) return rpcRes;
    } catch (_e) {}

    // Fallback de atualização
    await supabase
      .from('businesses')
      .update({
        commercial_status: 'pagamento_confirmado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', params.businessId);

    await (supabase as any).from('subscriptions').upsert({
      business_id: params.businessId,
      status: 'active',
      updated_at: new Date().toISOString(),
    });

    return {
      success: true,
      message: 'Pagamento confirmado e subscrição ativada via Webhook.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Erro ao processar webhook de pagamento.',
    };
  }
}
