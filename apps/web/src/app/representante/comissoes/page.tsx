import React from 'react';
import { notFound } from 'next/navigation';
import { createServerSideClient } from '@/lib/supabase/server';
import { getRepresentativeContext } from '@/lib/commercial/commercial-auth';
import { LEDGER_ENTRY_LABEL, formatCentsBRL, representativeScopeAllows } from '@/lib/commercial/access-rules';

export const dynamic = 'force-dynamic';

type LedgerRow = {
  id: string;
  entry_type: string;
  amount_cents: number;
  base_amount_cents: number | null;
  rate_bps: number | null;
  effective_at: string;
  reason: string | null;
};

export default async function RepresentativeCommissionsPage() {
  const ctx = await getRepresentativeContext();
  // Histórico financeiro: visível para ativo, suspenso e desligado (somente leitura).
  if (!ctx || !representativeScopeAllows(ctx.representative.status, 'financial')) notFound();

  const supabase = await createServerSideClient();
  const { data } = await (supabase as any)
    .from('commercial_ledger_entries')
    .select('id, entry_type, amount_cents, base_amount_cents, rate_bps, effective_at, reason')
    .eq('representative_id', ctx.representative.id)
    .order('effective_at', { ascending: false })
    .limit(100);
  const rows = (data ?? []) as LedgerRow[];

  // Situação de cada comissão (carência, liberada, paga, estornada): leitura pelo cliente DO USUÁRIO (RLS).
  const { data: releaseData } = await (supabase as any)
    .from('commercial_commission_releases')
    .select('ledger_entry_id, status, release_at')
    .eq('representative_id', ctx.representative.id);
  const releases = new Map<string, { status: string; release_at: string }>(
    ((releaseData ?? []) as Array<{ ledger_entry_id: string; status: string; release_at: string }>).map((r) => [r.ledger_entry_id, r]),
  );

  return (
    <section aria-labelledby="comissoes-titulo" className="space-y-4">
      <h2 id="comissoes-titulo" className="text-xl font-serif font-bold text-[#3B0B14]">
        Comissões e repasses
      </h2>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-stone-500">
          Nenhum lançamento registrado até o momento.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#E8E5DF] bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Base</th>
                <th className="px-4 py-3">Taxa</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-stone-100">
                  <td className="px-4 py-3 whitespace-nowrap">{new Date(row.effective_at).toLocaleDateString('pt-BR')}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold">{LEDGER_ENTRY_LABEL[row.entry_type] ?? row.entry_type}</span>
                    {row.reason && <span className="block text-xs text-stone-500">{row.reason}</span>}
                    {(() => {
                      const rel = releases.get(row.id);
                      if (!rel) return null;
                      const label =
                        rel.status === 'hold' ? `Em carência até ${new Date(rel.release_at).toLocaleDateString('pt-BR')}`
                        : rel.status === 'released' ? 'Liberada para repasse'
                        : rel.status === 'paid' ? 'Paga'
                        : rel.status === 'reversed' ? 'Estornada'
                        : 'Bloqueada';
                      return <span className="block text-xs font-semibold text-stone-600">{label}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{row.base_amount_cents != null ? formatCentsBRL(row.base_amount_cents) : '—'}</td>
                  <td className="px-4 py-3 tabular-nums">{row.rate_bps != null ? `${(row.rate_bps / 100).toFixed(2).replace('.', ',')}%` : '—'}</td>
                  <td className={`px-4 py-3 text-right font-bold tabular-nums ${row.amount_cents < 0 ? 'text-rose-700' : 'text-emerald-800'}`}>
                    {formatCentsBRL(row.amount_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
