import React from 'react';
import { getInstitutionalRecognitionsAction } from '@/app/actions/institutional-recognitions';
import { RecognitionsAdminClient } from './recognitions-admin-client';

export const metadata = {
  title: 'Gestão Visual de Reconhecimentos — Admin | Conexão Maçônica',
};

export default async function AdminReconhecimentosPage() {
  const result = await getInstitutionalRecognitionsAction();

  if (!result.success || !result.data) {
    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="bg-rose-50 text-rose-800 p-6 rounded-2xl border border-rose-200">
          <h2 className="text-lg font-bold mb-2">Erro ao carregar reconhecimentos</h2>
          <p>Não foi possível carregar o catálogo de reconhecimentos.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="border-b border-stone-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-0.5 rounded-full bg-[#3B0B14] text-[#C9A227] font-bold text-[10px] uppercase tracking-wider">
            Gestão de Selos Institucionais
          </span>
          <span className="text-xs text-stone-500 font-semibold">
            Camada Visual Desacoplada dos Planos Comerciais
          </span>
        </div>

        <h1 className="text-2xl font-serif font-bold text-stone-900 mt-1">
          Catálogo & Assets dos Selos de Reconhecimento
        </h1>
        <p className="text-xs text-stone-600 mt-1 max-w-3xl leading-relaxed">
          Configure a apresentação visual, textos explicativos, tooltips e URLs dos selos gráficos (Pedra Fundamental 10/10, Empresa Fundadora, Coluna de Honra e Empresa Verificada).
        </p>
      </div>

      <RecognitionsAdminClient initialRecognitions={result.data} />
    </div>
  );
}
