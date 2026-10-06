'use server';

import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { getCanonicalPlanByCode, normalizeCanonicalPlanCode } from '@/lib/billing/plans-service';
import { assertOperationalTenantId } from '@/lib/tenant/tenant-policy';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';

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
  // Gera acesso a dados e contratação da empresa: só admin de plataforma (a chave de serviço abaixo ignora RLS).
  const { user: adminUser } = await assertPlatformAdminAccess();
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
      .is('token_hash', null) // só os links de adesão antigos (texto puro); nunca os de assinatura/pagamento do contrato
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
      actor_id: adminUser.id,
      action: 'GENERATE_ONBOARDING_LINK',
      entity_type: 'business',
      entity_id: businessId,
      after_value: { commercial_status: 'contrato_enviado', token_expires_at: expiresAt },
      reason: 'Link individual de adesão gerado e enviado ao empresário.',
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

  // O token precisa existir na tabela de links: o id da empresa (que aparece em buscas públicas) nunca vale como acesso.
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

const LEGACY_FLOW_DISABLED =
  'Esta etapa foi movida para o link de contratação enviado pela equipe da Conexão. Solicite o link ao suporte.';

/**
 * Desativada: aceitava o texto do contrato e a assinatura enviados pelo navegador, sem versão oficial do termo nem prova de
 * integridade. A assinatura válida acontece em /contratacao/[token] (contrato versionado, com snapshot e hash).
 */
export async function signContractInOnboardingSessionAction(_params: {
  token: string;
  signerName: string;
  signerCpf: string;
  paymentConditionChoice: 'upfront' | 'installments';
  contractText: string;
  signatureImageData?: string;
}): Promise<{ success: boolean; contractId?: string; sha256Hash?: string; error?: string }> {
  return { success: false, error: LEGACY_FLOW_DISABLED };
}

/**
 * Desativada: confirmava o pagamento sem cobrança nem retorno do provedor (bastava ter o link). A confirmação de pagamento
 * só vem do webhook assinado do Asaas (/api/webhooks/asaas).
 */
export async function processCheckoutInOnboardingSessionAction(_params: {
  token: string;
  paymentMethod: 'pix' | 'credit_card';
  paymentConditionChoice: 'upfront' | 'installments';
  simulateWebhookConfirmation?: boolean;
}): Promise<{ success: boolean; error?: string }> {
  return { success: false, error: LEGACY_FLOW_DISABLED };
}
