/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion */
'use server';

import crypto from 'crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { assertPlatformAdminAccess } from '@/lib/admin/admin-auth-helper';
import type { Database } from '@/types/database.types';
import type { AppDatabase } from '@/types/database-extensions';
import { getEmailProvider, brandedEmailHtml } from '@/lib/email/send-email';
import { generatePublicLinkToken } from '@/lib/security/public-link-token';
import { pickResponsibleName } from '@/lib/contracts/responsible-name';

export interface DispatchContractEmailResult {
  success: boolean;
  status: 'accepted' | 'failed' | 'unknown' | 'already_processing';
  provider: string;
  dispatchId?: string;
  providerMessageId?: string;
  publicUrl?: string;
  error?: string;
  detail?: string;
}

export interface DispatchContractEmailOptions {
  businessId: string;
  adminUserId?: string;
  overrideRecipientEmail?: string;
  dbClient: SupabaseClient<AppDatabase>;
  siteBaseUrl?: string;
}

const CONCURRENCY_LEASE_MS = 3 * 60 * 1000; // 3 minutos de bloqueio contra disparos simultâneos

/**
 * Serviço de envio transacional de contratos aos anunciantes via Hostinger Mail API.
 *
 * Princípios de segurança e integridade:
 * 1. O token anterior NUNCA é revogado antes da confirmação de entrega do provedor.
 * 2. Em casos ambíguos (timeout, 5xx, erro de rede), o estado é marcado como 'unknown',
 *    o token anterior é preservado e NUNCA há retentativa automática.
 * 3. O contrato, snapshot imutável, hash SHA-256 e condições comerciais são 100% preservados.
 * 4. Bloqueio persistente de concorrência registrado na tabela contract_email_dispatches.
 */
