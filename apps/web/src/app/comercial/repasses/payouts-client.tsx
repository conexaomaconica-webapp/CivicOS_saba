'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { approvePayoutAction, cancelPayoutAction, createPayoutDraftAction, markPayoutPaidAction, type PayableRepresentative, type PayoutItem } from '@/lib/commercial/commissions-service';
import { formatCentsBRL } from '@/lib/commercial/access-rules';

type Message = { type: 'success' | 'error'; text: string } | null;
const STATUS_LABEL: Record<string, string> = { draft: 'Rascunho', approved: 'Aprovado (aguardando pagamento)', paid: 'Pago', failed: 'Falhou', canceled: 'Cancelado' };

export default function PayoutsClient({
  data,
  loadError,
  isMaster,
}: {
  data: { payouts: PayoutItem[]; payable: PayableRepresentative[]; currentUserId: string } | null;
  loadError: string | null;
  isMaster: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  if (!data) return <p className="text-sm text-rose-700">{loadError ?? 'Repasses indisponíveis.'}</p>;

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, okText: string) => {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setMessage(res.success ? { type: 'success', text: okText } : { type: 'error', text: (res as { error: string }).error });
    if (res.success) { setPayingId(null); router.refresh(); }
    setBusy(false);
  };

  const btn = 'px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer disabled:opacity-50';

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3">
        O sistema <strong>não envia dinheiro</strong>: o PIX é feito fora e aqui se registra o repasse com o comprovante. Fluxo: criar rascunho, aprovar por <strong>outra pessoa</strong> (o master pode aprovar o próprio), registrar o pagamento com o comprovante. Estornos de comissões já pagas viram débito e são abatidos do próximo repasse.
      </div>
      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>{message.text}</div>
      )}

      <section aria-labelledby="devido-titulo" className="space-y-3">
        <h2 id="devido-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Comissões liberadas para repasse</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Representante</th><th className="px-4 py-3">Liberado</th><th className="px-4 py-3">Débito a abater</th><th className="px-4 py-3">Ações</th></tr></thead>
            <tbody>
              {data.payable.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-stone-500">Nenhuma comissão liberada aguardando repasse.</td></tr>}
              {data.payable.map((r) => (
                <tr key={r.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 font-semibold">{r.name}{!r.has_pix && <span className="block text-xs text-rose-700">sem chave PIX cadastrada</span>}</td>
                  <td className="px-4 py-3 tabular-nums">{formatCentsBRL(r.released_cents)}</td>
                  <td className="px-4 py-3 tabular-nums">{r.clawback_open_cents > 0 ? formatCentsBRL(r.clawback_open_cents) : '—'}</td>
                  <td className="px-4 py-3">
                    <button disabled={busy || r.open_payout || !r.has_pix || r.released_cents <= 0} className={`${btn} bg-[#3B0B14] text-white border-[#3B0B14]`} onClick={() => run(() => createPayoutDraftAction(r.id), 'Rascunho de repasse criado.')}>
                      {r.open_payout ? 'Repasse em aberto' : 'Criar repasse'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="repasses-titulo" className="space-y-3">
        <h2 id="repasses-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Repasses ({data.payouts.length})</h2>
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500"><tr><th className="px-4 py-3">Representante</th><th className="px-4 py-3">Valores</th><th className="px-4 py-3">PIX</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3">Ações</th></tr></thead>
            <tbody>
              {data.payouts.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Nenhum repasse criado.</td></tr>}
              {data.payouts.map((p) => {
                const own = p.created_by === data.currentUserId;
                return (
                  <tr key={p.id} className="border-t border-stone-100 align-top">
                    <td className="px-4 py-3 font-semibold">{p.representative_name}<span className="block text-xs font-normal text-stone-500">{new Date(p.created_at).toLocaleDateString('pt-BR')}</span></td>
                    <td className="px-4 py-3 text-xs">
                      <strong className="text-sm tabular-nums">{formatCentsBRL(p.amount_cents)}</strong>
                      {p.deductions_cents > 0 && <span className="block">bruto {formatCentsBRL(p.gross_cents)} − débitos {formatCentsBRL(p.deductions_cents)}</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">{p.pix_key_type ?? '—'} {p.pix_key_hint ?? ''}</td>
                    <td className="px-4 py-3"><span className="font-bold">{STATUS_LABEL[p.status]}</span>{p.failure_reason && <span className="block text-xs text-stone-500">{p.failure_reason}</span>}{p.paid_at && <span className="block text-xs text-stone-500">pago em {new Date(p.paid_at).toLocaleDateString('pt-BR')}</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {p.status === 'draft' && (
                          <button disabled={busy || (own && !isMaster)} title={own && !isMaster ? 'Outra pessoa precisa aprovar' : ''} className={`${btn} bg-emerald-700 text-white border-emerald-800`} onClick={() => run(() => approvePayoutAction(p.id), 'Repasse aprovado.')}>Aprovar</button>
                        )}
                        {p.status === 'approved' && payingId !== p.id && (
                          <button disabled={busy} className={`${btn} bg-[#3B0B14] text-white border-[#3B0B14]`} onClick={() => setPayingId(p.id)}>Registrar pagamento</button>
                        )}
                        {(p.status === 'draft' || p.status === 'approved') && (
                          <button disabled={busy} className={`${btn} bg-rose-50 text-rose-800 border-rose-200`} onClick={() => { const reason = window.prompt('Motivo do cancelamento (mín. 10 caracteres):') ?? ''; if (reason.trim()) void run(() => cancelPayoutAction({ payoutId: p.id, reason }), 'Repasse cancelado.'); }}>Cancelar</button>
                        )}
                      </div>
                      {payingId === p.id && (
                        <form
                          className="mt-2 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs font-bold text-stone-700"
                          onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('payoutId', p.id); void run(() => markPayoutPaidAction(fd), 'Pagamento registrado.'); }}
                        >
                          <label className="block">Comprovante (PDF, JPG, PNG ou WEBP, até 10 MB)<input name="proof" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" required className="mt-1 block w-full text-xs" /></label>
                          <label className="block">Referência/ID da transação PIX (opcional)<input name="externalReference" maxLength={120} className="mt-1 block w-full border border-stone-300 rounded-lg px-2 py-1.5 text-sm font-normal bg-white" /></label>
                          <div className="flex gap-2">
                            <button type="submit" disabled={busy} className={`${btn} bg-[#3B0B14] text-white border-[#3B0B14]`}>Confirmar pagamento</button>
                            <button type="button" disabled={busy} className={`${btn} bg-white border-stone-300`} onClick={() => setPayingId(null)}>Fechar</button>
                          </div>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
