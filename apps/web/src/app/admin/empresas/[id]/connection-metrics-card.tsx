'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, Handshake, Loader2 } from 'lucide-react';
import { getBusinessConnectionMetricsAction, type ConnectionMetrics } from '@/app/actions/connections';
import { getBusinessReferralFunnelAction, type ReferralFunnel } from '@/app/actions/referrals';
import { ReferralFunnelView } from '@/components/referrals/ReferralFunnel';

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

/** Métricas do Mural de Conexões ("Comprei na Conexão") de uma empresa, para o Prontuário 360. */
export function ConnectionMetricsCard({ businessId }: { businessId: string }) {
  const [metrics, setMetrics] = useState<ConnectionMetrics | null>(null);
  const [funnel, setFunnel] = useState<ReferralFunnel | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBusinessConnectionMetricsAction(businessId).then((res) => {
      if (!active) return;
      if (res.success) setMetrics(res.metrics);
      else setError(res.error || 'Não foi possível carregar as métricas.');
      setLoading(false);
    });
    getBusinessReferralFunnelAction(businessId).then((res) => active && setFunnel(res.funnel));
    return () => {
      active = false;
    };
  }, [businessId]);

  const cells = metrics
    ? [
        { label: 'Negócios confirmados', value: metrics.confirmed, tone: 'text-emerald-800' },
        { label: 'Aguardando confirmação', value: metrics.pending, tone: 'text-amber-800' },
        { label: 'Confirmados em 30 dias', value: metrics.confirmed_last_30_days, tone: 'text-stone-900' },
        { label: 'Com foto', value: metrics.with_photo, tone: 'text-stone-900' },
        { label: 'Taxa de confirmação', value: metrics.confirmation_rate != null ? `${metrics.confirmation_rate}%` : '—', tone: 'text-stone-900' },
      ]
    : [];

  return (
    <div className="bg-white border border-stone-300 rounded-2xl p-6 shadow-xs space-y-4">
      <h3 className="font-serif font-bold text-base text-stone-900 border-b border-stone-200 pb-3 flex items-center gap-2">
        <Handshake className="w-5 h-5 text-[#3B0B14]" /> Mural de Conexões — negócios registrados por membros
      </h3>

      {loading && (
        <p className="flex items-center gap-2 text-xs text-stone-500"><Loader2 className="w-4 h-4 animate-spin" /> Carregando métricas…</p>
      )}
      {error && <p className="text-xs text-rose-700">{error}</p>}

      {metrics && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            {cells.map((cell) => (
              <div key={cell.label} className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl">
                <span className="text-stone-500 block font-bold">{cell.label}:</span>
                <p className={`text-2xl font-serif font-bold mt-1 ${cell.tone}`}>{cell.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-stone-600 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>Compras: <strong>{metrics.by_type.compra}</strong></span>
            <span>Serviços: <strong>{metrics.by_type.servico}</strong></span>
            <span>Parcerias: <strong>{metrics.by_type.parceria}</strong></span>
            <span>Visitas: <strong>{metrics.by_type.visita ?? metrics.visits ?? 0}</strong></span>
            {metrics.last_confirmed_at && (
              <span className="inline-flex items-center gap-1 text-emerald-800">
                <BadgeCheck className="w-3.5 h-3.5" /> Última confirmação em {dateFmt.format(new Date(metrics.last_confirmed_at))}
              </span>
            )}
          </p>
          {metrics.total === 0 && <p className="text-xs text-stone-500">Nenhuma conexão registrada por membros ainda.</p>}
        </>
      )}

      {funnel && (
        <div className="border-t border-stone-200 pt-4">
          <h4 className="mb-3 font-serif text-sm font-bold text-stone-900">Indicações pessoais</h4>
          <ReferralFunnelView funnel={funnel} />
        </div>
      )}
    </div>
  );
}
