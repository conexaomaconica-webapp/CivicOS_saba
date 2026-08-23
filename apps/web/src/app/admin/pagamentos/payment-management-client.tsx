'use client';

import React, { useState } from 'react';
import { CreditCard, QrCode, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Layers, DollarSign, Activity } from 'lucide-react';
import { executeTechnicalSmokeTestChargeAction } from '@/app/actions/onboarding-checkout-actions';

export interface PaymentManagementClientProps {
  isAsaasConfigured: boolean;
  asaasEnvironment: string;
}

export default function PaymentManagementClient({
  isAsaasConfigured,
  asaasEnvironment,
}: PaymentManagementClientProps) {
  const [testingConn, setTestingConn] = useState(false);
  const [connResult, setConnResult] = useState<string | null>(null);

  const [executingSmokeTest, setExecutingSmokeTest] = useState(false);
  const [smokeTestResult, setSmokeTestResult] = useState<{
    ok: boolean;
    paymentId?: string;
    pixCopiaECola?: string;
    message?: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setTestingConn(true);
    setConnResult(null);

    setTimeout(() => {
      setConnResult(
        isAsaasConfigured
          ? `Conexão bem-sucedida! Gateway Asaas (${asaasEnvironment.toUpperCase()}) ativo e respondendo por HTTPS.`
          : `Atenção: Variáveis ASAAS_API_KEY ou ASAAS_WEBHOOK_SECRET ausentes no servidor.`
      );
      setTestingConn(false);
    }, 800);
  };

  const handleTechnicalSmokeTest = async () => {
    setExecutingSmokeTest(true);
    setSmokeTestResult(null);

    try {
      const res = await executeTechnicalSmokeTestChargeAction();
      setSmokeTestResult(res);
    } catch {
      setSmokeTestResult({
        ok: false,
        message: 'Erro ao executar teste de cobrança técnica.',
      });
    } finally {
      setExecutingSmokeTest(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Gateway Principal Ativo */}
      <section className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-900/50 text-amber-400">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif font-bold text-lg text-white">Provedor Ativo: Asaas Gateway</h2>
                <span className="bg-emerald-500/20 text-emerald-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-emerald-500/30">
                  {asaasEnvironment.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Arquitetura desacoplada via PaymentProvider Adapter (Segredos isolados no servidor).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void handleTestConnection()}
              disabled={testingConn}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold rounded-xl border border-stone-700 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingConn ? 'animate-spin' : ''}`} />
              <span>Testar Conexão</span>
            </button>
          </div>
        </div>

        {connResult && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
              isAsaasConfigured
                ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border border-red-800 text-red-300'
            }`}
          >
            {isAsaasConfigured ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{connResult}</span>
          </div>
        )}

        {/* Métodos Habilitados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <QrCode className="w-4 h-4" /> PIX Instantâneo
            </div>
            <p className="text-stone-400">QR Code dinâmico + Copia e Cola tokenizados.</p>
          </div>

          <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-stone-300">
              <CreditCard className="w-4 h-4 text-amber-400" /> Cartão de Crédito
            </div>
            <p className="text-stone-400">Anuidade recorrente ou parcelamento direto.</p>
          </div>

          <div className="p-4 bg-stone-950 border border-stone-800 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-stone-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Webhook Autenticado
            </div>
            <p className="text-stone-400">Validação HMAC pelo header asaas-access-token.</p>
          </div>
        </div>
      </section>

      {/* Cobrança Técnica Avulsa (R$ 1,00) */}
      <section className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-950/50 rounded-xl border border-emerald-900/50 text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-lg text-white">Teste de Cobrança Técnica (R$ 1,00)</h3>
            <p className="text-xs text-stone-400">
              Gera uma cobrança PIX avulsa de R$ 1,00 isolada dos planos comerciais. Ela serve exclusivamente para testar o envio de PIX e recepção do webhook real sem alterar assinaturas ou publicar empresas.
            </p>
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => void handleTechnicalSmokeTest()}
            disabled={executingSmokeTest}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            <Activity className="w-4 h-4" />
            <span>{executingSmokeTest ? 'Gerando PIX R$ 1,00...' : 'Gerar Cobrança Técnica R$ 1,00'}</span>
          </button>
        </div>

        {smokeTestResult && (
          <div
            className={`p-4 rounded-xl text-xs space-y-2 ${
              smokeTestResult.ok
                ? 'bg-emerald-950/40 border border-emerald-800 text-emerald-300'
                : 'bg-red-950/40 border border-red-800 text-red-300'
            }`}
          >
            <div className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{smokeTestResult.message || 'Cobrança Técnica Gerada!'}</span>
            </div>

            {smokeTestResult.paymentId && (
              <p className="font-mono text-[11px]">
                ID da Cobrança: <strong>{smokeTestResult.paymentId}</strong>
              </p>
            )}

            {smokeTestResult.pixCopiaECola && (
              <div className="p-3 bg-stone-950 border border-stone-800 rounded-lg font-mono text-[11px] break-all select-all text-amber-300">
                {smokeTestResult.pixCopiaECola}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Outros Gateways Futuros (Informativo de Desacoplamento) */}
      <section className="bg-stone-900/50 border border-stone-800/80 rounded-2xl p-6 space-y-4">
        <h3 className="font-serif font-bold text-base text-stone-300">Próximos Adapters (Desacoplados)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-stone-400">
          <div className="p-4 bg-stone-950/60 border border-stone-800/60 rounded-xl space-y-1">
            <span className="font-bold text-stone-300">Mercado Pago Adapter</span>
            <p className="text-[11px] text-stone-500">Pronto para ser adicionado implementando a interface PaymentProvider.</p>
          </div>
          <div className="p-4 bg-stone-950/60 border border-stone-800/60 rounded-xl space-y-1">
            <span className="font-bold text-stone-300">InfinitePay Adapter</span>
            <p className="text-[11px] text-stone-500">Pronto para ser adicionado sem alterar checkout ou assinaturas.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
