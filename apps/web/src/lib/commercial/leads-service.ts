'use server';

import { revalidatePath } from 'next/cache';
import { createServerSideClient } from '@/lib/supabase/server';
import { validateCpfCnpj, validatePhone } from '@/lib/onboarding/onboarding-validation';
import { representativeScopeAllows } from './access-rules';
import { getRepresentativeContext, tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';
import { dedupeKeyKey } from './commercial-secrets';
import { friendlyCommercialError, isValidEmail, leadDedupeKey, normalizeEmail } from './commercial-utils';

const LEAD_COLUMNS =
  'id, representative_id, source, company_name, contact_name, contact_email, contact_phone, city, state, interested_plan_code, status, qualified_at, reserved_until, last_activity_at, converted_business_id, created_at';

export type LeadItem = {
  id: string;
  representative_id: string | null;
  source: string;
  company_name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  city: string | null;
  state: string | null;
  interested_plan_code: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'expired';
  qualified_at: string | null;
  reserved_until: string | null;
  last_activity_at: string;
  converted_business_id: string | null;
  created_at: string;
};

export type CreateLeadInput = {
  companyName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  document?: string;
  city?: string;
  state?: string;
  interestedPlan?: 'esquadro' | 'compasso' | 'acacia' | '';
  notes?: string;
};

const ACTIVITY_TYPES = ['contact', 'meeting', 'proposal_sent', 'follow_up', 'note'] as const;
export type LeadActivityType = (typeof ACTIVITY_TYPES)[number];

/** Representante ATIVO logado (escopo operacional); caso contrário, null. */
async function activeRepresentative() {
  const ctx = await getRepresentativeContext();
  if (!ctx || !representativeScopeAllows(ctx.representative.status, 'operational')) return null;
  return ctx;
}

/** Leads do próprio representante (cliente do usuário + RLS + filtro explícito). */
export async function listMyLeadsAction(): Promise<ActionResult<LeadItem[]>> {
  const ctx = await activeRepresentative();
  if (!ctx) return fail('Acesso não autorizado.');
  const supabase = await createServerSideClient();
  const { data, error } = await (supabase as any)
    .from('commercial_leads')
    .select(LEAD_COLUMNS)
    .eq('representative_id', ctx.representative.id)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) return fail('Não foi possível listar suas indicações.');
  return { success: true, data: (data ?? []) as LeadItem[] };
}

export async function createLeadAsRepresentativeAction(input: CreateLeadInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await activeRepresentative();
  if (!ctx) return fail('Acesso não autorizado.');

  const companyName = (input.companyName ?? '').trim();
  if (companyName.length < 2 || companyName.length > 160) return fail('Informe o nome da empresa.');
  const email = normalizeEmail(input.contactEmail);
  if (email && !isValidEmail(email)) return fail('E-mail de contato inválido.');
  if (input.contactPhone?.trim() && validatePhone(input.contactPhone)) return fail('Telefone de contato inválido.');
  if (input.document?.trim()) {
    const documentError = validateCpfCnpj(input.document);
    if (documentError) return fail(documentError);
  }

  let dedupeKey: string | null;
  try {
    dedupeKey = leadDedupeKey({ document: input.document, email }, dedupeKeyKey());
  } catch {
    return fail('Configuração de segurança indisponível.');
  }
  if (!dedupeKey) return fail('Informe o CPF/CNPJ ou um e-mail válido do contato para evitar indicações duplicadas.');

  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_register_lead', {
      p_tenant_id: ctx.tenantId,
      p_representative_id: ctx.representative.id,
      p_actor: ctx.userId,
      p_company_name: companyName,
      p_dedupe_key: dedupeKey,
      p_contact_name: input.contactName?.trim() || null,
      p_contact_email: email || null,
      p_contact_phone: input.contactPhone?.trim() || null,
      p_city: input.city?.trim() || null,
      p_state: input.state?.trim() || null,
      p_plan: input.interestedPlan || null,
      p_notes: input.notes?.trim() || null,
    });
    if (error) return fail(friendlyCommercialError(error.message));
    revalidatePath('/representante/leads');
    return { success: true, data: { id: data as string } };
  } catch {
    return fail('Erro ao cadastrar a indicação.');
  }
}

/** Confirma que o lead pertence ao representante logado (ou que a equipe tem permissão) antes de operar. */
async function resolveLeadActor(leadId: string): Promise<{ tenantId: string; actorId: string } | { error: string }> {
  const rep = await activeRepresentative();
  if (rep) {
    const supabase = await createServerSideClient();
    const { data } = await (supabase as any)
      .from('commercial_leads')
      .select('id')
      .eq('id', leadId)
      .eq('representative_id', rep.representative.id)
      .maybeSingle();
    if (data) return { tenantId: rep.tenantId, actorId: rep.userId };
  }
  const staff = await tryCommercialPermission('leads.manage');
  if (staff.ok) return { tenantId: staff.tenantId, actorId: staff.user.id };
  return { error: 'Lead não encontrado ou sem permissão.' };
}

export async function logLeadActivityAction(input: { leadId: string; type: LeadActivityType; note?: string }): Promise<ActionResult> {
  if (!(ACTIVITY_TYPES as readonly string[]).includes(input.type)) return fail('Tipo de atividade inválido.');
  const actor = await resolveLeadActor(input.leadId);
  if ('error' in actor) return fail(actor.error);

  try {
    const writer = requireWriter();
    const { error } = await writer.rpc('commercial_log_lead_activity', {
      p_tenant_id: actor.tenantId,
      p_lead_id: input.leadId,
      p_type: input.type,
      p_actor: actor.actorId,
      p_note: input.note?.trim() || null,
    });
    if (error) return fail(friendlyCommercialError(error.message));
    revalidatePath('/representante/leads');
    revalidatePath('/comercial/leads');
    return { success: true };
  } catch {
    return fail('Erro ao registrar a atividade.');
  }
}

