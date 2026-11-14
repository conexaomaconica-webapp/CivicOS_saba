'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { tryCommercialPermission } from './commercial-auth';
import { auditCommercial, fail, requireWriter, type ActionResult } from './commercial-service-base';

// ---------------------------------------------------------------------------
// Eventos financeiros e motor
// ---------------------------------------------------------------------------
export type EventItem = {
  id: string;
  business_name: string | null;
  event_type: string;
  delta_cents: number;
  status: 'pending' | 'processing' | 'processed' | 'skipped' | 'failed' | 'dead_letter';
  skip_reason: string | null;
  requires_review: boolean;
  last_error: string | null;
  occurred_at: string;
};

export type EngineOverview = {
  counts: { pending: number; failed: number; needsReview: number; skippedRecoverable: number; holdDue: number };
  events: EventItem[];
  captureFailuresOpen: number;
};

const RECOVERABLE = ['no_confirmed_attribution', 'no_applicable_rule', 'representative_not_active', 'below_min_base', 'zero_commission'];

export async function getEngineOverviewAction(): Promise<ActionResult<EngineOverview>> {
  const auth = await tryCommercialPermission('commissions.read');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const t = auth.tenantId;
    const head = { count: 'exact' as const, head: true };
    const [pending, failed, review, skipped, hold, capture, list] = await Promise.all([
      writer.from('commercial_financial_events').select('id', head).eq('tenant_id', t).eq('status', 'pending').eq('requires_review', false),
      writer.from('commercial_financial_events').select('id', head).eq('tenant_id', t).eq('status', 'failed'),
      writer.from('commercial_financial_events').select('id', head).eq('tenant_id', t).in('status', ['pending', 'failed']).eq('requires_review', true),
      writer.from('commercial_financial_events').select('id', head).eq('tenant_id', t).eq('status', 'skipped').in('skip_reason', RECOVERABLE),
      writer.from('commercial_commission_releases').select('id', head).eq('tenant_id', t).eq('status', 'hold').lte('release_at', new Date().toISOString()),
      writer.from('commercial_capture_failures').select('id', head).eq('tenant_id', t).is('resolved_at', null),
      writer
        .from('commercial_financial_events')
        .select('id, business_id, event_type, delta_cents, status, skip_reason, requires_review, last_error, occurred_at')
        .eq('tenant_id', t)
        .order('occurred_at', { ascending: false })
        .limit(100),
    ]);
    const rows = (list.data ?? []) as Array<Omit<EventItem, 'business_name'> & { business_id: string }>;
    const bizIds = Array.from(new Set(rows.map((r) => r.business_id)));
    const names = new Map<string, string>();
    if (bizIds.length) for (const b of (await writer.from('businesses').select('id, name').in('id', bizIds)).data ?? []) names.set(b.id as string, (b.name as string) ?? '—');
    return {
      success: true,
      data: {
        counts: {
          pending: pending.count ?? 0,
          failed: failed.count ?? 0,
          needsReview: review.count ?? 0,
          skippedRecoverable: skipped.count ?? 0,
          holdDue: hold.count ?? 0,
        },
        captureFailuresOpen: capture.count ?? 0,
        events: rows.map(({ business_id, ...e }) => ({ ...e, business_name: names.get(business_id) ?? null })),
      },
    };
  } catch {
    return fail('Erro ao carregar o painel de comissões.');
  }
}

type Rpc = Record<string, unknown> | null;

export async function processPendingEventsAction(): Promise<ActionResult<{ processed: number; skipped: number; failed: number; waiting: number }>> {
  const auth = await tryCommercialPermission('commissions.approve');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_process_pending_events', { p_tenant_id: auth.tenantId, p_limit: 500, p_actor: auth.user.id });
    if (error) return fail('Não foi possível processar os eventos.');
    const r = (data ?? {}) as Record<string, number>;
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_engine', entityId: auth.tenantId, action: 'COMMERCIAL_ENGINE_PROCESSED', after: r });
    revalidatePath('/comercial/comissoes');
    return { success: true, data: { processed: r.processed ?? 0, skipped: r.skipped ?? 0, failed: r.failed ?? 0, waiting: r.waiting ?? 0 } };
  } catch {
    return fail('Erro ao processar os eventos.');
  }
}