export async function dispatchContractEmail(
  options: DispatchContractEmailOptions
): Promise<DispatchContractEmailResult> {
  const { businessId, adminUserId, overrideRecipientEmail, dbClient } = options;
  const baseUrl = (options.siteBaseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://conexaomaconica.com.br').replace(/\/+$/, '');
  const provider = getEmailProvider();

  // 1. Localiza a empresa
  const { data: business, error: bizErr } = await (dbClient as any)
    .from('businesses')
    .select('id, tenant_id, name, legal_name, cnpj, email, commercial_status, owner_id')
    .eq('id', businessId)
    .single();

  if (bizErr || !business) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Empresa não encontrada para envio de contrato.',
    };
  }

  // 2. Localiza contrato em aguardo de assinatura ou recém-gerado
  const { data: contract, error: contractErr } = await (dbClient as any)
    .from('contracts')
    .select('id, status, tenant_id')
    .eq('business_id', businessId)
    .in('status', ['awaiting_signature', 'draft'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contractErr || !contract) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Nenhum contrato aguardando assinatura foi localizado para esta empresa.',
    };
  }

  // 3. Localiza o snapshot imutável ativo do contrato
  const { data: activeSnapshot, error: snapErr } = await (dbClient as any)
    .from('contract_snapshots')
    .select('id, sha256_hash, template_title')
    .eq('contract_id', contract.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapErr || !activeSnapshot) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Snapshot imutável do contrato não localizado. Gere a minuta antes de enviar.',
    };
  }

  // 4. Concorrência e Idempotência Persistente (Tabela contract_email_dispatches)
  const now = new Date();
  const leaseThreshold = new Date(now.getTime() - CONCURRENCY_LEASE_MS).toISOString();

  const { data: inFlight } = await (dbClient as any)
    .from('contract_email_dispatches')
    .select('id, created_at, dispatch_status')
    .eq('contract_id', contract.id)
    .eq('dispatch_status', 'processing')
    .gt('created_at', leaseThreshold)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inFlight) {
    return {
      success: false,
      status: 'already_processing',
      provider: provider.name,
      error: 'Já existe um envio deste contrato em andamento. Aguarde a conclusão do processo.',
    };
  }

  // 5. Determina nome e e-mail do destinatário
  const { data: resp } = await (dbClient as any)
    .from('business_responsibles')
    .select('name, email')
    .eq('business_id', businessId)
    .maybeSingle();

  let recipientName = pickResponsibleName(resp?.name);
  if (!recipientName && business.owner_id) {
    const { data: prof } = await (dbClient as any)
      .from('profiles')
      .select('name')
      .eq('id', business.owner_id)
      .maybeSingle();
    recipientName = pickResponsibleName(prof?.name);
  }
  recipientName = recipientName || business.name;

  const recipientEmail = (
    overrideRecipientEmail ||
    resp?.email ||
    business.email ||
    ''
  ).trim();

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Nenhum endereço de e-mail válido foi encontrado no cadastro da empresa ou responsável.',
    };
  }

  // 6. Gera novo token de acesso público para este envio (sem revogar o anterior)
  const rawToken = generatePublicLinkToken();
  const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: newTokenRow, error: tokenErr } = await (dbClient as any)
    .from('business_onboarding_tokens')
    .insert({
      business_id: businessId,
      contract_id: contract.id,
      snapshot_id: activeSnapshot.id,
      token: null, // Hardening: não armazenar token puro
      token_hash: tokenHash,
      expires_at: expiresAt,
      is_revoked: false,
    })
    .select('id')
    .single();

  if (tokenErr || !newTokenRow) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Falha ao registrar credencial de acesso seguro do contrato.',
      detail: tokenErr?.message,
    };
  }

  const publicUrl = `${baseUrl}/contratacao/${rawToken}`;
  const idempotencyKey = `disp_${contract.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // 7. Registra tentativa em estado 'processing' (bloqueio de concorrência)
  const { data: dispatchRecord, error: dispatchErr } = await (dbClient as any)
    .from('contract_email_dispatches')
    .insert({
      contract_id: contract.id,
      business_id: businessId,
      tenant_id: contract.tenant_id,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      idempotency_key: idempotencyKey,
      dispatch_status: 'processing',
      provider: provider.name,
      token_id: newTokenRow.id,
    })
    .select('id')
    .single();

  if (dispatchErr || !dispatchRecord) {
    // Reverte o token recém-criado em caso de falha de banco no registro de despacho
    await (dbClient as any)
      .from('business_onboarding_tokens')
      .delete()
      .eq('id', newTokenRow.id);

    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Falha ao registrar controle de envio do contrato.',
      detail: dispatchErr?.message,
    };
  }

  const dispatchId = dispatchRecord.id;

  // 8. Monta mensagem formatada (HTML + Texto)
  const subject = `Contrato de Adesão — ${business.name} | Conexão Maçônica`;
  const paragraphs = [
    `Olá, ${recipientName}.`,
    `O contrato de adesão da sua empresa (${business.name}) ao Guia Conexão Maçônica está disponível para conferência e assinatura digital.`,
    `Os termos comerciais, vigência e condições pactuadas foram validados sob o código de integridade SHA-256: ${activeSnapshot.sha256_hash.slice(0, 16)}...`,
    `Para revisar as cláusulas na íntegra e assinar digitalmente de forma rápida e segura, utilize o link exclusivo abaixo:`,
  ];

  const html = brandedEmailHtml({
    brandName: 'Conexão Maçônica — Guia Oficial',
    primaryColor: '#5d1523',
    heading: 'Contrato de Adesão Disponível',
    paragraphs,
    buttonLabel: 'Revisar e Assinar Contrato',
    buttonUrl: publicUrl,
    footnote: 'Este link é exclusivo para a sua empresa e possui validade de 7 dias corridos. NUNCA compartilhe este e-mail com terceiros não autorizados.',
  });

  const text = [
    `Olá, ${recipientName}.`,
    '',
    `O contrato de adesão da sua empresa (${business.name}) ao Guia Conexão Maçônica está pronto para assinatura digital.`,
    '',
    `Acesse o endereço seguro abaixo para conferir as cláusulas e assinar:`,
    publicUrl,
    '',
    `Código de integridade (SHA-256): ${activeSnapshot.sha256_hash}`,
    'Validade do link: 7 dias.',
    '',
    'Atenciosamente,',
    'Equipe Conexão Maçônica',
  ].join('\n');

  // 9. Executa envio através do provedor configurado (Hostinger Mail API prioritária)
  const sendResult = await provider.send({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  const completedAt = new Date().toISOString();

  // 10. Trata resultado de acordo com as regras de segurança
  if (sendResult.sent && sendResult.status === 'accepted') {
    // SUCESSO: Atualiza status do despacho para 'accepted'
    await (dbClient as any)
      .from('contract_email_dispatches')
      .update({
        dispatch_status: 'accepted',
        provider_message_id: sendResult.providerMessageId || null,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', dispatchId);

    // Se o status da empresa ainda não estava em 'contrato_enviado', atualiza
    if (business.commercial_status !== 'contrato_enviado') {
      await (dbClient as any)
        .from('businesses')
        .update({
          commercial_status: 'contrato_enviado',
          updated_at: completedAt,
        })
        .eq('id', businessId);
    }

    if (contract.status !== 'awaiting_signature') {
      await (dbClient as any)
        .from('contracts')
        .update({
          status: 'awaiting_signature',
          updated_at: completedAt,
        })
        .eq('id', contract.id);
    }

    // Auditoria administrativa
    if (adminUserId) {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: contract.tenant_id,
        actor_id: adminUserId,
        action: 'SEND_CONTRACT_EMAIL_ACCEPTED',
        entity_type: 'contract',
        entity_id: contract.id,
        before_value: { commercial_status: business.commercial_status },
        after_value: {
          commercial_status: 'contrato_enviado',
          provider: provider.name,
          recipient: recipientEmail,
          provider_message_id: sendResult.providerMessageId,
        },
        reason: 'Contrato enviado com sucesso ao anunciante por e-mail.',
      });
    }

    return {
      success: true,
      status: 'accepted',
      provider: provider.name,
      dispatchId,
      providerMessageId: sendResult.providerMessageId,
      publicUrl,
    };
  }

  if (sendResult.status === 'unknown') {
    // RESULTADO AMBÍGUO (TIMEOUT / ERRO DE REDE / 5XX):
    // Não revoga tokens anteriores, não reenvia automaticamente e registra estado 'unknown'
    await (dbClient as any)
      .from('contract_email_dispatches')
      .update({
        dispatch_status: 'unknown',
        error_message: sendResult.error || 'Timeout ou erro de rede ao aguardar retorno do provedor.',
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', dispatchId);

    if (adminUserId) {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: contract.tenant_id,
        actor_id: adminUserId,
        action: 'SEND_CONTRACT_EMAIL_UNKNOWN',
        entity_type: 'contract',
        entity_id: contract.id,
        before_value: { commercial_status: business.commercial_status },
        after_value: {
          error: sendResult.error,
          detail: sendResult.detail,
          provider: provider.name,
        },
        reason: 'Envio de contrato com resultado ambíguo (timeout/rede). Tokens anteriores preservados sem retentativa.',
      });
    }

    return {
      success: false,
      status: 'unknown',
      provider: provider.name,
      dispatchId,
      publicUrl,
      error: 'Envio com resultado incerto (timeout ou oscilação na Hostinger). O link anterior do anunciante permanece 100% válido. Não reenviamos automaticamente para evitar mensagens duplicadas.',
      detail: sendResult.detail,
    };
  }

  // sendResult.status === 'failed' ou 'not_configured':
  // Rejeição formal: marca como failed e invalida o novo token que não chegou a ser entregue
  await (dbClient as any)
    .from('contract_email_dispatches')
    .update({
      dispatch_status: 'failed',
      error_message: sendResult.error || 'Envio rejeitado pelo provedor de e-mail.',
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', dispatchId);

  // Invalida o token que nunca chegou ao destinatário
  await (dbClient as any)
    .from('business_onboarding_tokens')
    .update({ is_revoked: true, revoked_at: completedAt })
    .eq('id', newTokenRow.id);

  return {
    success: false,
    status: 'failed',
    provider: provider.name,
    dispatchId,
    error: sendResult.error || 'Falha ao entregar e-mail pelo provedor.',
    detail: sendResult.detail,
  };
}

export interface SendContractEmailResult {
  success: boolean;
  status: 'accepted' | 'failed' | 'unknown' | 'already_processing';
  provider: string;
  error?: string;
  detail?: string;
  public_url?: string;
}

export async function sendContractEmailToAdvertiserAction(
  businessId: string,
  overrideRecipientEmail?: string
): Promise<SendContractEmailResult> {
  try {
    const { user, supabase } = await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return {
        success: false,
        status: 'failed',
        provider: 'hostinger',
        error: 'Identificador da empresa é obrigatório.',
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient =
      serviceRoleKey && supabaseUrl
        ? createClient<Database>(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase;

    const result = await dispatchContractEmail({
      businessId,
      adminUserId: user.id,
      overrideRecipientEmail,
      dbClient: dbClient as any,
    });

    if (result.success) {
      revalidatePath('/admin/empresas');
      revalidatePath(`/admin/empresas/${businessId}`);
      revalidatePath(`/admin/empresas/${businessId}/contratacao`);
    }

    return {
      success: result.success,
      status: result.status,
      provider: result.provider,
      error: result.error,
      detail: result.detail,
      public_url: result.publicUrl,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado ao enviar contrato por e-mail.';
    console.error('[sendContractEmailToAdvertiserAction] Exception:', err);
    return {
      success: false,
      status: 'failed',
      provider: 'hostinger',
      error: message,
    };
  }
}

export interface DispatchPaymentLinkEmailOptions {
  businessId: string;
  adminUserId?: string;
  overrideRecipientEmail?: string;
  dbClient: SupabaseClient<AppDatabase>;
  siteBaseUrl?: string;
}

/**
 * Envia e-mail com o link de pagamento exclusivo do anunciante (Etapa 6).
 * Utilizado quando o contrato já foi assinado e a empresa está aguardando pagamento.
 */
export async function dispatchPaymentLinkEmail(
  options: DispatchPaymentLinkEmailOptions
): Promise<DispatchContractEmailResult> {
  const { businessId, adminUserId, overrideRecipientEmail, dbClient } = options;
  const baseUrl = (options.siteBaseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'https://conexaomaconica.com.br').replace(/\/+$/, '');
  const provider = getEmailProvider();

  // 1. Localiza a empresa
  const { data: business, error: bizErr } = await (dbClient as any)
    .from('businesses')
    .select('id, tenant_id, name, legal_name, cnpj, email, commercial_status, owner_id')
    .eq('id', businessId)
    .single();

  if (bizErr || !business) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Empresa não encontrada para envio do link de pagamento.',
    };
  }

  // 2. Localiza contrato assinado
  const { data: contract, error: contractErr } = await (dbClient as any)
    .from('contracts')
    .select('id, status, tenant_id')
    .eq('business_id', businessId)
    .eq('status', 'signed')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (contractErr || !contract) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Nenhum contrato assinado foi localizado para esta empresa.',
    };
  }

  // 3. Localiza o snapshot do contrato assinado
  const { data: activeSnapshot, error: snapErr } = await (dbClient as any)
    .from('contract_snapshots')
    .select('id, sha256_hash, template_title')
    .eq('contract_id', contract.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (snapErr || !activeSnapshot) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Snapshot imutável do contrato assinado não localizado.',
    };
  }

  // 4. Bloqueio persistente de concorrência (lease de 3 minutos)
  const now = new Date();
  const leaseThreshold = new Date(now.getTime() - CONCURRENCY_LEASE_MS).toISOString();

  const { data: inFlight } = await (dbClient as any)
    .from('contract_email_dispatches')
    .select('id, created_at, dispatch_status')
    .eq('contract_id', contract.id)
    .eq('dispatch_status', 'processing')
    .gt('created_at', leaseThreshold)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inFlight) {
    return {
      success: false,
      status: 'already_processing',
      provider: provider.name,
      error: 'Já existe um envio deste link em andamento. Aguarde alguns instantes.',
    };
  }

  // 5. Determina destinatário
  const { data: resp } = await (dbClient as any)
    .from('business_responsibles')
    .select('name, email')
    .eq('business_id', businessId)
    .maybeSingle();

  let recipientName = pickResponsibleName(resp?.name);
  if (!recipientName && business.owner_id) {
    const { data: prof } = await (dbClient as any)
      .from('profiles')
      .select('name')
      .eq('id', business.owner_id)
      .maybeSingle();
    recipientName = pickResponsibleName(prof?.name);
  }
  recipientName = recipientName || business.name;

  const recipientEmail = (
    overrideRecipientEmail ||
    resp?.email ||
    business.email ||
    ''
  ).trim();

  if (!recipientEmail || !recipientEmail.includes('@')) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Nenhum endereço de e-mail válido foi encontrado no cadastro da empresa ou responsável.',
    };
  }

  // 6. Revoga links anteriores de pagamento e gera novo token seguro
  await (dbClient as any)
    .from('business_onboarding_tokens')
    .update({ is_revoked: true, revoked_at: now.toISOString() })
    .eq('business_id', businessId)
    .eq('token_type', 'onboarding_payment')
    .eq('is_revoked', false);

  const rawToken = generatePublicLinkToken();
  const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: newTokenRow, error: tokenErr } = await (dbClient as any)
    .from('business_onboarding_tokens')
    .insert({
      business_id: businessId,
      contract_id: contract.id,
      snapshot_id: activeSnapshot.id,
      token_type: 'onboarding_payment',
      token: null,
      token_hash: tokenHash,
      expires_at: expiresAt,
      is_revoked: false,
    })
    .select('id')
    .single();

  if (tokenErr || !newTokenRow) {
    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Falha ao registrar credencial de acesso seguro do pagamento.',
      detail: tokenErr?.message,
    };
  }

  const publicUrl = `${baseUrl}/contratacao/${rawToken}`;
  const idempotencyKey = `pay_disp_${contract.id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

  // 7. Registra tentativa em processamento
  const { data: dispatchRecord, error: dispatchErr } = await (dbClient as any)
    .from('contract_email_dispatches')
    .insert({
      contract_id: contract.id,
      business_id: businessId,
      tenant_id: contract.tenant_id,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      idempotency_key: idempotencyKey,
      dispatch_status: 'processing',
      provider: provider.name,
      token_id: newTokenRow.id,
    })
    .select('id')
    .single();

  if (dispatchErr || !dispatchRecord) {
    await (dbClient as any)
      .from('business_onboarding_tokens')
      .delete()
      .eq('id', newTokenRow.id);

    return {
      success: false,
      status: 'failed',
      provider: provider.name,
      error: 'Falha ao registrar controle de envio do link de pagamento.',
      detail: dispatchErr?.message,
    };
  }

  const dispatchId = dispatchRecord.id;

  // 8. Mensagem formatada específica de PAGAMENTO
  const subject = `Link de Pagamento — ${business.name} | Conexão Maçônica`;
  const paragraphs = [
    `Olá, ${recipientName}.`,
    `O contrato de adesão da sua empresa (${business.name}) ao Guia Conexão Maçônica já foi assinado com sucesso!`,
    `Para concluir a contratação e ativar a sua empresa no Guia Oficial dos Irmãos, efetue o pagamento da adesão (via Pix ou Cartão de Crédito) através do link seguro abaixo:`,
  ];

  const html = brandedEmailHtml({
    brandName: 'Conexão Maçônica — Guia Oficial',
    primaryColor: '#5d1523',
    heading: 'Pagamento da Contratação Disponível',
    paragraphs,
    buttonLabel: 'Efetuar Pagamento da Contratação',
    buttonUrl: publicUrl,
    footnote: 'Este link é exclusivo para a sua empresa e possui validade de 7 dias corridos. NUNCA compartilhe este e-mail com terceiros não autorizados.',
  });

  const text = [
    `Olá, ${recipientName}.`,
    '',
    `O contrato de adesão da sua empresa (${business.name}) ao Guia Conexão Maçônica já foi assinado com sucesso!`,
    '',
    `Para efetuar o pagamento da contratação (Pix ou Cartão) e concluir a ativação, acesse o link exclusivo:`,
    publicUrl,
    '',
    'Validade do link: 7 dias.',
    '',
    'Atenciosamente,',
    'Equipe Conexão Maçônica',
  ].join('\n');

  // 9. Envio através do provedor
  const sendResult = await provider.send({
    to: recipientEmail,
    subject,
    html,
    text,
  });

  const completedAt = new Date().toISOString();

  // 10. Trata resultado
  if (sendResult.sent && sendResult.status === 'accepted') {
    await (dbClient as any)
      .from('contract_email_dispatches')
      .update({
        dispatch_status: 'accepted',
        provider_message_id: sendResult.providerMessageId || null,
        completed_at: completedAt,
        updated_at: completedAt,
      })
      .eq('id', dispatchId);

    if (business.commercial_status === 'contrato_assinado') {
      await (dbClient as any)
        .from('businesses')
        .update({
          commercial_status: 'aguardando_pagamento',
          updated_at: completedAt,
        })
        .eq('id', businessId);
    }

    if (adminUserId) {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: contract.tenant_id,
        user_id: adminUserId,
        action: 'payment_link_email_sent',
        entity_name: 'contracts',
        entity_id: contract.id,
        old_data: null,
        new_data: {
          dispatch_id: dispatchId,
          recipient_email: recipientEmail,
          provider: provider.name,
          provider_message_id: sendResult.providerMessageId,
          public_url: publicUrl,
        },
      });
    }

    return {
      success: true,
      status: 'accepted',
      provider: provider.name,
      dispatchId,
      providerMessageId: sendResult.providerMessageId,
      publicUrl,
    };
  }

  const finalStatus = sendResult.status === 'unknown' ? 'unknown' : 'failed';
  await (dbClient as any)
    .from('contract_email_dispatches')
    .update({
      dispatch_status: finalStatus,
      error_message: sendResult.error || 'Falha ao entregar e-mail pelo provedor.',
      completed_at: completedAt,
      updated_at: completedAt,
    })
    .eq('id', dispatchId);

  return {
    success: false,
    status: finalStatus,
    provider: provider.name,
    dispatchId,
    publicUrl,
    error: sendResult.error || 'Falha ao entregar e-mail pelo provedor.',
    detail: sendResult.detail,
  };
}

