'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { convertLeadAction, expireStaleAction, markLeadLostAction, type LeadItem } from '@/lib/commercial/leads-service';

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo', contacted: 'Em contato', qualified: 'Qualificado (reservado)', proposal: 'Proposta',
  won: 'Convertido', lost: 'Perdido', expired: 'Expirado',
};

export default function LeadsStaffClient({ items, loadError, canConvert }: { items: LeadItem[]; loadError: string | null; canConvert: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const run = async (fn: () => Promise<{ success: boolean; error?: string }>, okText: string) => {
    setBusy(true);
    setMessage(null);
    const res = await fn();
    setMessage(res.success ? { type: 'success', text: okText } : { type: 'error', text: res.error ?? 'Erro.' });
    if (res.success) router.refresh();
    setBusy(false);
  };

  const convert = (lead: LeadItem) => {
    const ref = window.prompt('ID ou slug do anúncio (empresa) que nasceu desta indicação:');
    if (!ref?.trim()) return;
    void run(() => convertLeadAction({ leadId: lead.id, businessRef: ref }), 'Lead convertido: atribuição confirmada, com a origem da indicação preservada.');
  };
  const lose = (lead: LeadItem) => {
    const reason = window.prompt('Motivo do encerramento:');
    if (!reason?.trim()) return;
    void run(() => markLeadLostAction({ leadId: lead.id, reason }), 'Lead encerrado.');
  };

  const open = (s: string) => ['new', 'contacted', 'qualified', 'proposal'].includes(s);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-serif font-bold text-[#3B0B14]">Indicações ({items.length})</h2>
        <button
          disabled={busy}
          onClick={() => void run(async () => {
            const r = await expireStaleAction();
            return r.success ? { success: true } : r;
          }, 'Expirações processadas (reservas sem atividade e atribuições pendentes vencidas).')}
          className="px-4 py-2 rounded-xl bg-white border border-stone-300 text-sm font-bold hover:bg-stone-50 disabled:opacity-50 cursor-pointer"
        >
          Processar expirações
        </button>
      </div>

      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {message.text}
        </div>
      )}
      {loadError && <p className="text-sm text-rose-700">{loadError}</p>}

      <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Empresa indicada</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reserva até</th>
              <th className="px-4 py-3">Última atividade</th>
              <th className="px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Nenhuma indicação registrada.</td></tr>}
            {items.map((l) => (
              <tr key={l.id} className="border-t border-stone-100 align-top">
                <td className="px-4 py-3">
                  <span className="font-semibold">{l.company_name}</span>
                  <span className="block text-xs text-stone-500">{[l.contact_name, l.city && `${l.city}${l.state ? `/${l.state}` : ''}`].filter(Boolean).join(' • ')}</span>
                </td>
                <td className="px-4 py-3 font-bold">{STATUS_LABEL[l.status] ?? l.status}</td>
                <td className="px-4 py-3 whitespace-nowrap">{l.reserved_until ? new Date(l.reserved_until).toLocaleDateString('pt-BR') : '—'}</td>
                <td className="px-4 py-3 whitespace-nowrap">{new Date(l.last_activity_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {canConvert && open(l.status) && l.representative_id && (
                      <button disabled={busy} onClick={() => convert(l)} className="px-2.5 py-1 rounded-lg bg-emerald-700 text-white text-xs font-bold cursor-pointer disabled:opacity-50">Converter em anunciante</button>
                    )}
                    {open(l.status) && (
                      <button disabled={busy} onClick={() => lose(l)} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 cursor-pointer disabled:opacity-50">Encerrar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