/** Reabre eventos pulados por falta de atribuição, regra ou representante ativo (depois de a equipe corrigir a causa). */
export async function reprocessSkippedEventsAction(): Promise<ActionResult<{ reopened: number; processed: number }>> {
  const auth = await tryCommercialPermission('commissions.approve');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_reprocess_events', { p_tenant_id: auth.tenantId, p_business_id: null, p_actor: auth.user.id });
    if (error) return fail('Não foi possível reprocessar os eventos.');
    const r = (data ?? {}) as Record<string, number>;
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_engine', entityId: auth.tenantId, action: 'COMMERCIAL_ENGINE_REPROCESSED', after: r });
    revalidatePath('/comercial/comissoes');
    return { success: true, data: { reopened: r.reopened ?? 0, processed: r.processed ?? 0 } };
  } catch {
    return fail('Erro ao reprocessar os eventos.');
  }
}

export async function reviewEventAction(input: { eventId: string; decision: 'process' | 'dismiss'; note: string }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('commissions.approve');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_review_event', {
      p_tenant_id: auth.tenantId, p_event_id: input.eventId, p_decision: input.decision, p_note: input.note ?? '', p_actor: auth.user.id,
    });
    if (error) return fail('Não foi possível registrar a decisão.');
    const result = (data as Rpc)?.result;
    if (result === 'note_required') return fail('Informe a justificativa da decisão (mínimo de 10 caracteres).');
    if (result === 'not_reviewable') return fail('Este evento não está aguardando revisão.');
    if (result === 'not_found') return fail('Evento não encontrado.');
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_financial_event', entityId: input.eventId, action: `COMMERCIAL_EVENT_REVIEW_${input.decision.toUpperCase()}`, reason: input.note });
    revalidatePath('/comercial/comissoes');
    return { success: true };
  } catch {
    return fail('Erro ao registrar a decisão.');
  }
}

/** Libera as comissões cuja carência terminou. Idempotente; também pode ser agendado. */
export async function releaseDueCommissionsAction(): Promise<ActionResult<{ released: number }>> {
  const auth = await tryCommercialPermission('commissions.approve');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_release_due', { p_tenant_id: auth.tenantId });
    if (error) return fail('Não foi possível liberar as comissões.');
    const released = Number(data ?? 0);
    if (released > 0) await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_engine', entityId: auth.tenantId, action: 'COMMERCIAL_COMMISSIONS_RELEASED', after: { released } });
    revalidatePath('/comercial/comissoes');
    return { success: true, data: { released } };
  } catch {
    return fail('Erro ao liberar as comissões.');
  }
}

export async function closePeriodAction(input: { periodStart: string; periodEnd: string }): Promise<ActionResult<{ totals: Record<string, number> }>> {
  const auth = await tryCommercialPermission('commissions.approve');
  if (!auth.ok) return fail(auth.error);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.periodStart) || !/^\d{4}-\d{2}-\d{2}$/.test(input.periodEnd)) return fail('Informe as datas do período.');
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_close_period', { p_tenant_id: auth.tenantId, p_start: input.periodStart, p_end: input.periodEnd, p_actor: auth.user.id });
    if (error) return fail('Não foi possível fechar o período.');
    const r = (data ?? {}) as { result?: string; count?: number; totals?: Record<string, number>; period_id?: string };
    if (r.result === 'invalid_range') return fail('O fim do período deve ser posterior ao início.');
    if (r.result === 'period_not_finished') return fail('O período precisa já ter terminado (o fim não pode ser depois de hoje).');
    if (r.result === 'overlaps_existing_period') return fail('Já existe período fechado que se sobrepõe a este.');
    if (r.result === 'pending_events') return fail(`Há ${r.count ?? 'eventos'} evento(s) financeiro(s) pendentes no período. Processe ou revise antes de fechar.`);
    if (r.result !== 'closed') return fail('Não foi possível fechar o período.');
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_closing_period', entityId: r.period_id as string, action: 'COMMERCIAL_PERIOD_CLOSED', after: { period_start: input.periodStart, period_end: input.periodEnd, totals: r.totals } });
    revalidatePath('/comercial/comissoes');
    return { success: true, data: { totals: r.totals ?? {} } };
  } catch {
    return fail('Erro ao fechar o período.');
  }
}

