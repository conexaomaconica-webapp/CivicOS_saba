import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AsaasBillingAdapter } from '@/lib/billing/billing-adapters';
import {
  reconcileCommercialPaymentWebhook,
  validateAsaasWebhookToken,
} from '@/lib/payment/commercial-onboarding-webhook-service';
import {
  classifyAsaasEvent,
  extractAsaasEventId,
} from '@/lib/payment/asaas-event-catalog';
import { logger } from '@/lib/observability/logger';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const accessTokenHeader = req.headers.get('asaas-access-token');
    if (!(await validateAsaasWebhookToken(accessTokenHeader))) {
      logger.warn('Webhook Asaas rejeitado: token de acesso inválido ou ausente no cabeçalho', {
        route: '/api/webhooks/asaas',
        ip: req.headers.get('x-forwarded-for') || 'desconhecido',
      });
      return NextResponse.json({ error: 'UNAUTHORIZED: Header token do Asaas inválido.' }, { status: 401 });
    }

    const requestBody = await req.text();
    if (!requestBody.trim() || requestBody.trim() === 'null') {
      return NextResponse.json({ received: true, validation_request: true });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(requestBody) as Record<string, unknown>;
    } catch {
      logger.warn('Webhook Asaas com payload mal formatado', {
        route: '/api/webhooks/asaas',
        error_code: 'INVALID_JSON',
      });
      return NextResponse.json({ error: 'INVALID_PAYLOAD: JSON inválido.' }, { status: 400 });
    }

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      logger.warn('Webhook Asaas com estrutura de evento inválida', {
        route: '/api/webhooks/asaas',
        error_code: 'INVALID_PAYLOAD_STRUCTURE',
      });
      return NextResponse.json({ error: 'INVALID_PAYLOAD: Evento do Asaas inválido.' }, { status: 400 });
    }

    const rawEventType = typeof payload.event === 'string' ? payload.event : '';
    const eventClassification = classifyAsaasEvent(rawEventType);
    const eventId = extractAsaasEventId(payload, req.headers.get('asaas-event-id'));
    const isTechnicalSmokeTest =
      eventClassification.category === 'technical_test' ||
      Boolean(payload.isTechnicalSmokeTest) ||
      (typeof payload.externalReference === 'string' && payload.externalReference.startsWith('CM_TECHNICAL_SMOKE_'));

    const supabase = getAdminSupabase();

    // 1. Eventos Técnicos e Smoke Tests de Conectividade
    if (isTechnicalSmokeTest) {
      await supabase.from('payment_provider_events').insert({
        provider_code: 'asaas',
        event_id: eventId,
        event_type: rawEventType || 'TECHNICAL_TEST',
        payload: { ...payload, classification: 'technical_test', technical_smoke_test: true },
        processed: true,
        processed_at: new Date().toISOString(),
      });

      return NextResponse.json({
        received: true,
        technical_smoke_test: true,
        message: 'Evento técnico de teste do Asaas auditado com sucesso.',
      });
    }

    // 2. Eventos Administrativos (clientes, contas, transferências, notas)
    // Auditados com sucesso sem tentar conciliar faturas ou alterar saldos
    if (eventClassification.category === 'administrative') {
      await supabase.from('payment_provider_events').insert({
        provider_code: 'asaas',
        event_id: eventId,
        event_type: rawEventType,
        payload: { ...payload, classification: 'administrative' },
        processed: true,
        processed_at: new Date().toISOString(),
      });

      logger.info('Evento administrativo do Asaas auditado', {
        event_type: rawEventType,
        event_id: eventId,
      });

      return NextResponse.json({
        received: true,
        administrative: true,
        event_type: rawEventType,
        message: 'Evento administrativo auditado sem alteração comercial ou financeira.',
      });
    }

    // 3. Eventos Não Reconhecidos / Desconhecidos
    // Registrados para triagem operacional sem mascaramento de falso sucesso nem 500
    if (eventClassification.category === 'unrecognized') {
      const incidentNotice = `[TRIAGEM_OPERACIONAL] Evento Asaas não catalogado: ${rawEventType || 'DESCONHECIDO'}`;
      await supabase.from('payment_provider_events').insert({
        provider_code: 'asaas',
        event_id: eventId,
        event_type: rawEventType || 'UNRECOGNIZED',
        payload: { ...payload, classification: 'unrecognized' },
        processed: false,
        error_log: incidentNotice,
      });

      logger.warn('Evento Asaas não reconhecido registrado para triagem operacional', {
        event_type: rawEventType,
        event_id: eventId,
      });

      return NextResponse.json({
        received: true,
        unrecognized: true,
        event_type: rawEventType,
        message: 'Evento não catalogado registrado para triagem operacional.',
      });
    }

    // 4. Tenta reconciliar como Onboarding Comercial (Microetapa 6.3)
    const onboardingRes = await reconcileCommercialPaymentWebhook(payload, eventId);
    if (onboardingRes.success) {
      if (onboardingRes.reconciled) {
        logger.info('Evento do Asaas reconciliado como Onboarding Comercial', {
          event_type: rawEventType,
          already_processed: onboardingRes.already_processed || false,
        });

        return NextResponse.json({
          received: true,
          commercial_onboarding: true,
          already_processed: onboardingRes.already_processed || false,
          result: onboardingRes.data,
        });
      }

      if (onboardingRes.category === 'financial_creation') {
        // Grava criação da cobrança em payment_provider_events como aguardando pagamento
        await supabase.from('payment_provider_events').insert({
          provider_code: 'asaas',
          event_id: eventId,
          event_type: rawEventType,
          payload: { ...payload, classification: 'financial_creation' },
          processed: true,
          processed_at: new Date().toISOString(),
        });

        return NextResponse.json({
          received: true,
          commercial_onboarding: true,
          financial_creation: true,
          status: 'aguardando_pagamento',
          message: 'Cobrança Asaas registrada. Aguardando pagamento pelo cliente.',
        });
      }

      if (onboardingRes.category === 'financial_reversal') {
        await supabase.from('payment_provider_events').insert({
          provider_code: 'asaas',
          event_id: eventId,
          event_type: rawEventType,
          payload: { ...payload, classification: 'financial_reversal' },
          processed: true,
          processed_at: new Date().toISOString(),
        });

        return NextResponse.json({
          received: true,
          commercial_onboarding: true,
          financial_reversal: true,
          result: onboardingRes.data,
        });
      }
    }

    // Se o evento é explicitamente de onboarding comercial (externalReference onb_...) mas não pôde ser conciliado,
    // registra para triagem sem repassar ao RPC de assinaturas recorrentes
    const paymentObj = (payload.payment as Record<string, unknown>) || {};
    const externalRef = String(paymentObj.externalReference || payload.externalReference || '').trim();
    const isOnboardingReference = externalRef.startsWith('onb_') || externalRef.startsWith('onboarding_');

    if (isOnboardingReference) {
      logger.warn('Evento de onboarding comercial Asaas não conciliado', {
        event_type: rawEventType,
        event_id: eventId,
        error: onboardingRes.error,
      });

      try {
        await supabase.from('payment_provider_events').insert({
          provider_code: 'asaas',
          event_id: eventId,
          event_type: rawEventType,
          payload: { ...payload, classification: 'onboarding_unreconciled' },
          processed: false,
          error_log: onboardingRes.error || 'Cobrança comercial não localizada',
        });
      } catch {
        /* auditoria best-effort */
      }

      return NextResponse.json({
        received: true,
        commercial_onboarding: true,
        reconciled: false,
        error: onboardingRes.error || 'Cobrança comercial não localizada',
      });
    }

    // 5. Se não for onboarding comercial, processa ciclo regular de assinaturas
    const canonicalEvent = AsaasBillingAdapter.parseEvent(req.headers, payload);

    const { data: rpcRes, error } = await (
      supabase as unknown as {
        rpc: (
          fn: string,
          params: Record<string, unknown>
        ) => Promise<{ data: unknown; error: { message: string } | null }>;
      }
    ).rpc('process_canonical_billing_event', {
      // Tenant não é informado pelo gateway: o RPC deriva o tenant canônico da empresa no banco.
      p_tenant_id: null,
      p_provider: canonicalEvent.provider,
      p_provider_event_id: canonicalEvent.providerEventId,
      p_canonical_event: canonicalEvent.canonicalEvent,
      p_business_id: canonicalEvent.businessId,
      p_user_id: canonicalEvent.userId,
      p_plan_code: canonicalEvent.planCode,
      p_amount_cents: canonicalEvent.amountCents,
      p_payload: canonicalEvent.rawPayload,
    });

    if (error) {
      // Registra falha crítica sem vazar dados confidenciais e atualiza o log de erro no evento
      const incidentId = logger.critical('Falha na execução do RPC process_canonical_billing_event', {
        route: '/api/webhooks/asaas',
        provider: canonicalEvent.provider,
        provider_event_id: canonicalEvent.providerEventId,
        event_type: canonicalEvent.canonicalEvent,
        error_message: error.message,
      });

      try {
        await supabase
          .from('payment_provider_events')
          .update({ error_log: `[${incidentId}] ${error.message}` })
          .match({ provider_code: canonicalEvent.provider, event_id: canonicalEvent.providerEventId });
      } catch {
        // Ignora falha secundária de atualização de auditoria
      }

      return NextResponse.json({ error: error.message, incident_id: incidentId }, { status: 400 });
    }

    logger.info('Evento financeiro do Asaas processado com sucesso', {
      provider_event_id: canonicalEvent.providerEventId,
      event_type: canonicalEvent.canonicalEvent,
      business_id: canonicalEvent.businessId,
    });

    return NextResponse.json({ received: true, result: rpcRes });
  } catch (err: unknown) {
    const errorInstance = err instanceof Error ? err : new Error(String(err));
    const incidentId = logger.critical('Exceção inesperada no processamento do webhook Asaas', errorInstance, {
      route: '/api/webhooks/asaas',
    });

    return NextResponse.json(
      { error: 'Internal Server Error', incident_id: incidentId },
      { status: 500 }
    );
  }
}
