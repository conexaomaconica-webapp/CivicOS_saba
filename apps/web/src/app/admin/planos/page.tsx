import React from 'react';
import { getPlanEntitlementsAction } from '@/app/actions/plan-entitlements';
import { PlanEntitlementsManager } from '@/components/admin/PlanEntitlementsManager';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Central Comercial de Planos — Admin | Conexão Maçônica',
};

export default async function AdminPlanosPage() {
  const result = await getPlanEntitlementsAction();

  if (!result.success || !result.data) {
    if (result.error?.includes('não autenticado')) {
      redirect('/login');
    }

    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200">
          <h2 className="text-lg font-bold mb-2">Erro de Acesso</h2>
          <p>{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
            Gestão Comercial
          </span>
          <span className="text-xs text-stone-500 font-semibold">
            Fonte Única de Dados dos Planos
          </span>
        </div>

        <h1 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          Central Comercial de Planos & Benefícios
        </h1>
        <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
          Configure a identidade comercial, slogans, preços anuais em BRL, regras de parcelamento Asaas e cotas numéricas dos planos <strong>Bronze, Prata e Ouro</strong>. As alterações alimentam diretamente o onboarding dos novos anunciantes.
        </p>
      </div>

      <PlanEntitlementsManager initialData={result.data} />
    </div>
  );
}