// ---------------------------------------------------------------------------
// Repasses
// ---------------------------------------------------------------------------
export type PayoutItem = {
  id: string;
  representative_id: string;
  representative_name: string;
  status: 'draft' | 'approved' | 'paid' | 'failed' | 'canceled';
  gross_cents: number | null;
  deductions_cents: number;
  amount_cents: number;
  pix_key_type: string | null;
  pix_key_hint: string | null;
  created_by: string | null;
  failure_reason: string | null;
  paid_at: string | null;
  created_at: string;
};

export type PayableRepresentative = { id: string; name: string; released_cents: number; has_pix: boolean; clawback_open_cents: number; open_payout: boolean };

export async function listPayoutsAction(): Promise<ActionResult<{ payouts: PayoutItem[]; payable: PayableRepresentative[]; currentUserId: string }>> {
  const auth = await tryCommercialPermission('payouts.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const t = auth.tenantId;
    const [{ data: payouts }, { data: releases }, { data: reps }, { data: clawbacks }, { data: open }] = await Promise.all([
      writer.from('commercial_payouts').select('id, representative_id, status, gross_cents, deductions_cents, amount_cents, pix_key_type, pix_key_hint, created_by, failure_reason, paid_at, created_at').eq('tenant_id', t).order('created_at', { ascending: false }).limit(200),
      writer.from('commercial_commission_releases').select('id, representative_id, ledger_entry_id').eq('tenant_id', t).eq('status', 'released'),
      writer.from('commercial_representatives').select('id, legal_name, trade_name, pix_key_type, pix_key_encrypted').eq('tenant_id', t).in('status', ['active', 'suspended', 'terminated']),
      writer.from('commercial_clawbacks').select('representative_id, amount_cents').eq('tenant_id', t).is('offset_payout_id', null),
      writer.from('commercial_payouts').select('representative_id').eq('tenant_id', t).in('status', ['draft', 'approved']),
    ]);

    const repName = new Map<string, string>();
    for (const r of reps ?? []) repName.set(r.id as string, ((r.trade_name as string) || (r.legal_name as string)) as string);

    // Valor liberado e ainda sem repasse, líquido de estornos parciais (mesma conta da função do banco).
    const entryIds = (releases ?? []).map((r) => r.ledger_entry_id as string);
    const payable = new Map<string, number>();
    if (entryIds.length) {
      const [{ data: accruals }, { data: reversals }, { data: items }] = await Promise.all([
        writer.from('commercial_ledger_entries').select('id, amount_cents').in('id', entryIds),
        writer.from('commercial_ledger_entries').select('reference_entry_id, amount_cents').eq('entry_type', 'reversal').in('reference_entry_id', entryIds),
        writer.from('commercial_payout_items').select('release_id').eq('tenant_id', t),
      ]);
      const reversed = new Map<string, number>();
      for (const r of reversals ?? []) reversed.set(r.reference_entry_id as string, (reversed.get(r.reference_entry_id as string) ?? 0) + Number(r.amount_cents));
      const amount = new Map((accruals ?? []).map((a) => [a.id as string, Number(a.amount_cents)]));
      const inPayout = new Set((items ?? []).map((i) => i.release_id as string));
      for (const rel of releases ?? []) {
        if (inPayout.has(rel.id as string)) continue;
        const net = (amount.get(rel.ledger_entry_id as string) ?? 0) + (reversed.get(rel.ledger_entry_id as string) ?? 0);
        if (net > 0) payable.set(rel.representative_id as string, (payable.get(rel.representative_id as string) ?? 0) + net);
      }
    }
    const claw = new Map<string, number>();
    for (const c of clawbacks ?? []) claw.set(c.representative_id as string, (claw.get(c.representative_id as string) ?? 0) + Number(c.amount_cents));
    const openSet = new Set((open ?? []).map((o) => o.representative_id as string));

    return {
      success: true,
      data: {
        currentUserId: auth.user.id,
        payouts: (payouts ?? []).map((p) => ({ ...(p as unknown as PayoutItem), representative_name: repName.get(p.representative_id as string) ?? '—' })),
        payable: (reps ?? [])
          .map((r) => ({
            id: r.id as string,
            name: repName.get(r.id as string) ?? '—',
            released_cents: payable.get(r.id as string) ?? 0,
            has_pix: Boolean(r.pix_key_type && r.pix_key_encrypted),
            clawback_open_cents: claw.get(r.id as string) ?? 0,
            open_payout: openSet.has(r.id as string),
          }))
          .filter((r) => r.released_cents > 0 || r.clawback_open_cents > 0),
      },
    };
  } catch {
    return fail('Erro ao carregar os repasses.');
  }
}