/**
 * Server Action para envio do link de pagamento por e-mail diretamente ao anunciante (Etapa 6).
 */
export async function sendPaymentEmailToAdvertiserAction(
  businessId: string,
  overrideRecipientEmail?: string
): Promise<SendContractEmailResult> {
  try {
    const { user, supabase } = await assertPlatformAdminAccess();

    if (!businessId?.trim()) {
      return {
        success: false,
        status: 'failed',
        provider: 'hostinger',
        error: 'Identificador da empresa é obrigatório.',
      };
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const dbClient =
      serviceRoleKey && supabaseUrl
        ? createClient<Database>(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
          })
        : supabase;

    const result = await dispatchPaymentLinkEmail({
      businessId,
      adminUserId: user.id,
      overrideRecipientEmail,
      dbClient: dbClient as any,
    });

    if (result.success) {
      revalidatePath('/admin/empresas');
      revalidatePath(`/admin/empresas/${businessId}`);
      revalidatePath(`/admin/empresas/${businessId}/contratacao`);
    }

    return {
      success: result.success,
      status: result.status,
      provider: result.provider,
      error: result.error,
      detail: result.detail,
      public_url: result.publicUrl,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erro inesperado ao enviar link de pagamento por e-mail.';
    console.error('[sendPaymentEmailToAdvertiserAction] Exception:', err);
    return {
      success: false,
      status: 'failed',
      provider: 'hostinger',
      error: message,
    };
  }
}

