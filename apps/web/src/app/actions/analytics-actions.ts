'use server';

import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { createServerSideClient, resolveTenantIdServer } from '@/lib/supabase/server';
import { recordAnalyticsEventSchema, RecordAnalyticsEventInput } from '@saas/core';
import { checkRateLimit } from '@/lib/security/rate-limiter';

const ANALYTICS_COOKIE_NAME = 'ca_analytics_sid';
const ANALYTICS_SALT = process.env.ANALYTICS_SALT || 'civicos_analytics_salt_v1_secure';

async function getOrCreateVisitorSessionId(): Promise<string> {
  const cookieStore = await cookies();
  let sid = cookieStore.get(ANALYTICS_COOKIE_NAME)?.value;

  if (!sid) {
    sid = crypto.randomUUID();
    cookieStore.set(ANALYTICS_COOKIE_NAME, sid, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year retention
      path: '/',
    });
  }

  return sid;
}

export interface AnalyticsActionResult {
  success: boolean;
  deduplicated?: boolean;
  error?: string;
}

export async function recordBusinessAnalyticsEventAction(
  input: RecordAnalyticsEventInput
): Promise<AnalyticsActionResult> {
  try {
    const parsed = recordAnalyticsEventSchema.parse(input);
    const tenantId = await resolveTenantIdServer();
    const sessionId = await getOrCreateVisitorSessionId();

    // Calculate HMAC-SHA256 of visitor session ID using server-side salt
    const visitorHmac = crypto
      .createHmac('sha256', ANALYTICS_SALT)
      .update(`${tenantId}:${sessionId}`)
      .digest('hex');

    // Rate-limiting (Fail-open policy for analytics)
    const rateCheck = await checkRateLimit('analytics', visitorHmac, tenantId);
    if (!rateCheck.allowed) {
      return { success: false, deduplicated: true, error: 'Rate limit excedido para registro de analytics.' };
    }

    const supabase = await createServerSideClient();
    const { data: recorded, error } = await supabase.rpc('record_business_analytics_event', {
      p_tenant_id: tenantId,
      p_business_id: parsed.businessId,
      p_event_type: parsed.eventType,
      p_visitor_hmac: visitorHmac,
      p_referrer: parsed.referrer || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, deduplicated: recorded === false };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro interno ao registrar evento de analytics.',
    };
  }
}

export async function getBusinessAnalyticsSummaryAction(
  businessId: string,
  days: number = 30
): Promise<{ success: boolean; data?: Record<string, number>; error?: string }> {
  try {
    const supabase = await createServerSideClient();
    const tenantId = await resolveTenantIdServer();

    const { data, error } = await supabase.rpc('get_business_analytics_summary', {
      p_tenant_id: tenantId,
      p_business_id: businessId,
      p_days: days,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const summaryMap: Record<string, number> = {};
    if (Array.isArray(data)) {
      data.forEach((row: any) => {
        summaryMap[row.event_type] = Number(row.total_count || 0);
      });
    }

    return { success: true, data: summaryMap };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao buscar resumo de analytics.',
    };
  }
}
