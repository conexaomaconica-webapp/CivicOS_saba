'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  closePeriodAction,
  processPendingEventsAction,
  releaseDueCommissionsAction,
  reprocessSkippedEventsAction,
  reviewEventAction,
  type EngineOverview,
} from '@/lib/commercial/commissions-service';
import { formatCentsBRL } from '@/lib/commercial/access-rules';

type Message = { type: 'success' | 'error'; text: string } | null;

const EVENT_LABEL: Record<string, string> = {
  settlement: 'Pagamento', partial_settlement: 'Pagamento parcial', settlement_adjustment: 'Ajuste de pagamento', reversal: 'Redução de valor',
  refund: 'Estorno', chargeback: 'Chargeback', chargeback_reversal: 'Chargeback revertido', manual_correction: 'Correção manual',
};
const STATUS_LABEL: Record<string, string> = { pending: 'Pendente', processing: 'Processando', processed: 'Processado', skipped: 'Sem comissão', failed: 'Falhou', dead_letter: 'Falha definitiva' };
const SKIP_LABEL: Record<string, string> = {
  no_confirmed_attribution: 'Sem atribuição confirmada', no_applicable_rule: 'Sem regra de comissão aplicável', representative_not_active: 'Representante inativo',
  below_min_base: 'Abaixo do valor mínimo', zero_commission: 'Comissão zero', non_monetary_modality: 'Permuta/parceria', before_capture_start: 'Antes do início da captura',
  original_settlement_skipped: 'Pagamento original sem comissão', no_commission_to_reverse: 'Sem comissão a estornar', no_commission_to_restore: 'Sem comissão a restabelecer', review_dismissed: 'Revisão: descartado',
};

