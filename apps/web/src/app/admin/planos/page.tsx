import React from 'react';
import { getPlanEntitlementsAction } from '@/app/actions/plan-entitlements';
import { PlanEntitlementsManager } from '@/components/admin/PlanEntitlementsManager';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Gestão de Planos - Admin | Conexão Maçônica',
};

export default async function AdminPlanosPage() {
  const result = await getPlanEntitlementsAction();

  if (!result.success || !result.data) {
    if (result.error?.includes('não autenticado')) {
      redirect('/login');
    }
    
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-rose-50 text-rose-800 p-6 rounded-lg border border-rose-200">
          <h2 className="text-lg font-bold mb-2">Erro de Acesso</h2>
          <p>{result.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          Planos e limites
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 max-w-3xl">
          Configure os limites de recursos disponibilizados para cada plano. Alterações passam a valer imediatamente para todos os anunciantes vinculados ao respectivo plano.
        </p>
      </div>

      <PlanEntitlementsManager initialData={result.data} />
    </div>
  );
}
