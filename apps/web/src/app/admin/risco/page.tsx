import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { listBusinessesAtRiskAction } from '@/lib/admin/admin-risk-service';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Empresas em risco · Admin Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function AdminBusinessesAtRiskPage() {
  const { items, success, error } = await listBusinessesAtRiskAction(100);
  const high = items.filter((item) => item.risk_level === 'alto');
  const medium = items.filter((item) => item.risk_level === 'medio');

  return (
    <div className="space-y-6 text-left max-w-5xl mx-auto">
      <header className="border-b border-stone-300 pb-4">
        <span className="text-[11px] font-mono font-bold text-[#C9A227] uppercase tracking-wider block">
          Retenção proativa
        </span>
        <h1 className="text-2xl font-serif font-bold text-stone-900 mt-0.5">Empresas em risco de baixa percepção de valor</h1>
        <p className="text-xs text-stone-600 mt-1">
          Sinais dos últimos 30 a 120 dias. Use para agir antes da renovação: atualizar o perfil, criar uma oferta ou ativar uma ação.
        </p>
      </header>

      {!success && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800" role="alert">
          {error}
        </p>
      )}

      {success && items.length === 0 && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Nenhuma empresa com sinais relevantes de risco no momento.
        </p>
      )}

      {[
        { title: `Risco alto (${high.length})`, list: high, tone: 'border-rose-300 bg-rose-50/60 text-rose-900' },
        { title: `Risco médio (${medium.length})`, list: medium, tone: 'border-amber-300 bg-amber-50/60 text-amber-900' },
      ].map(
        (group) =>
          group.list.length > 0 && (
            <section key={group.title} className="space-y-3" aria-label={group.title}>
              <h2 className="text-sm font-serif font-bold text-stone-900">{group.title}</h2>
              <ul className="space-y-3">
                {group.list.map((biz) => (
                  <li key={biz.business_id} className={`rounded-2xl border p-4 ${group.tone}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                        <strong className="font-serif text-base text-stone-900">{biz.name}</strong>
                      </div>
                      <Link
                        href={`/admin/empresas/${biz.business_id}`}
                        className="shrink-0 rounded-xl bg-[#3B0B14] px-3 py-1.5 text-xs font-bold text-[#C9A227]"
                      >
                        Abrir empresa
                      </Link>
                    </div>
                    <ul className="mt-2 list-disc space-y-0.5 pl-9 text-xs text-stone-800">
                      {biz.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )
      )}
    </div>
  );
}
