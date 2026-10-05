import React from 'react';
import { BadgeCheck, Gift, MessageCircle, Users } from 'lucide-react';
import type { ReferralFunnel as Funnel } from '@/app/actions/referrals';

const pct = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Funil de indicações: indicação → contato → benefício → conexão confirmada, com as taxas de cada etapa. */
export function ReferralFunnelView({ funnel }: { funnel: Funnel }) {
  const stages = [
    { label: 'Indicações pessoais', value: funnel.total, Icon: Users, hint: 'Pessoas que abriram um link de indicação' },
    { label: 'Chegaram ao contato', value: funnel.contacts, Icon: MessageCircle, hint: 'WhatsApp, telefone, site ou rota' },
    { label: 'Resgataram benefício', value: funnel.benefits, Icon: Gift, hint: 'Usaram um benefício da empresa' },
    { label: 'Negócios confirmados', value: funnel.connections, Icon: BadgeCheck, hint: 'Conexão confirmada pela empresa' },
  ];
  const max = Math.max(funnel.total, 1);

  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-700">
        Sua empresa recebeu <strong className="text-[#3B0B14]">{funnel.total}</strong>{' '}
        {funnel.total === 1 ? 'indicação pessoal' : 'indicações pessoais'} através da Conexão
        {funnel.last_30_days > 0 ? <> ({funnel.last_30_days} nos últimos 30 dias)</> : null}.
      </p>

      <ol className="space-y-3">
        {stages.map(({ label, value, Icon, hint }, index) => (
          <li key={label}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="flex items-center gap-2 font-bold text-stone-800">
                <Icon className="h-4 w-4 text-[#C9A227]" /> {label}
              </span>
              <span className="tabular-nums font-bold text-stone-900">
                {value}
                {index > 0 && funnel.total > 0 ? <span className="ml-1 font-normal text-stone-500">({pct(value, funnel.total)}%)</span> : null}
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
              <div className="h-full rounded-full bg-gradient-to-r from-[#3B0B14] to-[#C9A227]" style={{ width: `${Math.max(pct(value, max), value > 0 ? 3 : 0)}%` }} />
            </div>
            <p className="mt-0.5 text-[11px] text-stone-500">{hint}</p>
          </li>
        ))}
      </ol>

      {funnel.top_referrers?.length > 0 && (
        <div>
          <h3 className="font-serif text-sm font-bold text-stone-900">Quem mais indica sua empresa</h3>
          <ul className="mt-2 divide-y divide-stone-100 rounded-xl border border-stone-200 bg-white">
            {funnel.top_referrers.map((referrer, index) => (
              <li key={`${referrer.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-xs">
                <span className="font-semibold text-stone-900">{referrer.name}</span>
                <span className="text-stone-600">
                  {referrer.indications} {referrer.indications === 1 ? 'indicação' : 'indicações'} · {referrer.contacts} contato(s) · {referrer.connections} negócio(s)
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
