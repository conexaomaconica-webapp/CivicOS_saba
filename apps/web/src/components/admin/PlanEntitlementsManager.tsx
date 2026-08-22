'use client';

import React, { useState } from 'react';
import { Button, Input } from '@saas/ui';
import { PlanEntitlementsData, updatePlanEntitlementsAction } from '@/app/actions/plan-entitlements';
import { Save } from 'lucide-react';

export function PlanEntitlementsManager({ initialData }: { initialData: PlanEntitlementsData[] }) {
  const [data, setData] = useState<Record<string, PlanEntitlementsData>>(() => {
    const acc: Record<string, PlanEntitlementsData> = {};
    initialData.forEach((d) => (acc[d.plan_code] = { ...d }));
    return acc;
  });

  const [savingPlan, setSavingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [hasChanges, setHasChanges] = useState<Record<string, boolean>>({
    bronze: false,
    prata: false,
    ouro: false,
  });

  const handleInputChange = (planCode: string, feature: keyof PlanEntitlementsData, value: string) => {
    const intValue = parseInt(value, 10);
    const validValue = isNaN(intValue) || intValue < 0 ? 0 : intValue;

    setData((prev) => {
      const prevPlanData = prev[planCode];
      if (!prevPlanData) return prev;
      return {
        ...prev,
        [planCode]: {
          ...prevPlanData,
          [feature]: validValue,
        } as PlanEntitlementsData,
      };
    });

    setHasChanges((prev) => ({ ...prev, [planCode]: true }));
  };

  const handleSave = async (planCode: 'bronze' | 'prata' | 'ouro') => {
    setSavingPlan(planCode);
    setMessage(null);

    const planData = data[planCode];
    if (!planData) {
      setSavingPlan(null);
      return;
    }

    const result = await updatePlanEntitlementsAction({
      plan: planCode,
      services_limit: planData.services_limit,
      gallery_photos_limit: planData.gallery_photos_limit,
      benefits_limit: planData.benefits_limit,
      events_limit: planData.events_limit,
      posts_limit: planData.posts_limit,
    });

    setSavingPlan(null);

    if (result.success) {
      setMessage({ type: 'success', text: `Limites do plano ${planCode.toUpperCase()} atualizados com sucesso!` });
      setHasChanges((prev) => ({ ...prev, [planCode]: false }));
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao salvar os limites.' });
    }
  };

  const plans: Array<'bronze' | 'prata' | 'ouro'> = ['bronze', 'prata', 'ouro'];

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-md text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#20080a]">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-[#140305] text-slate-700 dark:text-slate-300">
            <tr>
              <th className="px-6 py-4 font-semibold w-1/4">Funcionalidade</th>
              <th className="px-6 py-4 font-semibold text-center border-l border-slate-200 dark:border-slate-800">BRONZE</th>
              <th className="px-6 py-4 font-semibold text-center border-l border-slate-200 dark:border-slate-800">PRATA</th>
              <th className="px-6 py-4 font-semibold text-center border-l border-slate-200 dark:border-slate-800">OURO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-900 dark:text-white">
            
            {/* Linha: Serviços */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="px-6 py-4 font-medium">Serviços / Produtos</td>
              {plans.map((p) => (
                <td key={p} className="px-6 py-3 border-l border-slate-200 dark:border-slate-800 text-center">
                  <Input 
                    type="number" min="0" 
                    value={data[p]?.services_limit ?? 0} 
                    onChange={(e) => handleInputChange(p, 'services_limit', e.target.value)}
                    className="w-20 text-center mx-auto"
                  />
                </td>
              ))}
            </tr>

            {/* Linha: Fotos na Galeria */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="px-6 py-4 font-medium">Fotos na galeria</td>
              {plans.map((p) => (
                <td key={p} className="px-6 py-3 border-l border-slate-200 dark:border-slate-800 text-center">
                  <Input 
                    type="number" min="0" 
                    value={data[p]?.gallery_photos_limit ?? 0} 
                    onChange={(e) => handleInputChange(p, 'gallery_photos_limit', e.target.value)}
                    className="w-20 text-center mx-auto"
                  />
                </td>
              ))}
            </tr>

            {/* Linha: Benefícios */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="px-6 py-4 font-medium">Benefícios / Ofertas</td>
              {plans.map((p) => (
                <td key={p} className="px-6 py-3 border-l border-slate-200 dark:border-slate-800 text-center">
                  <Input 
                    type="number" min="0" 
                    value={data[p]?.benefits_limit ?? 0} 
                    onChange={(e) => handleInputChange(p, 'benefits_limit', e.target.value)}
                    className="w-20 text-center mx-auto"
                  />
                </td>
              ))}
            </tr>

            {/* Linha: Eventos */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="px-6 py-4 font-medium">Eventos</td>
              {plans.map((p) => (
                <td key={p} className="px-6 py-3 border-l border-slate-200 dark:border-slate-800 text-center">
                  <Input 
                    type="number" min="0" 
                    value={data[p]?.events_limit ?? 0} 
                    onChange={(e) => handleInputChange(p, 'events_limit', e.target.value)}
                    className="w-20 text-center mx-auto"
                  />
                </td>
              ))}
            </tr>

            {/* Linha: Posts */}
            <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
              <td className="px-6 py-4 font-medium">Posts / Novidades</td>
              {plans.map((p) => (
                <td key={p} className="px-6 py-3 border-l border-slate-200 dark:border-slate-800 text-center">
                  <Input 
                    type="number" min="0" 
                    value={data[p]?.posts_limit ?? 0} 
                    onChange={(e) => handleInputChange(p, 'posts_limit', e.target.value)}
                    className="w-20 text-center mx-auto"
                  />
                </td>
              ))}
            </tr>

            {/* Linha de Ações (Salvar) */}
            <tr className="bg-slate-50 dark:bg-[#1a0508]">
              <td className="px-6 py-4 text-xs text-slate-500">
                Lembre-se de salvar individualmente cada coluna.
              </td>
              {plans.map((p) => (
                <td key={p} className="px-6 py-4 border-l border-slate-200 dark:border-slate-800 text-center">
                  <Button 
                    variant={hasChanges[p] ? 'primary' : 'outline'}
                    size="sm"
                    disabled={savingPlan === p || !hasChanges[p]}
                    onClick={() => handleSave(p)}
                    className="w-full max-w-[120px] mx-auto flex items-center justify-center gap-2"
                  >
                    {savingPlan === p ? 'Salvando...' : <><Save className="w-4 h-4" /> Salvar</>}
                  </Button>
                </td>
              ))}
            </tr>

          </tbody>
        </table>
      </div>

      <div className="mt-8 p-5 bg-[#C9A227]/10 border border-[#C9A227]/30 rounded-lg">
        <h3 className="font-bold text-[#C9A227] text-sm uppercase tracking-wider mb-2">Ouro Fundador</h3>
        <p className="text-sm text-slate-400">
          O plano Fundador não possui configuração independente de limites de recursos estruturais nesta tela. Ele <strong className="text-white">herda automaticamente todos os limites do plano Ouro</strong>, já que seu diferencial comercial baseia-se na proteção vitalícia de preço e no selo fundador exclusivo, não em capacidades técnicas distintas.
        </p>
      </div>
    </div>
  );
}
