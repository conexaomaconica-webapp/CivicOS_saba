import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const headersList = req.headers;
    const gatewayName = headersList.get('x-gateway') || 'asaas';

    // Trata payload de gateway (Asaas ou Stripe)
    const eventId = body.id || body.eventId || `evt_${Date.now()}`;
    const eventType = body.event || body.type || 'PAYMENT_RECEIVED';
    const businessId = body.payment?.externalReference || body.metadata?.businessId || '00000000-0000-0000-0000-000000000001';
    const userId = body.customer?.externalReference || body.metadata?.userId || null;
    const planCode = body.payment?.planCode || body.metadata?.planCode || 'ouro';
    const amountCents = Math.round((body.payment?.value || body.amount_total || 199.0) * 100);

    const supabase = getAdminSupabase();

    // Invoca RPC idempotente process_billing_webhook
    const { data: rpcRes, error } = await supabase.rpc('process_billing_webhook', {
      p_tenant_id: '00000000-0000-0000-0000-000000000001',
      p_gateway_event_id: eventId,
      p_gateway_name: gatewayName,
      p_event_type: eventType,
      p_business_id: businessId,
      p_user_id: userId,
      p_plan_code: planCode,
      p_amount_cents: amountCents,
      p_payload: body,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ received: true, result: rpcRes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
