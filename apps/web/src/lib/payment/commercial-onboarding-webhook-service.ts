'use server';

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import { getAsaasConfig } from './asaas-config';
import { MIN_PUBLIC_LINK_TOKEN_LENGTH } from '@/lib/security/public-link-token';
import {
  COMMERCIAL_STATUS,
  assertCommercialStatusTransition,
} from '@/lib/commercial-onboarding-status';

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceRoleKey || !supabaseUrl) {
    throw new Error('Supabase admin não configurado.');
  }
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Valida o header asaas-access-token enviado pelo webhook do Asaas.
 * Suporta ASAAS_WEBHOOK_AUTH_TOKEN e ASAAS_WEBHOOK_SECRET.
 */
export async function validateAsaasWebhookToken(headerToken: string | null): Promise<boolean> {
  if (!headerToken || typeof headerToken !== 'string') {
    return false;
  }

  const cleanHeader = headerToken.trim();

  try {
    // 1. Tenta validar via banco dinâmico (payment_provider_settings)
    try {
      const { getAsaasDynamicConfig } = await import('./asaas-config-service');
      const dynamicConfig = await getAsaasDynamicConfig();
      const dynamicExpected = dynamicConfig.webhookAuthToken || dynamicConfig.webhookSecret;
      if (dynamicExpected && cleanHeader === dynamicExpected.trim()) {
        return true;
      }
    } catch (_dynErr) {
      // Ignora e continua para o fallback de ambiente
    }

    // 2. Fallback para variáveis de ambiente (process.env)
    const config = getAsaasConfig();
    const expected = config.webhookAuthToken || config.webhookSecret;
    if (expected && expected.length >= 8 && cleanHeader === expected.trim()) {
      return true;
    }

    return false;
  } catch (_err) {
    return false;
  }
}

export interface ReconcileWebhookResult {
  success: boolean;
  reconciled: boolean;
  already_processed?: boolean;
  error?: string;
  data?: {
    business_id?: string;
    invoice_id?: string;
    previous_status?: string;
    new_status?: string;
    event_type?: string;
  };
}

/**
 * Reconcilia eventos de webhook do Asaas para onboarding comercial.
 * Localiza o registro internamente via payment ID e efetua transição
 * atômica para 'pagamento_confirmado'.
 */
