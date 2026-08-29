'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowRight, Loader2 } from 'lucide-react';
import { saveStepDataAction } from '@/lib/onboarding/onboarding-server-state';
import { CommercialPlan, CANONICAL_PLANS } from '@/lib/billing/plans-service';

export interface PlanSelectionFormProps {
  businessId: string;
  plans: CommercialPlan[];
}

export default function PlanSelectionForm({ businessId, plans }: PlanSelectionFormProps) {
  const router = useRouter();

  const [selectedPlanTier, setSelectedPlanTier] = useState<string>('ouro');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await saveStepDataAction({
        step: 4,
        businessId,
        data: {
          planCode: selectedPlanTier,
        },
      });

      if (res.success) {
        router.push('/anunciar/passo-5');
      } else {
        setErrorMsg(res.message || 'Falha ao selecionar plano.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro de comunicação ao salvar plano.');
    } finally {
      setLoading(false);
    }
  };

  const defaultPlans: CommercialPlan[] = [
    { id: 'plan_bronze', ...CANONICAL_PLANS.bronze },
    { id: 'plan_prata', ...CANONICAL_PLANS.prata },
    { id: 'plan_ouro', ...CANONICAL_PLANS.ouro },
  ];

  const planList = plans && plans.length > 0 ? plans : defaultPlans;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-left">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {planList.map((plan) => {
          const isSelected = selectedPlanTier === plan.tier;
          const isOuro = plan.tier === 'ouro';
          const priceFormatted = (plan.annualPriceCents / 100).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          });

          return (
            <div
              key={plan.tier}
              onClick={() => setSelectedPlanTier(plan.tier)}
              className={`p-5 rounded-3xl border transition-all cursor-pointer flex flex-col justify-between space-y-4 relative ${
                isSelected
                  ? 'bg-[#3B0B14] border-[#C9A227] shadow-xl ring-1 ring-[#C9A227]'
                  : 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
              }`}
            >
              {isOuro && (
                <span className="absolute -top-3 right-4 px-3 py-0.5 bg-[#C9A227] text-[#1f0509] font-extrabold text-[10px] uppercase rounded-full shadow-md">
                  Destaque Máximo
                </span>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-serif font-bold text-[#C9A227] uppercase tracking-wider">
                    {plan.name}
                  </span>
                  <span
                    className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      isSelected
                        ? 'border-[#C9A227] bg-[#C9A227] text-[#1f0509]'
                        : 'border-stone-700 bg-stone-800'
                    }`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{plan.tagline}</h3>

                <div className="pt-2">
                  <span className="text-2xl font-serif font-extrabold text-white">{priceFormatted}</span>
                  <span className="text-xs text-stone-400 font-mono block">
                    {plan.annualPriceCents > 0
                      ? `anual • até ${plan.installmentsMax || 1}x sem juros`
                      : 'cadastro sem custo'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/60">
                <span className="text-[11px] font-bold text-[#C9A227] block mb-1">Recursos Inclusos:</span>
                <ul className="space-y-1 text-[11px] text-stone-300">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <Check className="w-3 h-3 text-[#C9A227] shrink-0" />
                      <span>{feat.text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs">
          {errorMsg}
        </div>
      )}

      {/* BOTÃO CONTINUAR */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-2xl bg-[#C9A227] hover:bg-[#D9B237] text-[#1f0509] font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Salvando escolha...</span>
          </>
        ) : (
          <>
            <span>Revisar e Assinar Contrato</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
