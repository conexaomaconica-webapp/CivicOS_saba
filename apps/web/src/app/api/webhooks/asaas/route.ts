import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AsaasBillingAdapter } from '@/lib/billing/billing-adapters';
import {
  reconcileCommercialPaymentWebhook,
  validateAsaasWebhookToken,
} from '@/lib/payment/commercial-onboarding-webhook-service';
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

    let payload: Record<string, any>;
    try {
      payload = JSON.parse(requestBody);
    } catch (_parseError) {
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

    // 1. Tenta reconciliar como Onboarding Comercial (Microetapa 6.3)
    // Localiza internamente pelo Asaas payment ID sem confiar em metadados externos
    const onboardingRes = await reconcileCommercialPaymentWebhook(payload, req.headers.get('asaas-event-id'));
    if (onboardingRes.success && onboardingRes.reconciled) {
      logger.info('Evento do Asaas reconciliado como Onboarding Comercial', {
        event_type: payload.event,
        already_processed: onboardingRes.already_processed || false,
      });

      return NextResponse.json({
        received: true,
        commercial_onboarding: true,
        already_processed: onboardingRes.already_processed || false,
        result: onboardingRes.data,
      });
    }

    // 2. Se não for onboarding comercial, processa ciclo regular de assinaturas
    const canonicalEvent = AsaasBillingAdapter.parseEvent(req.headers, payload);

    // Isola cobranças técnicas de smoke test (ex: CM_TECHNICAL_SMOKE_*)
    const isTechnicalSmokeTest =
      canonicalEvent.businessId.startsWith('CM_TECHNICAL_SMOKE_') ||
      Boolean(payload.isTechnicalSmokeTest);

    const supabase = getAdminSupabase();

    if (isTechnicalSmokeTest) {
      // Registra no log de auditoria sem alterar assinaturas comerciais ou status no Guia
      const { error: logErr } = await supabase.from('payment_provider_events').insert({
        provider_code: canonicalEvent.provider,
        event_id: canonicalEvent.providerEventId,
        event_type: canonicalEvent.canonicalEvent,
        payload: { ...canonicalEvent.rawPayload, technical_smoke_test: true },
        processed: true,
        processed_at: new Date().toISOString(),
      });

      if (logErr && !logErr.message.includes('duplicate key') && !logErr.message.includes('fetch failed')) {
        return NextResponse.json({ error: logErr.message }, { status: 400 });
      }

      return NextResponse.json({
        received: true,
        technical_smoke_test: true,
        message: 'Evento financeiro de smoke test de R$ 5,00 auditado sem alteração comercial.',
      });
    }

    const { data: rpcRes, error } = await supabase.rpc('process_canonical_billing_event', {
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
  } catch (err: any) {
    const incidentId = logger.critical('Exceção inesperada no processamento do webhook Asaas', err, {
      route: '/api/webhooks/asaas',
    });

    return NextResponse.json(
      { error: 'Internal Server Error', incident_id: incidentId },
      { status: 500 }
    );
  }
}