export async function reconcileCommercialPaymentWebhook(
  payload: Record<string, unknown>,
  eventIdHeader?: string | null
): Promise<ReconcileWebhookResult> {
  try {
    const dbClient = getAdminClient();

    const rawEvent = (payload.event as string) || '';
    const payment = (payload.payment as Record<string, unknown>) || payload;
    const asaasPaymentId = (payment.id as string) || '';
    const eventId = (payload.id as string) || eventIdHeader || `${rawEvent}_${asaasPaymentId}`;
    const amountCents = Math.round(((payment.value as number) || 0) * 100);

    if (!asaasPaymentId) {
      return {
        success: false,
        reconciled: false,
        error: 'Payload do webhook não contém identificador Asaas válido (payment.id).',
      };
    }

    // 1. Tenta executar via RPC Atômica (Migration 133)
    try {
      const { data: rpcRes, error: rpcErr } = await (dbClient as any).rpc(
        'reconcile_commercial_payment_webhook',
        {
          p_provider_event_id: eventId,
          p_event_type: rawEvent,
          p_asaas_payment_id: asaasPaymentId,
          p_amount_cents: amountCents,
          p_raw_payload: payload,
        }
      );

      if (!rpcErr && rpcRes) {
        if (rpcRes.already_processed) {
          return {
            success: true,
            reconciled: true,
            already_processed: true,
            data: rpcRes,
          };
        }

        if (rpcRes.success) {
          return {
            success: true,
            reconciled: true,
            data: rpcRes,
          };
        }

        // Se RPC retornou erro de cobrança não localizada, repassa para fallback
        if (!rpcRes.error?.includes('não localizada')) {
          return {
            success: false,
            reconciled: false,
            error: rpcRes.error || 'Erro na execução da RPC de reconciliação.',
          };
        }
      }
    } catch (_rpcExecErr) {
      // Fallback em código caso a RPC ainda não esteja implantada no ambiente de testes
    }

    // 2. Fallback defensivo em TypeScript/Supabase client
    // Localiza payment_attempts pelo Asaas payment ID
    const { data: attempt } = await (dbClient as any)
      .from('payment_attempts')
      .select('id, invoice_id, business_id, tenant_id, payload_received')
      .eq('provider_code', 'asaas')
      .or(`provider_charge_id.eq.${asaasPaymentId},payload_received->>payment_id.eq.${asaasPaymentId}`)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let businessId = attempt?.business_id;
    let invoiceId = attempt?.invoice_id;
    let tenantId = attempt?.tenant_id;

    if (!businessId) {
      // Fallback por fatura
      const { data: inv } = await (dbClient as any)
        .from('invoices')
        .select('id, business_id, tenant_id')
        .ilike('idempotency_key', `%${asaasPaymentId}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      businessId = inv?.business_id;
      invoiceId = inv?.id;
      tenantId = inv?.tenant_id;
    }

    if (!businessId) {
      return {
        success: false,
        reconciled: false,
        error: `Cobrança comercial não localizada internamente para o Asaas ID: ${asaasPaymentId}`,
      };
    }

    // Busca empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('id, commercial_status, tenant_id')
      .eq('id', businessId)
      .single();

    if (bizErr || !biz) {
      return {
        success: false,
        reconciled: false,
        error: 'Empresa vinculada à cobrança não encontrada.',
      };
    }

    const currentStatus = biz.commercial_status;

    // Se o evento é de confirmação de pagamento
    if (rawEvent === 'PAYMENT_CONFIRMED' || rawEvent === 'PAYMENT_RECEIVED') {
      if (['pagamento_confirmado', 'prontuario_em_configuracao', 'pronto_para_publicar', 'publicado'].includes(currentStatus)) {
        return {
          success: true,
          reconciled: true,
          already_processed: true,
          data: {
            business_id: businessId,
            previous_status: currentStatus,
            new_status: currentStatus,
            event_type: rawEvent,
          },
        };
      }

      // Validação de transição
      assertCommercialStatusTransition(
        COMMERCIAL_STATUS.AGUARDANDO_PAGAMENTO,
        COMMERCIAL_STATUS.PAGAMENTO_CONFIRMADO
      );

      // Atualiza empresa para 'pagamento_confirmado'
      await (dbClient as any)
        .from('businesses')
        .update({
          commercial_status: 'pagamento_confirmado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId).throwOnError();

      // Atualiza fatura
      if (invoiceId) {
        await (dbClient as any)
          .from('invoices')
          .update({
            status: 'paid',
            amount_paid: amountCents / 100,
            paid_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', invoiceId).throwOnError();
      }

      // Atualiza tentativa
      if (attempt?.id) {
        await (dbClient as any)
          .from('payment_attempts')
          .update({
            status: 'success',
            response_received: {
              ...(attempt.payload_received || {}),
              webhook_reconciled: {
                event_type: rawEvent,
                event_id: eventId,
                reconciled_at: new Date().toISOString(),
              },
            },
          })
          .eq('id', attempt.id).throwOnError();
      }

      // Log de auditoria
      try {
        await (dbClient as any).from('admin_audit_logs').insert({
          tenant_id: tenantId || biz.tenant_id,
          actor_id: '00000000-0000-0000-0000-000000000001',
          action: 'RECONCILE_COMMERCIAL_PAYMENT_WEBHOOK',
          entity_type: 'businesses',
          entity_id: businessId,
          before_value: { commercial_status: currentStatus },
          after_value: {
            commercial_status: 'pagamento_confirmado',
            event_type: rawEvent,
            asaas_payment_id: asaasPaymentId,
          },
          reason: `Pagamento confirmado via Webhook Asaas (${rawEvent}).`,
        });
      } catch (_logErr) {}

      return {
        success: true,
        reconciled: true,
        data: {
          business_id: businessId,
          invoice_id: invoiceId,
          previous_status: currentStatus,
          new_status: 'pagamento_confirmado',
          event_type: rawEvent,
        },
      };
    }

    // Outros eventos são registrados sem alterar status para publicado
    try {
      await (dbClient as any).from('admin_audit_logs').insert({
        tenant_id: tenantId || biz.tenant_id,
        actor_id: '00000000-0000-0000-0000-000000000001',
        action: 'ASAAS_WEBHOOK_EVENT_AUDITED',
        entity_type: 'businesses',
        entity_id: businessId,
        before_value: { commercial_status: currentStatus },
        after_value: { event_type: rawEvent, asaas_payment_id: asaasPaymentId },
        reason: 'Evento Asaas auditado sem alteração comercial.',
      });
    } catch (_logErr) {}

    return {
      success: true,
      reconciled: false,
      data: {
        business_id: businessId,
        previous_status: currentStatus,
        new_status: currentStatus,
        event_type: rawEvent,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      reconciled: false,
      error: err?.message || 'Erro inesperado na reconciliação do webhook comercial.',
    };
  }
}

/**
 * Server Action para consulta em tempo real (polling seguro) do status
 * comercial pelo anunciante na tela pública /contratacao/[token].
 */
export async function checkCommercialPaymentStatusAction(token: string): Promise<{
  success: boolean;
  commercial_status?: string;
  is_confirmed?: boolean;
  error?: string;
}> {
  try {
    const cleanToken = token?.trim();
    if (!cleanToken || cleanToken.length < MIN_PUBLIC_LINK_TOKEN_LENGTH) {
      return { success: false, error: 'Token inválido.' };
    }

    const tokenHash = crypto.createHash('sha256').update(cleanToken, 'utf8').digest('hex');
    const dbClient = getAdminClient();

    // Busca token
    let tokenRow: any = null;
    const { data: hashedRow } = await (dbClient as any)
      .from('business_onboarding_tokens')
      .select('id, business_id, is_revoked, expires_at')
      .eq('token_hash', tokenHash)
      .maybeSingle();

    if (hashedRow) {
      tokenRow = hashedRow;
    } else {
      const { data: legacyRow } = await (dbClient as any)
        .from('business_onboarding_tokens')
        .select('id, business_id, is_revoked, expires_at')
        .eq('token', cleanToken)
        .maybeSingle();
      tokenRow = legacyRow;
    }

    if (!tokenRow) {
      return { success: false, error: 'Sessão não localizada.' };
    }

    // Busca empresa
    const { data: biz, error: bizErr } = await (dbClient as any)
      .from('businesses')
      .select('commercial_status')
      .eq('id', tokenRow.business_id)
      .single();

    if (bizErr || !biz) {
      return { success: false, error: 'Empresa não encontrada.' };
    }

    const confirmedCommercialStatuses = [
      'pagamento_confirmado',
      'prontuario_em_configuracao',
      'pronto_para_publicar',
      'publicado',
    ];
    let effectiveCommercialStatus = biz.commercial_status;
    let isConfirmed = confirmedCommercialStatuses.includes(effectiveCommercialStatus);

    // Reconciliação de segurança para pagamentos aprovados antes do webhook.
    // Recupera inclusive transações sandbox já concluídas que ficaram presas em
    // aguardando_pagamento por dependerem exclusivamente do evento assíncrono.
    if (!isConfirmed) {
      const [{ data: paidInvoice }, { data: successfulAttempt }] = await Promise.all([
        (dbClient as any)
          .from('invoices')
          .select('id')
          .eq('business_id', tokenRow.business_id)
          .eq('status', 'paid')
          .limit(1)
          .maybeSingle(),
        (dbClient as any)
          .from('payment_attempts')
          .select('id, status, payload_received')
          .eq('business_id', tokenRow.business_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const gatewayStatus = String(successfulAttempt?.payload_received?.status || '').toUpperCase();
      const hasConfirmedEvidence = Boolean(
        paidInvoice
        || successfulAttempt?.status === 'success'
        || ['CONFIRMED', 'RECEIVED'].includes(gatewayStatus)
      );

      if (hasConfirmedEvidence && ['contrato_assinado', 'aguardando_pagamento'].includes(effectiveCommercialStatus)) {
        const confirmedAt = new Date().toISOString();
        const { error: reconciliationError } = await (dbClient as any)
          .from('businesses')
          .update({ commercial_status: 'pagamento_confirmado', updated_at: confirmedAt })
          .eq('id', tokenRow.business_id);

        if (!reconciliationError) {
          effectiveCommercialStatus = 'pagamento_confirmado';
          isConfirmed = true;
          if (successfulAttempt?.id) {
            await (dbClient as any)
              .from('payment_attempts')
              .update({ status: 'success' })
              .eq('id', successfulAttempt.id).throwOnError();
          }
        }
      }
    }

    return {
      success: true,
      commercial_status: effectiveCommercialStatus,
      is_confirmed: isConfirmed,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Falha ao consultar status.' };
  }
}