export async function qualifyLeadAction(leadId: string): Promise<ActionResult<{ reservedUntil: string }>> {
  const actor = await resolveLeadActor(leadId);
  if ('error' in actor) return fail(actor.error);

  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_qualify_lead', {
      p_tenant_id: actor.tenantId,
      p_lead_id: leadId,
      p_actor: actor.actorId,
    });
    if (error) return fail(friendlyCommercialError(error.message));
    revalidatePath('/representante/leads');
    revalidatePath('/comercial/leads');
    return { success: true, data: { reservedUntil: data as string } };
  } catch {
    return fail('Erro ao qualificar o lead.');
  }
}

// ---------------------------------------------------------------------------
// Equipe comercial
// ---------------------------------------------------------------------------
export async function listLeadsAction(): Promise<ActionResult<LeadItem[]>> {
  const auth = await tryCommercialPermission('leads.manage');
  if (!auth.ok) return fail(auth.error);
  const { data, error } = await (auth.supabase as any)
    .from('commercial_leads')
    .select(LEAD_COLUMNS)
    .eq('tenant_id', auth.tenantId)
    .order('last_activity_at', { ascending: false })
    .limit(500);
  if (error) return fail('Não foi possível listar os leads.');
  return { success: true, data: (data ?? []) as LeadItem[] };
}

/** Resolve a empresa por UUID ou slug público, dentro do tenant. */
async function resolveBusiness(tenantId: string, ref: string): Promise<{ id: string; name: string } | null> {
  const writer = requireWriter();
  const value = ref.trim();
  if (!value) return null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  const query = writer.from('businesses').select('id, name').eq('tenant_id', tenantId);
  const { data } = await (isUuid ? query.eq('id', value) : query.eq('slug', value)).maybeSingle();
  return data ? { id: data.id as string, name: data.name as string } : null;
}

export async function resolveBusinessRefAction(ref: string): Promise<ActionResult<{ id: string; name: string }>> {
  const auth = await tryCommercialPermission('attributions.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const business = await resolveBusiness(auth.tenantId, ref);
    return business ? { success: true, data: business } : fail('Empresa não encontrada. Informe o ID ou o slug exato do anúncio.');
  } catch {
    return fail('Erro ao buscar a empresa.');
  }
}

/** Converte o lead em anunciante preservando a origem; cria a atribuição CONFIRMADA (função atômica). */
export async function convertLeadAction(input: { leadId: string; businessRef: string }): Promise<ActionResult<{ attributionId: string }>> {
  const leads = await tryCommercialPermission('leads.manage');
  if (!leads.ok) return fail(leads.error);
  const attributions = await tryCommercialPermission('attributions.manage');
  if (!attributions.ok) return fail(attributions.error);

  try {
    const business = await resolveBusiness(leads.tenantId, input.businessRef);
    if (!business) return fail('Empresa não encontrada. Informe o ID ou o slug exato do anúncio.');

    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_convert_lead', {
      p_tenant_id: leads.tenantId,
      p_lead_id: input.leadId,
      p_business_id: business.id,
      p_actor: leads.user.id,
    });
    if (error) return fail(friendlyCommercialError(error.message));

    await auditCommercial(writer, {
      tenantId: leads.tenantId,
      actorId: leads.user.id,
      entityType: 'commercial_lead',
      entityId: input.leadId,
      action: 'COMMERCIAL_LEAD_CONVERTED',
      after: { business_id: business.id, attribution_id: data },
    });
    revalidatePath('/comercial/leads');
    revalidatePath('/comercial/atribuicoes');
    return { success: true, data: { attributionId: data as string } };
  } catch {
    return fail('Erro ao converter o lead.');
  }
}

export async function markLeadLostAction(input: { leadId: string; reason: string }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('leads.manage');
  if (!auth.ok) return fail(auth.error);
  const reason = input.reason?.trim();
  if (!reason) return fail('Informe o motivo.');

  try {
    const writer = requireWriter();
    const { data, error } = await writer
      .from('commercial_leads')
      .update({ status: 'lost', notes: reason })
      .eq('id', input.leadId)
      .eq('tenant_id', auth.tenantId)
      .in('status', ['new', 'contacted', 'qualified', 'proposal'])
      .select('id')
      .maybeSingle();
    if (error || !data) return fail('Lead não encontrado ou já encerrado.');
    await auditCommercial(writer, {
      tenantId: auth.tenantId,
      actorId: auth.user.id,
      entityType: 'commercial_lead',
      entityId: input.leadId,
      action: 'COMMERCIAL_LEAD_LOST',
      reason,
    });
    revalidatePath('/comercial/leads');
    return { success: true };
  } catch {
    return fail('Erro ao encerrar o lead.');
  }
}

export async function expireStaleAction(): Promise<ActionResult<{ leadsExpired: number; attributionsExpired: number }>> {
  const auth = await tryCommercialPermission('leads.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_expire_stale', { p_tenant_id: auth.tenantId });
    if (error) return fail('Não foi possível processar as expirações.');
    revalidatePath('/comercial/leads');
    revalidatePath('/comercial/atribuicoes');
    const result = data as { leads_expired: number; attributions_expired: number };
    return { success: true, data: { leadsExpired: result.leads_expired, attributionsExpired: result.attributions_expired } };
  } catch {
    return fail('Erro ao processar as expirações.');
  }
}
