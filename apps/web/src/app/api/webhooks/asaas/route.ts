import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AsaasBillingAdapter } from '@/lib/billing/billing-adapters';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const accessTokenHeader = req.headers.get('asaas-access-token');
    if (!AsaasBillingAdapter.validateSignature(accessTokenHeader)) {
      return NextResponse.json({ error: 'UNAUTHORIZED: Header token do Asaas inválido.' }, { status: 401 });
    }

    const payload = await req.json();
    const canonicalEvent = AsaasBillingAdapter.parseEvent(req.headers, payload);

    // Isola cobranças técnicas de smoke test (ex: CM_TECHNICAL_SMOKE_*)
    const isTechnicalSmokeTest =
      canonicalEvent.businessId.startsWith('CM_TECHNICAL_SMOKE_') ||
      Boolean(payload.isTechnicalSmokeTest);

    const supabase = getAdminSupabase();

    if (isTechnicalSmokeTest) {
      // Registra no log de auditoria sem alterar assinaturas comerciais ou status no Guia
      const { error: logErr } = await supabase.from('payment_provider_events').insert({
        tenant_id: '00000000-0000-0000-0000-000000000001',
        provider: canonicalEvent.provider,
        provider_event_id: canonicalEvent.providerEventId,
        canonical_event: canonicalEvent.canonicalEvent,
        business_id: '00000000-0000-0000-0000-000000000001',
        plan_code: 'technical_smoke_test',
        amount_cents: canonicalEvent.amountCents,
        raw_payload: { ...canonicalEvent.rawPayload, technical_smoke_test: true },
        processing_status: 'processed',
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
      p_tenant_id: '00000000-0000-0000-0000-000000000001',
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
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ received: true, result: rpcRes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
