'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import { BusinessProfileRenderer } from '@/components/public/business/BusinessProfileRenderer';
import { ouroBusinessFixture } from '@/visual-lab/fixtures/ouro-business';
import { prataBusinessFixture } from '@/visual-lab/fixtures/prata-business';
import { bronzeBusinessFixture } from '@/visual-lab/fixtures/bronze-business';
import { RecognitionPresentation } from '@/components/public/business/RecognitionPresentation';
import { canBusinessReceiveRecognition } from '@/lib/business/recognition-eligibility';

export default function AdminReconhecimentosPreviewPage() {
  const [selectedPlan, setSelectedPlan] = useState<'bronze' | 'prata' | 'ouro'>('ouro');
  const [hasPedraFundamental, setHasPedraFundamental] = useState(true);
  const [hasFundadora, setHasFundadora] = useState(true);
  const [hasColunaHonra, setHasColunaHonra] = useState(false);
  const [hasVerificada, setHasVerificada] = useState(true);

  // Selecionar fixture base do plano
  const baseFixture =
    selectedPlan === 'bronze'
      ? bronzeBusinessFixture
      : selectedPlan === 'prata'
      ? prataBusinessFixture
      : ouroBusinessFixture;

  // Injetar camada de reconhecimento na autoridade sem alterar banco de dados
  const simulatedBusiness = {
    ...baseFixture,
    authority: {
      ...baseFixture.authority,
      isVerified: hasVerificada,
      isFounder: hasFundadora,
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-left">
      {/* HEADER DA MATRIZ DE PREVIEW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-4">
        <div>
          <Link
            href="/admin/reconhecimentos"
            className="text-xs font-bold text-stone-600 hover:text-stone-900 flex items-center gap-1.5 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar para Catálogo de Reconhecimentos</span>
          </Link>

          <h1 className="text-2xl font-serif font-bold text-stone-900">
            Matriz de Pré-visualização de Combinações
          </h1>
          <p className="text-xs text-stone-600 mt-1">
            Simule como o perfil público se apresenta visualmente ao combinar planos comerciais (Bronze, Prata, Ouro) com recohecimentos institucionais independentes.
          </p>
        </div>
      </div>

      {/* CONTROLES DA SIMULAÇÃO */}
      <div className="bg-white border border-stone-300 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="font-serif font-bold text-sm text-stone-900 flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-[#3B0B14]" /> Controles de Combinação (Simulação sem alterar banco)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* SELETOR DE PLANO COMERCIAL */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">1. Plano Comercial Base:</label>
            <div className="grid grid-cols-3 gap-2">
              {(['bronze', 'prata', 'ouro'] as const).map((plan) => (
                <button
                  key={plan}
                  type="button"
                  onClick={() => setSelectedPlan(plan)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                    selectedPlan === plan
                      ? 'bg-[#3B0B14] text-[#C9A227] border-[#C9A227] shadow-md'
                      : 'bg-stone-50 text-stone-700 border-stone-300 hover:border-stone-400'
                  }`}
                >
                  Plano {plan}
                </button>
              ))}
            </div>
          </div>

          {/* TOGGLES DE RECONHECIMENTO INSTITUCIONAL (COM VALIDAÇÃO DE ELEGIBILIDADE) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-stone-700">
              2. Camada de Reconhecimentos Elegíveis para o Plano {selectedPlan.toUpperCase()}:
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
              <label
                className={`flex items-center gap-2 p-2 rounded-xl border ${
                  canBusinessReceiveRecognition(selectedPlan, 'pedra_fundamental')
                    ? 'bg-stone-50 border-stone-200 cursor-pointer'
                    : 'bg-stone-100 border-stone-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!canBusinessReceiveRecognition(selectedPlan, 'pedra_fundamental')}
                  checked={canBusinessReceiveRecognition(selectedPlan, 'pedra_fundamental') && hasPedraFundamental}
                  onChange={(e) => setHasPedraFundamental(e.target.checked)}
                  className="accent-[#C9A227]"
                />
                <span>Pedra Fundamental {selectedPlan !== 'ouro' && '(Exclusivo Ouro)'}</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2 rounded-xl border ${
                  canBusinessReceiveRecognition(selectedPlan, 'empresa_fundadora')
                    ? 'bg-stone-50 border-stone-200 cursor-pointer'
                    : 'bg-stone-100 border-stone-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!canBusinessReceiveRecognition(selectedPlan, 'empresa_fundadora')}
                  checked={canBusinessReceiveRecognition(selectedPlan, 'empresa_fundadora') && hasFundadora}
                  onChange={(e) => setHasFundadora(e.target.checked)}
                  className="accent-[#C9A227]"
                />
                <span>Empresa Fundadora</span>
              </label>

              <label
                className={`flex items-center gap-2 p-2 rounded-xl border ${
                  canBusinessReceiveRecognition(selectedPlan, 'coluna_de_honra')
                    ? 'bg-stone-50 border-stone-200 cursor-pointer'
                    : 'bg-stone-100 border-stone-200 opacity-50 cursor-not-allowed'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={!canBusinessReceiveRecognition(selectedPlan, 'coluna_de_honra')}
                  checked={canBusinessReceiveRecognition(selectedPlan, 'coluna_de_honra') && hasColunaHonra}
                  onChange={(e) => setHasColunaHonra(e.target.checked)}
                  className="accent-[#C9A227]"
                />
                <span>Coluna de Honra {selectedPlan !== 'ouro' && '(Exclusivo Ouro)'}</span>
              </label>

              <label className="flex items-center gap-2 p-2 bg-stone-50 border border-stone-200 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVerificada}
                  onChange={(e) => setHasVerificada(e.target.checked)}
                  className="accent-[#C9A227]"
                />
                <span>Empresa Verificada</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA DE RENDERIZAÇÃO REAL DO TEMPLATE + RECONHECIMENTOS */}
      <div className="bg-stone-900 rounded-3xl p-6 border border-stone-800 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-wider">
            Resultado Visual: Plano {selectedPlan.toUpperCase()} + Reconhecimentos Ativos
          </span>

          <RecognitionPresentation
            isPedraFundamental={hasPedraFundamental}
            isFounder={hasFundadora}
            isColunaDeHonra={hasColunaHonra}
            isVerified={hasVerificada}
            variant="compact"
          />
        </div>

        {/* COMPOSIÇÃO INDEPENDENTE DE RECONHECIMENTO SOBRE O PERFIL */}
        <div className="bg-[#FDFBF7] rounded-2xl p-4 overflow-hidden border border-stone-700 text-stone-900">
          <RecognitionPresentation
            isPedraFundamental={hasPedraFundamental}
            isFounder={hasFundadora}
            isColunaDeHonra={hasColunaHonra}
            isVerified={hasVerificada}
            variant="full"
            className="mb-4"
          />

          <BusinessProfileRenderer business={simulatedBusiness as any} />
        </div>
      </div>
    </div>
  );
}
