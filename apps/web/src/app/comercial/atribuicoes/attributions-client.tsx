'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  confirmAttributionAction,
  createManualAttributionAction,
  revokeAttributionAction,
  type AttributionItem,
} from '@/lib/commercial/attributions-service';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', confirmed: 'Confirmada', rejected: 'Rejeitada', expired: 'Expirada', revoked: 'Revogada',
};
const TYPE_LABEL: Record<string, string> = {
  referral_link: 'Link de indicação', lead_registration: 'Lead convertido', admin_assigned: 'Manual (equipe)',
};

export default function AttributionsClient({
  items,
  loadError,
  representatives,
}: {
  items: AttributionItem[];
  loadError: string | null;
  representatives: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ businessRef: '', representativeId: '', justification: '' });
  const repName = (id: string) => representatives.find((r) => r.id === id)?.name ?? id.slice(0, 8);

  const finish = (res: { success: boolean; error?: string }, okText: string) => {
    setMessage(res.success ? { type: 'success', text: okText } : { type: 'error', text: res.error ?? 'Erro.' });
    if (res.success) router.refresh();
    setBusy(false);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await createManualAttributionAction(form);
    if (res.success) setForm({ businessRef: '', representativeId: '', justification: '' });
    finish(res, 'Atribuição criada como pendente. Confirme para valer como origem de comissão.');
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white';

  return (
    <div className="space-y-8">
      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={create} className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#3B0B14]">Nova atribuição manual</h2>
        <p className="text-xs text-stone-500">Use quando a indicação não veio por lead (ex.: link de indicação). A justificativa fica registrada na auditoria. Uma empresa só pode ter uma atribuição confirmada.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
          <label>ID ou slug da empresa (anúncio)
            <input className={input} value={form.businessRef} onChange={(e) => setForm((f) => ({ ...f, businessRef: e.target.value }))} required />
          </label>
          <label>Representante (ativo)
            <select className={input} value={form.representativeId} onChange={(e) => setForm((f) => ({ ...f, representativeId: e.target.value }))} required>
              <option value="">Selecione…</option>
              {representatives.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <label className="md:col-span-2">Justificativa (mín. 10 caracteres)
            <textarea className={input} rows={2} value={form.justification} onChange={(e) => setForm((f) => ({ ...f, justification: e.target.value }))} required />
          </label>
        </div>
        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">Criar atribuição</button>
      </form>

      <section aria-labelledby="atrib-titulo" className="space-y-3">
        <h2 id="atrib-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Atribuições ({items.length})</h2>
        {loadError && <p className="text-sm text-rose-700">{loadError}</p>}
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Representante</th>
                <th className="px-4 py-3">Origem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Validade</th>
                <th className="px-4 py-3">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Nenhuma atribuição.</td></tr>}
              {items.map((a) => (
                <tr key={a.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-3 font-mono text-xs">{a.business_id.slice(0, 8)}…</td>
                  <td className="px-4 py-3">{repName(a.representative_id)}</td>
                  <td className="px-4 py-3">{TYPE_LABEL[a.attribution_type] ?? a.attribution_type}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold">{STATUS_LABEL[a.status] ?? a.status}</span>
                    {a.revoke_reason && <span className="block text-xs text-stone-500">{a.revoke_reason}</span>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">{a.valid_until ? new Date(a.valid_until).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {a.status === 'pending' && (
                        <button disabled={busy} onClick={async () => { setBusy(true); setMessage(null); finish(await confirmAttributionAction(a.id), 'Atribuição confirmada.'); }} className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Confirmar</button>
                      )}
                      {(a.status === 'pending' || a.status === 'confirmed') && (
                        <button disabled={busy} onClick={async () => {
                          const reason = window.prompt('Motivo da revogação (mín. 10 caracteres). Créditos já registrados não são apagados:');
                          if (!reason?.trim()) return;
                          setBusy(true); setMessage(null);
                          finish(await revokeAttributionAction({ attributionId: a.id, reason }), 'Atribuição revogada.');
                        }} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 cursor-pointer disabled:opacity-50">Revogar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
