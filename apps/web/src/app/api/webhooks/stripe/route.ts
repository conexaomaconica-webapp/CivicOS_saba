import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { StripeBillingAdapter } from '@/lib/billing/billing-adapters';

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_key';
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const signatureHeader = req.headers.get('stripe-signature');
    if (!StripeBillingAdapter.validateSignature(signatureHeader)) {
      return NextResponse.json({ error: 'UNAUTHORIZED: Assinatura do Stripe inválida.' }, { status: 401 });
    }

    const payload = await req.json();
    const canonicalEvent = StripeBillingAdapter.parseEvent(req.headers, payload);

    const supabase = getAdminSupabase();
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
