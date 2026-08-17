import React from 'react';
import { Zap, AlertCircle } from 'lucide-react';

interface QuotaProgressCardProps {
  title: string;
  planName: 'bronze' | 'prata' | 'ouro';
  activeCount: number;
  maxLimit: number | null;
  storedCount: number;
}

export function QuotaProgressCard({
  title,
  planName,
  activeCount,
  maxLimit,
  storedCount,
}: QuotaProgressCardProps) {
  const isUnlimited = maxLimit === null;
  const isMaxedOut = !isUnlimited && activeCount >= maxLimit;
  const percentage = isUnlimited ? 100 : Math.min(100, Math.round((activeCount / maxLimit) * 100));

  const planLabels = {
    bronze: 'Plano Bronze',
    prata: 'Plano Prata',
    ouro: 'Plano Ouro VIP',
  };

  return (
    <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm mb-6" data-testid="quota-progress-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h3 className="font-bold text-slate-900 text-base">{title}</h3>
            <span className="px-2.5 py-0.5 text-xs font-semibold uppercase text-amber-900 bg-amber-100 rounded-full">
              {planLabels[planName]}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isUnlimited
              ? `Benefícios e serviços ilimitados disponíveis no ${planLabels[planName]}.`
              : `Capacidade de publicação ativa: ${activeCount} de ${maxLimit} permitidos pelo seu plano.`}
            {storedCount > activeCount && (
              <span className="block text-amber-700 font-medium mt-0.5">
                💡 {storedCount - activeCount} item(ns) mantido(s) armazenado(s) no banco sem publicação pública no {planLabels[planName]}.
              </span>
            )}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-2xl font-black text-slate-900">
            {activeCount} <span className="text-slate-400 text-sm font-normal">/ {isUnlimited ? '∞' : maxLimit}</span>
          </div>
          <div className="text-xs font-medium text-slate-500">Publicados no Guia</div>
        </div>
      </div>

      {!isUnlimited && (
        <div className="mt-4">
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                isMaxedOut ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}

      {isMaxedOut && planName !== 'ouro' && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900" data-testid="quota-upgrade-banner">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Cota limite atingida no {planLabels[planName]}.</strong> Faça o upgrade da sua empresa para expandir a quantidade de itens publicados no Guia Comercial.
          </div>
        </div>
      )}
    </div>
  );
}
