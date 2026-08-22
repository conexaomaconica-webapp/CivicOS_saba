'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, QrCode, FileText, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { confirmPaymentWebhookSimulationAction } from '@/app/actions/onboarding-checkout-actions';

export default function CheckoutPaymentClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<'pix' | 'credit_card' | 'boleto'>('pix');
  const [simulatingWebhook, setSimulatingWebhook] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSimulateWebhookPayment = async () => {
    setSimulatingWebhook(true);
    setStatusMsg('Aguardando confirmação do gateway Asaas via Webhook...');

    try {
      // Simula confirmação transacional do Asaas webhook
      const res = await confirmPaymentWebhookSimulationAction(
        'mock-business-id',
        'prata',
        'payment_confirmed',
        'asaas'
      );

      if (res.ok) {
        setStatusMsg('Pagamento confirmado via Webhook Asaas! Ativando assinatura...');
        setTimeout(() => {
          router.push('/anunciante');
        }, 1200);
      } else {
        setStatusMsg('Aguardando processamento transacional...');
        setSimulatingWebhook(false);
      }
    } catch {
      setStatusMsg('Erro ao aguardar webhook. Tente novamente.');
      setSimulatingWebhook(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Método de Pagamento */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setMethod('pix')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
            method === 'pix'
              ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-md'
              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
          }`}
        >
          <QrCode className="w-6 h-6" />
          <span className="text-xs font-bold">PIX Instantâneo</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('credit_card')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
            method === 'credit_card'
              ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-md'
              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
          }`}
        >
          <CreditCard className="w-6 h-6" />
          <span className="text-xs font-bold">Cartão de Crédito</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('boleto')}
          className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${
            method === 'boleto'
              ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-md'
              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
          }`}
        >
          <FileText className="w-6 h-6" />
          <span className="text-xs font-bold">Boleto Bancário</span>
        </button>
      </div>

      {/* Caixa do Método Selecionado */}
      <div className="bg-stone-950 border border-stone-800 rounded-xl p-5 text-center space-y-4">
        {method === 'pix' && (
          <div className="space-y-3">
            <div className="w-32 h-32 bg-stone-900 border border-stone-700 rounded-xl mx-auto flex items-center justify-center text-amber-400 font-mono text-xs font-bold">
              [ QR CODE PIX ]
            </div>
            <p className="text-xs text-stone-400">
              Chave Copia e Cola gerada pelo Asaas. Após a transferência PIX, o webhook notificará o servidor instantaneamente.
            </p>
          </div>
        )}

        {method === 'credit_card' && (
          <div className="text-xs text-stone-400 space-y-2">
            <p>Formulário seguro de Cartão de Crédito tokenizado pelo Asaas SDK.</p>
            <p className="text-stone-500">Cobrança recorrente mensal ou anuidade parcelada.</p>
          </div>
        )}

        {method === 'boleto' && (
          <div className="text-xs text-stone-400 space-y-2">
            <p>Linha digitável do Boleto bancário com vencimento em 3 dias úteis.</p>
            <p className="text-stone-500">Compensação bancária notificada via Webhook Asaas.</p>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={() => void handleSimulateWebhookPayment()}
            disabled={simulatingWebhook}
            className="w-full max-w-md mx-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
          >
            {simulatingWebhook ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Processando Webhook Asaas...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Simular Confirmação do Gateway Asaas</span>
              </>
            )}
          </button>
        </div>

        {statusMsg && (
          <p className="text-xs text-amber-300 font-semibold animate-pulse">{statusMsg}</p>
        )}
      </div>

      <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl text-xs text-stone-400 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
        <span>
          O frontend nunca ativa o plano apenas pelo retorno de tela. A alteração para estado <strong className="text-amber-300">active</strong> exige evento de webhook assinado e idempotente.
        </span>
      </div>
    </div>
  );
}
