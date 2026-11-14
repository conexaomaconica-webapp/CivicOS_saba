'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { publishContractVersionAction, type ContractVersionItem } from '@/lib/commercial/contract-service';

export default function ContractClient({
  versions,
  activeText,
  loadError,
}: {
  versions: ContractVersionItem[];
  activeText: string | null;
  loadError: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [form, setForm] = useState({ version: '', title: 'Contrato de Representação Comercial', content: '', reason: '' });
  const active = versions.find((v) => v.is_active) ?? null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Publicar esta versão? Quem já aceitou a anterior precisará aceitar esta no próximo acesso. Versões publicadas não podem ser editadas.')) return;
    setBusy(true);
    setMessage(null);
    const res = await publishContractVersionAction(form);
    setMessage(res.success ? { type: 'success', text: 'Contrato publicado. Os representantes verão o aceite no próximo acesso.' } : { type: 'error', text: res.error });
    if (res.success) {
      setForm((f) => ({ ...f, version: '', content: '', reason: '' }));
      router.refresh();
    }
    setBusy(false);
  };

  const input = 'mt-1 w-full border border-stone-300 rounded-xl px-3 py-2 text-sm bg-white';

  return (
    <section aria-labelledby="contrato-config" className="rounded-2xl border border-[#E8E5DF] bg-white p-6 space-y-5">
      <div>
        <h2 id="contrato-config" className="text-xl font-serif font-bold text-[#3B0B14]">Contrato do representante</h2>
        <p className="text-xs text-stone-500">
          O representante aceita o contrato vigente no primeiro acesso à área dele (e de novo a cada nova versão). O sistema grava a versão, o instante e a impressão digital (SHA-256) do texto aceito.
          O texto é de responsabilidade da equipe jurídica: o sistema não fornece modelo.
        </p>
      </div>

      {loadError && <p className="text-sm text-rose-700">{loadError}</p>}
      {message && (
        <div role="status" className={`p-3 rounded-xl text-sm font-semibold border ${message.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-rose-50 text-rose-900 border-rose-200'}`}>
          {message.text}
        </div>
      )}

      <div className={`rounded-xl border p-3 text-sm ${active ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
        {active ? (
          <>Versão vigente: <strong>{active.version}</strong> — {active.title} (publicada em {new Date(active.published_at).toLocaleDateString('pt-BR')}).</>
        ) : (
          <>Nenhum contrato publicado: os representantes ainda não têm o que aceitar. A equipe só consegue ativar um representante informando a versão manualmente.</>
        )}
      </div>

      {activeText && (
        <details className="text-sm">
          <summary className="cursor-pointer font-bold text-stone-700">Ver texto da versão vigente</summary>
          <div className="mt-2 max-h-64 overflow-y-auto rounded-xl border border-stone-200 bg-stone-50 p-3 whitespace-pre-wrap">{activeText}</div>
        </details>
      )}

      <form onSubmit={submit} className="space-y-4">
        <h3 className="text-base font-serif font-bold text-[#3B0B14]">Publicar nova versão</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-stone-700">
          <label>Identificador da versão (ex.: 2026-v1)
            <input className={input} value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))} required maxLength={40} />
          </label>
          <label>Título
            <input className={input} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
          </label>
        </div>
        <label className="block text-xs font-bold text-stone-700">Texto do contrato
          <textarea className={`${input} min-h-[240px] font-mono`} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} required />
        </label>
        <label className="block text-xs font-bold text-stone-700">Justificativa da publicação (mín. 10 caracteres)
          <input className={input} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} required minLength={10} />
        </label>
        <button type="submit" disabled={busy} className="px-5 py-2.5 bg-[#3B0B14] hover:bg-[#5d1523] text-white font-bold text-sm rounded-xl disabled:opacity-50 cursor-pointer">
          {busy ? 'Publicando…' : 'Publicar versão'}
        </button>
      </form>

      {versions.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#E8E5DF]">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr><th className="px-4 py-2">Versão</th><th className="px-4 py-2">Título</th><th className="px-4 py-2">Publicada</th><th className="px-4 py-2">Situação</th><th className="px-4 py-2">SHA-256</th></tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t border-stone-100">
                  <td className="px-4 py-2 font-semibold">{v.version}</td>
                  <td className="px-4 py-2">{v.title}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{new Date(v.published_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-2">{v.is_active ? 'Vigente' : 'Substituída'}</td>
                  <td className="px-4 py-2 font-mono text-[11px] break-all">{v.content_sha256.slice(0, 16)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
