/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */
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
import { logger } from '@/lib/observability/logger';

import {
  classifyAsaasEvent,
  extractAsaasPaymentId,
  extractAsaasEventId,
  type AsaasEventCategory,
} from './asaas-event-catalog';

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
    } catch {
      // Ignora e continua para o fallback de ambiente
    }

    // 2. Fallback para variáveis de ambiente (process.env)
    const config = getAsaasConfig();
    const expected = config.webhookAuthToken || config.webhookSecret;
    if (expected && expected.length >= 8 && cleanHeader === expected.trim()) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export interface ReconcileWebhookResult {
  success: boolean;
  reconciled: boolean;
  already_processed?: boolean;
  category?: AsaasEventCategory;
  message?: string;
  error?: string;
  data?: {
    business_id?: string;
    invoice_id?: string;
    previous_status?: string;
    new_status?: string;
    event_type?: string;
    already_liquidated?: boolean;
  };
}

/**
 * Reconcilia eventos de webhook do Asaas para onboarding comercial.
 * Localiza o registro internamente via payment ID e efetua transição
 * atômica para 'pagamento_confirmado' apenas para eventos de liquidação real.
 */
export async function reconcileCommercialPaymentWebhook(
  payload: Record<string, unknown>,
  eventIdHeader?: string | null,
  customSupabase?: any
): Promise<ReconcileWebhookResult> {
  try {
    const rawEvent = (payload.event as string) || '';
    const classification = classifyAsaasEvent(rawEvent);
    const eventId = extractAsaasEventId(payload, eventIdHeader);
    const asaasPaymentId = extractAsaasPaymentId(payload);

    // 1. Eventos Administrativos não devem executar conciliação financeira
    if (classification.category === 'administrative') {
      return {
        success: true,
        reconciled: false,
        category: 'administrative',
        message: 'Evento administrativo auditado sem necessidade de conciliação financeira.',
        data: { event_type: rawEvent },
      };
    }

    // 2. Eventos Técnicos e Smoke Tests
    if (classification.category === 'technical_test' || Boolean(payload.isTechnicalSmokeTest)) {
      return {
        success: true,
        reconciled: false,
        category: 'technical_test',
        message: 'Teste técnico Asaas auditado sem conciliação financeira.',
        data: { event_type: rawEvent },
      };
    }

    // 3. Eventos Não Reconhecidos (sinalizados para triagem sem falso sucesso)
    if (classification.category === 'unrecognized') {
      return {
        success: false,
        reconciled: false,
        category: 'unrecognized',
        message: `Evento Asaas não reconhecido registrado para triagem: ${rawEvent}.`,
        error: `Evento Asaas não catalogado para conciliação automática: ${rawEvent}. Requer triagem.`,
      };
    }

    // 4. Se for financeiro mas não possuir payment.id válido, audita sem conciliar
    if (!asaasPaymentId) {
      return {
        success: true,
        reconciled: false,
        category: classification.category,
        message: 'Payload sem identificador de cobrança Asaas válido (payment.id). Registrado sem alteração financeira.',
        error: 'Payload sem identificador de cobrança Asaas válido (payment.id). Registrado sem alteração financeira.',
      };
    }

    const dbClient = customSupabase || getAdminClient();
    const payment = (payload.payment as Record<string, unknown>) || {};
    const amountCents = Math.round(((payment.value as number) || 0) * 100);

    // 5. Tratamento de Criação de Cobrança (PAYMENT_CREATED, PAYMENT_UPDATED)
    // NUNCA confirma pagamento! Registra o status de aguardando_pagamento
    if (classification.category === 'financial_creation') {
      const { data: attempt } = await dbClient
        .from('payment_attempts')
        .select('id, invoice_id, business_id, tenant_id, payload_received')
        .eq('provider_code', 'asaas')
        .or(`provider_charge_id.eq.${asaasPaymentId},payload_received->>payment_id.eq.${asaasPaymentId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const businessId = attempt?.business_id;
      if (businessId) {
        const { data: biz } = await dbClient
          .from('businesses')
          .select('id, commercial_status, tenant_id')
          .eq('id', businessId)
          .single();

        if (biz) {
          if (attempt?.id) {
            const { error: updateErr } = await dbClient
              .from('payment_attempts')
              .update({
                provider_charge_id: asaasPaymentId,
                response_received: {
                  ...(attempt.payload_received || {}),
                  last_event: rawEvent,
                  event_id: eventId,
                  updated_at: new Date().toISOString(),
                },
              })
              .eq('id', attempt.id);

            if (updateErr) {
              console.warn('[ASAAS_WEBHOOK] Erro ao atualizar tentativa com payment_id:', updateErr);
            }
          }

          try {
            await dbClient.from('admin_audit_logs').insert({
              tenant_id: biz.tenant_id,
              actor_id: '00000000-0000-0000-0000-000000000001',
              action: 'ASAAS_PAYMENT_CREATED_AUDITED',
              entity_type: 'businesses',
              entity_id: businessId,
              before_value: { commercial_status: biz.commercial_status },
              after_value: {
                commercial_status: biz.commercial_status,
                event_type: rawEvent,
                asaas_payment_id: asaasPaymentId,
              },
              reason: `Cobrança Asaas gerada/atualizada (${rawEvent}). Aguardando pagamento pelo anunciante.`,
            });
          } catch {
            /* auditoria best-effort */
          }

          return {
            success: true,
            reconciled: false,
            category: 'financial_creation',
            message: 'Cobrança Asaas gerada/atualizada registrada (aguardando liquidação).',
            data: {
              business_id: businessId,
              previous_status: biz.commercial_status,
              new_status: biz.commercial_status,
              event_type: rawEvent,
            },
          };
        }
      }

      return {
        success: true,
        reconciled: false,
        category: 'financial_creation',
        message: 'Cobrança Asaas gerada/atualizada registrada (aguardando liquidação).',
        data: { event_type: rawEvent },
      };
    }

    // 6. Tratamento de Exclusão de Cobrança (PAYMENT_DELETED)
    // PROTEÇÃO: Impede reversão indevida de pagamentos já liquidados!
    if (rawEvent === 'PAYMENT_DELETED') {
      const { data: attempt } = await dbClient
        .from('payment_attempts')
        .select('id, invoice_id, business_id, tenant_id')
        .eq('provider_code', 'asaas')
        .or(`provider_charge_id.eq.${asaasPaymentId},payload_received->>payment_id.eq.${asaasPaymentId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const businessId = attempt?.business_id;
      if (businessId) {
        const { data: biz } = await dbClient
          .from('businesses')
          .select('id, commercial_status, tenant_id')
          .eq('id', businessId)
          .maybeSingle();

        if (biz) {
          const isLiquidated = ['pagamento_confirmado', 'prontuario_em_configuracao', 'pronto_para_publicar', 'publicado'].includes(biz.commercial_status);

          if (isLiquidated) {
            try {
              await dbClient.from('admin_audit_logs').insert({
                tenant_id: biz.tenant_id,
                actor_id: '00000000-0000-0000-0000-000000000001',
                action: 'ASAAS_PAYMENT_DELETED_IGNORED',
                entity_type: 'businesses',
                entity_id: businessId,
                before_value: { commercial_status: biz.commercial_status },
                after_value: { commercial_status: biz.commercial_status, event_type: rawEvent, asaas_payment_id: asaasPaymentId },
                reason: 'Tentativa de exclusão de cobrança no Asaas ignorada: a empresa já possui pagamento confirmado/liquidado.',
              });
            } catch {
              /* auditoria best-effort */
            }

            return {
              success: true,
              reconciled: false,
              already_processed: true,
              category: 'financial_reversal',
              message: 'Tentativa de exclusão ignorada: status liquidado/confirmado preservado.',
              data: {
                business_id: businessId,
                previous_status: biz.commercial_status,
                new_status: biz.commercial_status,
                event_type: rawEvent,
                already_liquidated: true,
              },
            };
          }

          if (attempt?.id) {
            const { error: cancelErr } = await dbClient
              .from('payment_attempts')
              .update({
                status: 'failed',
                error_message: 'Cobrança cancelada ou removida no Asaas antes do pagamento.',
              })
              .eq('id', attempt.id);

            if (cancelErr) {
              console.warn('[ASAAS_WEBHOOK] Erro ao marcar tentativa cancelada:', cancelErr);
            }
          }

          return {
            success: true,
            reconciled: false,
            category: 'financial_reversal',
            data: {
              business_id: businessId,
              previous_status: biz.commercial_status,
              new_status: biz.commercial_status,
              event_type: rawEvent,
            },
          };
        }
      }

      return {
        success: true,
        reconciled: false,
        category: 'financial_reversal',
        data: { event_type: rawEvent },
      };
    }

    // 7. Confirmação / Liquidação Financeira (PAYMENT_RECEIVED, PAYMENT_CONFIRMED)
    // Tenta executar via RPC Atômica (Migration 133)
    try {
      const { data: rpcRes, error: rpcErr } = await dbClient.rpc(
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
            category: 'financial_confirmation',
            data: rpcRes,
          };
        }

        if (rpcRes.success) {
          return {
            success: true,
            reconciled: true,
            category: 'financial_confirmation',
            data: rpcRes,
          };
        }

        // Se RPC retornou erro de cobrança não localizada, repassa para fallback
        if (!rpcRes.error?.includes('não localizada')) {
          return {
            success: false,
            reconciled: false,
            category: 'financial_confirmation',
            error: rpcRes.error || 'Erro na execução da RPC de reconciliação.',
          };
        }
      }
    } catch {
      // Fallback em código caso a RPC ainda não esteja implantada no ambiente de testes
    }

    // 2. Fallback defensivo em TypeScript/Supabase client
    // Localiza payment_attempts pelo Asaas payment ID
    const { data: attempt } = await dbClient
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
      const { data: inv } = await dbClient
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
    const { data: biz, error: bizErr } = await dbClient
      .from('businesses')
      .select('id, commercial_status, tenant_id')
      .eq('id', businessId)
      .maybeSingle();

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
      await dbClient
        .from('businesses')
        .update({
          commercial_status: 'pagamento_confirmado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId).throwOnError();

      // Atualiza fatura
      if (invoiceId) {
        await dbClient
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
        await dbClient
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
        await dbClient.from('admin_audit_logs').insert({
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
      } catch (logErr) {
        logger.warn('Falha ao registrar auditoria de conciliação Asaas', {
          businessId,
          eventType: rawEvent,
          error: logErr instanceof Error ? logErr.message : String(logErr),
        });
      }

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
      await dbClient.from('admin_audit_logs').insert({
        tenant_id: tenantId || biz.tenant_id,
        actor_id: '00000000-0000-0000-0000-000000000001',
        action: 'ASAAS_WEBHOOK_EVENT_AUDITED',
        entity_type: 'businesses',
        entity_id: businessId,
        before_value: { commercial_status: currentStatus },
        after_value: { event_type: rawEvent, asaas_payment_id: asaasPaymentId },
        reason: 'Evento Asaas auditado sem alteração comercial.',
      });
    } catch (logErr) {
      logger.warn('Falha ao registrar auditoria de evento Asaas', {
        businessId,
        eventType: rawEvent,
        error: logErr instanceof Error ? logErr.message : String(logErr),
      });
    }

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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Falha ao consultar status.';
    return { success: false, error: msg };
  }
}