const PAYOUT_MESSAGES: Record<string, string> = {
  not_found: 'Registro não encontrado.',
  representative_not_eligible: 'O representante não está elegível a repasse.',
  missing_pix: 'O representante não tem chave PIX cadastrada.',
  open_payout_exists: 'Já existe um repasse em aberto (rascunho ou aprovado) para este representante.',
  nothing_to_pay: 'Não há comissão liberada e sem repasse para este representante.',
  same_person: 'O repasse deve ser aprovado por outra pessoa, diferente de quem o criou.',
  proof_required: 'Anexe o comprovante do pagamento (PDF ou imagem) deste representante.',
  reason_required: 'Informe a justificativa (mínimo de 10 caracteres).',
};

function payoutResult(data: unknown): ActionResult | null {
  const result = (data as { result?: string } | null)?.result;
  if (result === 'invalid_status') return fail('Este repasse não está em um estado que permita esta ação.');
  if (result && PAYOUT_MESSAGES[result]) return fail(PAYOUT_MESSAGES[result]!);
  return null;
}

export async function createPayoutDraftAction(representativeId: string): Promise<ActionResult<{ payoutId: string; amountCents: number; deductionsCents: number }>> {
  const auth = await tryCommercialPermission('payouts.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_create_payout_draft', { p_tenant_id: auth.tenantId, p_representative_id: representativeId, p_actor: auth.user.id, p_period_id: null });
    if (error) return fail('Não foi possível criar o repasse.');
    const refused = payoutResult(data);
    if (refused) return refused as ActionResult<never>;
    const r = data as { payout_id: string; amount_cents: number; deductions_cents: number };
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_payout', entityId: r.payout_id, action: 'COMMERCIAL_PAYOUT_DRAFTED', after: { amount_cents: r.amount_cents, deductions_cents: r.deductions_cents } });
    revalidatePath('/comercial/repasses');
    return { success: true, data: { payoutId: r.payout_id, amountCents: Number(r.amount_cents), deductionsCents: Number(r.deductions_cents) } };
  } catch {
    return fail('Erro ao criar o repasse.');
  }
}

export async function approvePayoutAction(payoutId: string): Promise<ActionResult> {
  const auth = await tryCommercialPermission('payouts.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data: master } = await (auth.supabase as any).rpc('has_global_platform_role', { p_role: 'master' });
    const { data, error } = await writer.rpc('commercial_approve_payout', { p_tenant_id: auth.tenantId, p_payout_id: payoutId, p_actor: auth.user.id, p_allow_same_person: master === true });
    if (error) return fail('Não foi possível aprovar o repasse.');
    const refused = payoutResult(data);
    if (refused) return refused;
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_payout', entityId: payoutId, action: 'COMMERCIAL_PAYOUT_APPROVED' });
    revalidatePath('/comercial/repasses');
    return { success: true };
  } catch {
    return fail('Erro ao aprovar o repasse.');
  }
}