export default function CommissionsClient({ overview, loadError, canAct }: { overview: EngineOverview | null; loadError: string | null; canAct: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const month = new Date();
  const firstOfThisMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), 1));
  const firstOfPrev = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1));
  const [period, setPeriod] = useState({ start: firstOfPrev.toISOString().slice(0, 10), end: firstOfThisMonth.toISOString().slice(0, 10) });

  const run = async <T,>(fn: () => Promise<{ success: boolean; error?: string; data?: T }>, okText: (d: T | undefined) => string) => {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setMessage(res.success ? { type: 'success', text: okText(res.data) } : { type: 'error', text: (res as { error: string }).error });
    if (res.success) router.refresh();
    setBusy(false);
  };

  if (!overview) return <p className="text-sm text-rose-700">{loadError ?? 'Painel indisponível.'}</p>;
  const { counts } = overview;
  const btn = 'px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50';
  const card = (label: string, value: number, warn = false) => (
    <div className={`rounded-2xl border p-4 ${warn && value > 0 ? 'border-amber-300 bg-amber-50' : 'border-[#E8E5DF] bg-white'}`}>
      <p className="text-xs font-semibold text-stone-500">{label}</p><p className="mt-1 text-2xl font-bold text-[#3B0B14] tabular-nums">{value}</p>
    </div>
  );

  return (
    <div className="space-y-8">
      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>{message.text}</div>
      )}

      <section aria-labelledby="visao-titulo" className="space-y-3">
        <h2 id="visao-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Motor de comissões</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {card('Eventos a processar', counts.pending)}
          {card('Falhas', counts.failed, true)}
          {card('Aguardando revisão', counts.needsReview, true)}
          {card('Sem comissão (recuperáveis)', counts.skippedRecoverable)}
          {card('Comissões com carência vencida', counts.holdDue)}
        </div>
        {overview.captureFailuresOpen > 0 && (
          <p className="text-sm text-rose-800 font-semibold">Há {overview.captureFailuresOpen} falha(s) de captura financeira em aberto (commercial_capture_failures): confira antes de fechar o período.</p>
        )}
        {canAct && (
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className={`${btn} bg-[#3B0B14] text-white`} onClick={() => run(processPendingEventsAction, (d) => `Processados: ${d?.processed ?? 0} · sem comissão: ${d?.skipped ?? 0} · falhas: ${d?.failed ?? 0} · aguardando: ${d?.waiting ?? 0}.`)}>Processar eventos</button>
            <button disabled={busy} className={`${btn} bg-stone-100 border border-stone-300`} onClick={() => run(reprocessSkippedEventsAction, (d) => `Reabertos: ${d?.reopened ?? 0} · gerados: ${d?.processed ?? 0}.`)}>Reprocessar eventos sem comissão</button>
            <button disabled={busy} className={`${btn} bg-stone-100 border border-stone-300`} onClick={() => run(releaseDueCommissionsAction, (d) => `Comissões liberadas: ${d?.released ?? 0}.`)}>Liberar comissões com carência vencida</button>
          </div>
        )}
        <p className="text-xs text-stone-500">Comissão só nasce de pagamento efetivamente recebido, de atribuição confirmada e de representante ativo, e exige uma regra ativa em Regras. Estornos e chargebacks geram lançamento compensatório automático.</p>
      </section>

      {canAct && (
        <section aria-labelledby="fech-titulo" className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-3">
          <h2 id="fech-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Fechamento de período</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); if (!window.confirm('Fechar o período congela os totais e não pode ser desfeito. Continuar?')) return; void run(() => closePeriodAction({ periodStart: period.start, periodEnd: period.end }), (d) => `Período fechado. Creditado: ${formatCentsBRL(d?.totals?.accrued_cents)} · estornado: ${formatCentsBRL(d?.totals?.reversed_cents)} · repassado: ${formatCentsBRL(d?.totals?.paid_cents)}.`); }}
            className="flex flex-wrap items-end gap-3 text-xs font-bold text-stone-700"
          >
            <label>Início<input type="date" className="mt-1 block border border-stone-300 rounded-xl px-3 py-2 text-sm" value={period.start} onChange={(e) => setPeriod((p) => ({ ...p, start: e.target.value }))} required /></label>
            <label>Fim (exclusivo)<input type="date" className="mt-1 block border border-stone-300 rounded-xl px-3 py-2 text-sm" value={period.end} onChange={(e) => setPeriod((p) => ({ ...p, end: e.target.value }))} required /></label>
            <button type="submit" disabled={busy} className={`${btn} bg-[#3B0B14] text-white`}>Fechar período</button>
          </form>
          <p className="text-xs text-stone-500">O fechamento é recusado se houver eventos financeiros pendentes no período.</p>
        </section>
      )}

      <section aria-labelledby="eventos-titulo" className="space-y-3">
        <h2 id="eventos-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Eventos financeiros recentes</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Empresa</th><th className="px-4 py-3">Evento</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">Situação</th>{canAct && <th className="px-4 py-3">Ações</th>}</tr>
            </thead>
            <tbody>
              {overview.events.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Nenhum evento financeiro capturado.</td></tr>}
              {overview.events.map((e) => (
                <tr key={e.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(e.occurred_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">{e.business_name ?? '—'}</td>
                  <td className="px-4 py-3">{EVENT_LABEL[e.event_type] ?? e.event_type}</td>
                  <td className={`px-4 py-3 tabular-nums font-semibold ${e.delta_cents < 0 ? 'text-rose-800' : ''}`}>{formatCentsBRL(e.delta_cents)}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold">{e.requires_review && e.status !== 'skipped' ? 'Aguardando revisão' : STATUS_LABEL[e.status]}</span>
                    {e.skip_reason && <span className="block text-xs text-stone-500">{SKIP_LABEL[e.skip_reason] ?? e.skip_reason}</span>}
                    {e.last_error && <span className="block text-xs text-rose-700">{e.last_error}</span>}
                  </td>
                  {canAct && (
                    <td className="px-4 py-3">
                      {e.requires_review && (e.status === 'pending' || e.status === 'failed') && (
                        <div className="flex flex-wrap gap-1.5">
                          {(['process', 'dismiss'] as const).map((d) => (
                            <button key={d} disabled={busy} className="px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer disabled:opacity-50 bg-stone-100 border-stone-300"
                              onClick={() => { const note = window.prompt(d === 'process' ? 'Justificativa para PROCESSAR este evento (mín. 10 caracteres):' : 'Justificativa para DESCARTAR este evento (mín. 10 caracteres):') ?? ''; if (note.trim()) void run(() => reviewEventAction({ eventId: e.id, decision: d, note }), () => 'Decisão registrada.'); }}>
                              {d === 'process' ? 'Processar' : 'Descartar'}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
