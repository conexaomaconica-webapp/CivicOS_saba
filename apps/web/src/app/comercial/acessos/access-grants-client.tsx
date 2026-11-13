'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { COMMERCIAL_PERMISSIONS } from '@/lib/commercial/access-rules';
import { grantAccessAction, revokeAccessAction, type AccessGrantItem } from '@/lib/commercial/access-grants-service';

const PERMISSION_LABEL: Record<string, string> = {
  'representatives.read': 'Ver representantes',
  'representatives.manage': 'Gerir representantes',
  'leads.manage': 'Gerir indicações (leads)',
  'attributions.manage': 'Gerir atribuições',
  'rules.manage': 'Gerir regras de comissão',
  'rules.approve': 'Aprovar regras de comissão',
  'commissions.read': 'Ver comissões e repasses',
  'commissions.approve': 'Aprovar comissões',
  'payouts.manage': 'Gerir repasses',
  'documents.read': 'Ver documentos',
  'settings.manage': 'Gerir configuração e acessos',
  'audit.read': 'Ver auditoria',
};

export default function AccessGrantsClient({ items, loadError }: { items: AccessGrantItem[]; loadError: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ email: '', permission: 'representatives.read', expiresAt: '', note: '' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await grantAccessAction(form);
    setMessage(res.success ? { type: 'success', text: 'Permissão concedida.' } : { type: 'error', text: res.error });
    if (res.success) { setForm({ email: '', permission: form.permission, expiresAt: '', note: '' }); router.refresh(); }
    setBusy(false);
  };

  const revoke = async (id: string) => {
    if (!window.confirm('Revogar esta permissão?')) return;
    setBusy(true);
    const res = await revokeAccessAction(id);
    setMessage(res.success ? { type: 'success', text: 'Permissão revogada.' } : { type: 'error', text: res.error });
    if (res.success) router.refresh();
    setBusy(false);
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white';

  return (
    <div className="space-y-8">
      <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs p-3">
        Ser administrador da plataforma <strong>não</strong> concede acesso comercial: cada pessoa precisa de permissões específicas. O perfil &quot;master&quot; é a única exceção, para recuperação.
      </div>

      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={submit} className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-4">
        <h2 className="text-xl font-serif font-bold text-[#3B0B14]">Conceder permissão</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
          <label>E-mail do usuário (já cadastrado)
            <input type="email" className={input} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          </label>
          <label>Permissão
            <select className={input} value={form.permission} onChange={(e) => setForm((f) => ({ ...f, permission: e.target.value }))}>
              {COMMERCIAL_PERMISSIONS.map((p) => <option key={p} value={p}>{PERMISSION_LABEL[p] ?? p}</option>)}
            </select>
          </label>
          <label>Expira em (opcional)
            <input type="datetime-local" className={input} value={form.expiresAt} onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))} />
          </label>
          <label>Observação (opcional)
            <input className={input} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </label>
        </div>
        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">Conceder</button>
      </form>

      <section aria-labelledby="grants-titulo" className="space-y-3">
        <h2 id="grants-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">Permissões ({items.length})</h2>
        {loadError && <p className="text-sm text-rose-700">{loadError}</p>}
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="px-4 py-3">Usuário</th><th className="px-4 py-3">Permissão</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Expira</th><th className="px-4 py-3">Ações</th></tr>
            </thead>
            <tbody>
              {items.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-stone-500">Nenhuma permissão concedida.</td></tr>}
              {items.map((g) => (
                <tr key={g.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 break-all">{g.email ?? g.user_id.slice(0, 8)}</td>
                  <td className="px-4 py-3 font-semibold">{PERMISSION_LABEL[g.permission] ?? g.permission}</td>
                  <td className="px-4 py-3">{g.status === 'active' ? 'Ativa' : 'Revogada'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{g.expires_at ? new Date(g.expires_at).toLocaleDateString('pt-BR') : '—'}</td>
                  <td className="px-4 py-3">
                    {g.status === 'active' && (
                      <button disabled={busy} onClick={() => revoke(g.id)} className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 text-xs font-bold border border-rose-200 cursor-pointer disabled:opacity-50">Revogar</button>
                    )}
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