const PROOF_MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/** Registra o pagamento (PIX feito fora do sistema): exige o comprovante, que vai para o bucket privado. */
export async function markPayoutPaidAction(formData: FormData): Promise<ActionResult> {
  const auth = await tryCommercialPermission('payouts.manage');
  if (!auth.ok) return fail(auth.error);

  const payoutId = String(formData.get('payoutId') ?? '');
  const externalReference = String(formData.get('externalReference') ?? '').trim().slice(0, 120);
  const file = formData.get('proof');
  if (!payoutId) return fail('Repasse inválido.');
  if (!(file instanceof File) || file.size === 0) return fail('Anexe o comprovante do pagamento.');
  if (!PROOF_MIME.includes(file.type)) return fail('O comprovante deve ser PDF, JPG, PNG ou WEBP.');
  if (file.size > 10 * 1024 * 1024) return fail('O comprovante deve ter no máximo 10 MB.');

  try {
    const writer = requireWriter();
    const { data: payout } = await writer.from('commercial_payouts').select('id, representative_id, status').eq('id', payoutId).eq('tenant_id', auth.tenantId).maybeSingle();
    if (!payout) return fail('Repasse não encontrado.');
    if (payout.status !== 'approved') return fail('Somente repasses aprovados podem ser marcados como pagos.');

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash('sha256').update(buffer).digest('hex');
    const ext = file.type === 'application/pdf' ? 'pdf' : file.type.split('/')[1];
    const docId = crypto.randomUUID();
    const path = `${auth.tenantId}/${payout.representative_id}/payout-proof/${docId}.${ext}`;

    const { error: uploadError } = await writer.storage.from('commercial-documents').upload(path, buffer, { contentType: file.type, upsert: false });
    if (uploadError) return fail('Não foi possível enviar o comprovante. Tente novamente.');

    const { error: docError } = await writer.from('commercial_representative_documents').insert({
      id: docId, tenant_id: auth.tenantId, representative_id: payout.representative_id, doc_type: 'payout_proof', storage_path: path,
      original_filename: file.name.slice(0, 200), mime_type: file.type, size_bytes: file.size, sha256, status: 'approved', uploaded_by: auth.user.id,
    });
    if (docError) {
      await writer.storage.from('commercial-documents').remove([path]);
      return fail('Não foi possível registrar o comprovante.');
    }

    const { data, error } = await writer.rpc('commercial_mark_payout_paid', { p_tenant_id: auth.tenantId, p_payout_id: payoutId, p_actor: auth.user.id, p_proof_document_id: docId, p_external_reference: externalReference || null });
    if (error) return fail('Não foi possível registrar o pagamento.');
    const refused = payoutResult(data);
    if (refused) return refused;
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_payout', entityId: payoutId, action: 'COMMERCIAL_PAYOUT_PAID', after: { proof_document_id: docId, proof_sha256: sha256 } });
    revalidatePath('/comercial/repasses');
    return { success: true };
  } catch {
    return fail('Erro ao registrar o pagamento.');
  }
}

export async function cancelPayoutAction(input: { payoutId: string; reason: string }): Promise<ActionResult> {
  const auth = await tryCommercialPermission('payouts.manage');
  if (!auth.ok) return fail(auth.error);
  try {
    const writer = requireWriter();
    const { data, error } = await writer.rpc('commercial_cancel_payout', { p_tenant_id: auth.tenantId, p_payout_id: input.payoutId, p_actor: auth.user.id, p_reason: input.reason ?? '' });
    if (error) return fail('Não foi possível cancelar o repasse.');
    const refused = payoutResult(data);
    if (refused) return refused;
    await auditCommercial(writer, { tenantId: auth.tenantId, actorId: auth.user.id, entityType: 'commercial_payout', entityId: input.payoutId, action: 'COMMERCIAL_PAYOUT_CANCELED', reason: input.reason });
    revalidatePath('/comercial/repasses');
    return { success: true };
  } catch {
    return fail('Erro ao cancelar o repasse.');
  }
}
