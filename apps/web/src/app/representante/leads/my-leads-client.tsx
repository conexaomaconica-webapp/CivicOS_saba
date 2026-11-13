'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createLeadAsRepresentativeAction,
  logLeadActivityAction,
  qualifyLeadAction,
  type LeadActivityType,
  type LeadItem,
} from '@/lib/commercial/leads-service';

const STATUS_LABEL: Record<string, string> = {
  new: 'Novo', contacted: 'Em contato', qualified: 'Qualificado (reservado)', proposal: 'Proposta',
  won: 'Convertido', lost: 'Perdido', expired: 'Expirado',
};
const ACTIVITY_OPTIONS: Array<{ value: LeadActivityType; label: string }> = [
  { value: 'contact', label: 'Contato (ligação/mensagem)' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'proposal_sent', label: 'Proposta enviada' },
  { value: 'follow_up', label: 'Acompanhamento' },
  { value: 'note', label: 'Anotação' },
];

export default function MyLeadsClient({ items, loadError, referralCode }: { items: LeadItem[]; loadError: string | null; referralCode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ companyName: '', contactName: '', contactEmail: '', contactPhone: '', document: '', city: '', state: '' });
  const [activity, setActivity] = useState<Record<string, { type: LeadActivityType; note: string }>>({});

  const finish = (res: { success: boolean; error?: string }, okText: string) => {
    setMessage(res.success ? { type: 'success', text: okText } : { type: 'error', text: res.error ?? 'Erro.' });
    if (res.success) router.refresh();
    setBusy(false);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await createLeadAsRepresentativeAction(form);
    if (res.success) setForm({ companyName: '', contactName: '', contactEmail: '', contactPhone: '', document: '', city: '', state: '' });
    finish(res, 'Indicação cadastrada.');
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white';
  const open = (s: string) => ['new', 'contacted', 'qualified', 'proposal'].includes(s);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/r/${referralCode}` : `/r/${referralCode}`;

  return (
    <div className="space-y-8">
      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <section className="rounded-2xl border border-[#E8E5DF] bg-white p-5 text-sm space-y-1">
        <p className="font-semibold text-[#3B0B14]">Seu link de indicação</p>
        <p className="font-mono text-xs break-all">{link}</p>
        <p className="text-xs text-stone-500">Compartilhe com empresas interessadas. As visitas pelo link ficam registradas como prova de origem (validade padrão de 30 dias).</p>
      </section>

      <form onSubmit={create} className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#3B0B14]">Nova indicação</h2>
        <p className="text-xs text-stone-500">Informe o CPF/CNPJ ou o e-mail do contato: eles evitam que a mesma empresa seja indicada por dois representantes ao mesmo tempo.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
          <label>Empresa
            <input className={input} value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} required />
          </label>
          <label>CPF/CNPJ (recomendado)
            <input className={input} value={form.document} onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))} />
          </label>
          <label>Nome do contato
            <input className={input} value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
          </label>
          <label>E-mail do contato
            <input type="email" className={input} value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
          </label>
          <label>Telefone
            <input className={input} value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
          </label>
          <div className="grid grid-cols-3 gap-2">
            <label className="col-span-2">Cidade
              <input className={input} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </label>
            <label>UF
              <input className={input} maxLength={2} value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value.toUpperCase() }))} />
            </label>
          </div>
        </div>
        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">Cadastrar indicação</button>
      </form>

      <section aria-labelledby="minhas-titulo" className="space-y-3">
        <h2 id="minhas-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Minhas indicações ({items.length})</h2>
        {loadError && <p className="text-sm text-rose-700">{loadError}</p>}
        {items.length === 0 && <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">Você ainda não cadastrou indicações.</div>}
        <div className="space-y-3">
          {items.map((l) => {
            const a = activity[l.id] ?? { type: 'contact' as LeadActivityType, note: '' };
            return (
              <div key={l.id} className="rounded-2xl border border-[#E8E5DF] bg-white p-4 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{l.company_name}</p>
                    <p className="text-xs text-stone-500">{[l.contact_name, l.city && `${l.city}${l.state ? `/${l.state}` : ''}`].filter(Boolean).join(' • ')}</p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold">{STATUS_LABEL[l.status] ?? l.status}</p>
                    {l.reserved_until && <p className="text-stone-500">Reservada até {new Date(l.reserved_until).toLocaleDateString('pt-BR')}</p>}
                  </div>
                </div>
                {open(l.status) && (
                  <div className="flex flex-wrap items-end gap-2 text-xs">
                    <select className="border border-stone-300 rounded-lg px-2 py-1.5 bg-white" value={a.type} onChange={(e) => setActivity((s) => ({ ...s, [l.id]: { ...a, type: e.target.value as LeadActivityType } }))}>
                      {ACTIVITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <input className="flex-1 min-w-[160px] border border-stone-300 rounded-lg px-2 py-1.5" placeholder="Observação (opcional)" value={a.note} onChange={(e) => setActivity((s) => ({ ...s, [l.id]: { ...a, note: e.target.value } }))} />
                    <button disabled={busy} onClick={async () => { setBusy(true); setMessage(null); const res = await logLeadActivityAction({ leadId: l.id, type: a.type, note: a.note }); if (res.success) setActivity((s) => ({ ...s, [l.id]: { type: 'contact', note: '' } })); finish(res, 'Atividade registrada.'); }} className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold cursor-pointer disabled:opacity-50">Registrar atividade</button>
                    {(l.status === 'new' || l.status === 'contacted') && (
                      <button disabled={busy} onClick={async () => { setBusy(true); setMessage(null); finish(await qualifyLeadAction(l.id), 'Lead qualificado: reserva iniciada (a reserva se mantém enquanto houver atividade).'); }} className="px-3 py-1.5 rounded-lg bg-[#3B0B14] text-white font-bold cursor-pointer disabled:opacity-50">Qualificar e reservar</button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
