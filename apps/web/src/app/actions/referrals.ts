'use server';

import { headers } from 'next/headers';
import { createServerSideClient } from '@/lib/supabase/server';

export type ReferralFunnel = {
  total: number;
  last_30_days: number;
  contacts: number;
  benefits: number;
  connections: number;
  top_referrers: Array<{ name: string; indications: number; contacts: number; connections: number }>;
};

export type MyReferralSummary = {
  code: string | null;
  total: number;
  connections: number;
  by_business: Array<{
    business_name: string;
    business_slug: string | null;
    indications: number;
    contacts: number;
    benefits: number;
    connections: number;
  }>;
};

function friendlyError(error: unknown, fallback: string): string {
  const raw = typeof (error as any)?.message === 'string' ? ((error as any).message as string) : '';
  const cleaned = raw.replace(/^[A-Z_]{3,}:\s*/, '').trim();
  return cleaned && cleaned.length < 200 ? cleaned : fallback;
}

async function publicOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}`;
}

/** Link de indicação do membro logado para uma empresa (carrega o código dele). */
export async function getMyReferralLinkAction(
  businessSlug: string
): Promise<{ success: boolean; unauthorized?: boolean; url?: string; code?: string; error?: string }> {
  try {
    const slug = String(businessSlug || '').trim();
    if (!slug) return { success: false, error: 'Empresa não informada.' };

    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, unauthorized: true, error: 'Entre na sua conta para gerar seu link de indicação.' };

    const { data: code, error } = await (supabase as any).rpc('get_my_referral_code');
    if (error || !code) return { success: false, error: friendlyError(error, 'Não foi possível gerar seu link agora.') };

    const origin = await publicOrigin();
    return { success: true, code, url: `${origin}/guia/${encodeURIComponent(slug)}?ref=${code}` };
  } catch {
    return { success: false, error: 'Não foi possível gerar seu link agora.' };
  }
}

/** Alguém abriu um link de indicação. Conta uma vez por pessoa (navegador) por empresa. */
export async function recordReferralVisitAction(input: {
  businessSlug: string;
  code: string;
  visitorKey: string;
}): Promise<{ counted: boolean }> {
  try {
    const supabase = await createServerSideClient();
    const host = ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
    const { data } = await (supabase as any).rpc('record_referral_visit', {
      p_host: host,
      p_business_slug: input.businessSlug,
      p_code: input.code,
      p_visitor_key: input.visitorKey,
    });
    return { counted: Boolean(data?.counted) };
  } catch {
    return { counted: false };
  }
}

/** Pessoa logada: liga o navegador à conta, para o funil acompanhar benefício e conexão. */
export async function linkReferralsAction(visitorKey: string): Promise<void> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return;
    await (supabase as any).rpc('link_referrals_to_user', { p_visitor_key: visitorKey });
  } catch {}
}

/** "Esta empresa recebeu N indicações pessoais através da Conexão." */
export async function getPublicReferralCountAction(businessSlug: string): Promise<number> {
  try {
    const supabase = await createServerSideClient();
    const host = ((await headers()).get('host') || 'localhost').split(':')[0] || 'localhost';
    const { data } = await (supabase as any).rpc('public_business_referral_count', {
      p_host: host,
      p_business_slug: businessSlug,
    });
    return Number(data ?? 0);
  } catch {
    return 0;
  }
}

/** Funil de indicações de uma empresa (Prontuário 360 e painel do anunciante). A autorização é feita no banco. */
export async function getBusinessReferralFunnelAction(
  businessId: string
): Promise<{ success: boolean; error?: string; funnel: ReferralFunnel | null }> {
  try {
    const supabase = await createServerSideClient();
    const { data, error } = await (supabase as any).rpc('business_referral_metrics', { p_business_id: businessId });
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível carregar as indicações.'), funnel: null };
    return { success: true, funnel: data ?? null };
  } catch {
    return { success: false, error: 'Não foi possível carregar as indicações.', funnel: null };
  }
}

/** Funil da empresa do anunciante logado. */
export async function getMyBusinessReferralFunnelAction(): Promise<{
  success: boolean;
  error?: string;
  businessName?: string;
  funnel: ReferralFunnel | null;
}> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.', funnel: null };

    const { data: biz } = await (supabase as any).from('businesses').select('id, name').eq('owner_id', userRes.user.id).maybeSingle();
    if (!biz?.id) return { success: false, error: 'Nenhuma empresa encontrada para esta conta.', funnel: null };

    const res = await getBusinessReferralFunnelAction(biz.id);
    return { ...res, businessName: biz.name };
  } catch {
    return { success: false, error: 'Não foi possível carregar as indicações.', funnel: null };
  }
}

/** "Minhas indicações": código do membro e resultado por empresa. */
export async function getMyReferralSummaryAction(): Promise<{ success: boolean; error?: string; summary: MyReferralSummary | null }> {
  try {
    const supabase = await createServerSideClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return { success: false, error: 'Sessão expirada.', summary: null };

    const { data, error } = await (supabase as any).rpc('my_referral_summary');
    if (error) return { success: false, error: friendlyError(error, 'Não foi possível carregar suas indicações.'), summary: null };
    return { success: true, summary: data ?? null };
  } catch {
    return { success: false, error: 'Não foi possível carregar suas indicações.', summary: null };
  }
}
