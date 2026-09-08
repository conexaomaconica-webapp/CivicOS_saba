'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, QrCode, CheckCircle2, ShieldCheck, Copy, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { processPixCheckoutAction, processCreditCardCheckoutAction, getPlanPaymentRulesAction, PlanPaymentRules } from '@/lib/payment/payment-service';

type CheckoutPaymentProps = {
  userEmail: string;
  businessId?: string;
  planCode?: string;
};

export default function CheckoutPaymentClient({
  userEmail,
  businessId = 'business-draft-1',
  planCode = 'prata',
}: CheckoutPaymentProps) {
  const router = useRouter();
  const [method, setMethod] = useState<'pix' | 'credit_card'>('pix');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);

  // Regras de Parcelamento do Servidor
  const [planRules, setPlanRules] = useState<PlanPaymentRules | null>(null);
  const [selectedInstallments, setSelectedInstallments] = useState(1);

  // Estado PIX gerado
  const [pixResult, setPixResult] = useState<{
    pixCopiaECola: string;
    qrCodeBase64?: string;
    amountCents: number;
    status: string;
  } | null>(null);

  // Estado Cartão de Crédito
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCcv, setCardCcv] = useState('');
  const [cardCpfCnpj, setCardCpfCnpj] = useState('');

  // Carrega regras do plano no servidor
  useEffect(() => {
    async function loadRules() {
      const rules = await getPlanPaymentRulesAction(planCode);
      setPlanRules(rules);
      void generatePix(rules);
    }
    void loadRules();
  }, [planCode]);

  // Função para gerar PIX via Server Action
  const generatePix = async (rules?: PlanPaymentRules) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await processPixCheckoutAction({
        businessId,
        planCode,
        customerName: 'Anunciante Conexão Maçônica',
        customerEmail: userEmail,
      });

      if (res.success) {
        setPixResult({
          pixCopiaECola: res.pixCopiaECola,
          qrCodeBase64: res.qrCodeBase64,
          amountCents: res.amountCents || rules?.amountCents || 178800,
          status: res.status,
        });
      } else {
        setErrorMsg(res.error || 'Erro ao gerar QR Code PIX.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Falha de comunicação ao gerar PIX.');
    } finally {
      setLoading(false);
    }
  };

  // Processamento do Cartão no Backend
  const handleProcessCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setStatusMsg(null);

    const [expiryMonth, expiryYear] = cardExpiry.split('/').map((s) => s.trim());

    try {
      const res = await processCreditCardCheckoutAction({
        businessId,
        planCode,
        installmentCount: selectedInstallments,
        customerName: cardHolder || 'Anunciante Conexão Maçônica',
        customerEmail: userEmail,
        card: {
          holderName: cardHolder,
          cardNumber: cardNumber.replace(/\s/g, ''),
          expiryMonth: expiryMonth || '12',
          expiryYear: expiryYear || '30',
          ccv: cardCcv,
          cpfCnpj: cardCpfCnpj,
        },
      });

      if (res.success) {
        setStatusMsg(`Transação autorizada com sucesso em ${res.installmentCount}x! Redirecionando para seu painel...`);
        setTimeout(() => {
          router.push('/anunciante');
        }, 1500);
      } else {
        setErrorMsg(res.error || 'Transação não autorizada. Verifique os dados do cartão.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao processar cobrança em cartão.');
    } finally {
      setLoading(false);
    }
  };

  // Copia chave PIX
  const handleCopyPix = () => {
    if (pixResult?.pixCopiaECola) {
      navigator.clipboard.writeText(pixResult.pixCopiaECola);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    }
  };

  const amountFormatted = (
    ((pixResult?.amountCents || planRules?.amountCents || 178800) / 100)
  ).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const maxInstallments = planRules?.installmentsMax || 6;
  const planAmountCents = planRules?.amountCents || 178800;

  return (
    <div className="space-y-6">
      {/* Seleção do Método de Pagamento */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMethod('pix')}
          className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
            method === 'pix'
              ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-md'
              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
          }`}
        >
          <QrCode className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold">PIX Instantâneo</span>
        </button>

        <button
          type="button"
          onClick={() => setMethod('credit_card')}
          className={`p-4 rounded-xl border flex items-center justify-center gap-3 transition-all cursor-pointer ${
            method === 'credit_card'
              ? 'bg-amber-950/40 border-amber-500 text-amber-300 shadow-md'
              : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
          }`}
        >
          <CreditCard className="w-5 h-5 text-amber-400" />
          <span className="text-xs font-bold">Cartão de Crédito</span>
        </button>
      </div>

      {/* Caixa do Método Selecionado */}
      <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 space-y-5">
        {/* VIEW 1: PIX INSTANTÂNEO */}
        {method === 'pix' && (
          <div className="space-y-4 text-center">
            <div className="space-y-1">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Total da Anuidade / Assinatura
              </span>
              <p className="text-2xl font-serif font-bold text-white">{amountFormatted}</p>
            </div>

            {pixResult?.qrCodeBase64 ? (
              <img
                src={`data:image/png;base64,${pixResult.qrCodeBase64}`}
                alt="QR Code PIX Asaas"
                className="w-40 h-40 mx-auto border-2 border-amber-500/40 rounded-xl bg-white p-2 shadow-md"
              />
            ) : (
              <div className="w-40 h-40 bg-stone-900 border border-amber-500/30 rounded-xl mx-auto flex flex-col items-center justify-center p-3 text-amber-300 font-mono text-[10px] space-y-2">
                <QrCode className="w-10 h-10 text-amber-400 animate-pulse" />
                <span>[ QR CODE PIX REAL ]</span>
              </div>
            )}

            <div className="space-y-2 max-w-md mx-auto">
              <p className="text-xs text-stone-400">
                Chave Copia e Cola gerada pelo gateway Asaas:
              </p>
              <div className="flex items-center gap-2 bg-stone-900 border border-stone-700 rounded-xl p-2 font-mono text-[11px] text-amber-200">
                <span className="truncate flex-1 px-2">{pixResult?.pixCopiaECola || 'Gerando chave...'}</span>
                <button
                  type="button"
                  onClick={handleCopyPix}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedPix ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => router.push('/anunciar/passo-7')}
                className="w-full py-3.5 mt-4 rounded-xl bg-gradient-to-r from-[#3B0B14] to-[#4B161B] hover:from-[#520f1c] text-[#C9A227] font-bold text-xs border border-[#C9A227]/60 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <span>Avançar para Leitura e Assinatura do Contrato (Passo 7)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: CARTÃO DE CRÉDITO PARCELADO */}
        {method === 'credit_card' && (
          <form onSubmit={(e) => void handleProcessCreditCard(e)} className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Processamento Seguro no Backend
              </span>
              <span className="text-xs text-stone-400 font-serif font-bold">
                Valor Total: {amountFormatted}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Titular */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-300">Nome impresso no Cartão</label>
                <input
                  type="text"
                  required
                  placeholder="EX: EDUARDO P SABA"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  className="w-full bg-stone-900 text-white text-xs rounded-xl p-2.5 border border-stone-700 outline-none focus:border-amber-500"
                />
              </div>

              {/* CPF / CNPJ do Titular */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-300">CPF ou CNPJ do Titular</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={cardCpfCnpj}
                  onChange={(e) => setCardCpfCnpj(e.target.value)}
                  className="w-full bg-stone-900 text-white text-xs rounded-xl p-2.5 border border-stone-700 outline-none focus:border-amber-500"
                />
              </div>

              {/* Número do Cartão */}
              <div className="space-y-1 md:col-span-2">
                <label className="text-[11px] font-semibold text-stone-300">Número do Cartão de Crédito</label>
                <input
                  type="text"
                  required
                  placeholder="0000 0000 0000 0000"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full bg-stone-900 text-white text-xs rounded-xl p-2.5 border border-stone-700 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Validade */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-300">Validade (MM/AA)</label>
                <input
                  type="text"
                  required
                  placeholder="12/30"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  className="w-full bg-stone-900 text-white text-xs rounded-xl p-2.5 border border-stone-700 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* CVV */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-stone-300">CVV (Cód. Segurança)</label>
                <input
                  type="password"
                  required
                  maxLength={4}
                  placeholder="123"
                  value={cardCcv}
                  onChange={(e) => setCardCcv(e.target.value)}
                  className="w-full bg-stone-900 text-white text-xs rounded-xl p-2.5 border border-stone-700 outline-none focus:border-amber-500 font-mono"
                />
              </div>

              {/* Seleção de Parcelas com Regra do Servidor */}
              <div className="space-y-1 md:col-span-2 pt-1">
                <label className="text-[11px] font-semibold text-amber-300">
                  Opções de Parcelamento Sem Juros (Plano {planCode.toUpperCase()})
                </label>
                <select
                  value={selectedInstallments}
                  onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                  className="w-full bg-stone-900 text-amber-200 text-xs font-semibold rounded-xl p-2.5 border border-amber-800/60 outline-none cursor-pointer"
                >
                  {Array.from({ length: maxInstallments }, (_, i) => i + 1).map((n) => {
                    const val = (planAmountCents / 100 / n).toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    });
                    return (
                      <option key={n} value={n}>
                        {n}x de {val} sem juros {n === 1 ? '(À vista)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#3B0B14] to-[#4B161B] hover:from-[#520f1c] text-[#C9A227] font-bold text-xs border border-[#C9A227]/60 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-3"
            >
              <span>Avançar para Leitura e Assinatura do Contrato (Passo 7)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {statusMsg && (
          <div className="p-6 bg-[#3B0B14] border border-[#C9A227]/40 rounded-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-serif font-bold text-white">Contratação Concluída com Sucesso!</h3>

            <div className="space-y-2 text-xs text-stone-300 max-w-md mx-auto bg-[#1f0509] p-4 rounded-xl border border-stone-800">
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span>Pagamento confirmado</span>
                <span className="font-bold text-emerald-400">✓ Ativo</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span>Contrato assinado (SHA-256)</span>
                <span className="font-bold text-emerald-400">✓ Congelado</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-stone-800">
                <span>Cadastro da empresa</span>
                <span className="font-bold text-emerald-400">✓ Recebido</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span>Status Editorial</span>
                <span className="font-bold text-[#C9A227]">Aguardando Análise</span>
              </div>
            </div>

            <p className="text-xs text-stone-300 max-w-md mx-auto">
              Seu cadastro será analisado antes da publicação no Guia Comercial. Você pode acompanhar o andamento e completar suas mídias diretamente pelo Portal do Anunciante.
            </p>

            <button
              type="button"
              onClick={() => router.push('/anunciante')}
              className="px-6 py-3 bg-[#C9A227] hover:bg-[#D9B237] text-[#1f0509] font-extrabold text-xs rounded-xl transition-all shadow-lg cursor-pointer"
            >
              Ir para meu painel
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-950/60 border border-red-800 rounded-xl text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Badge de Autoridade do Webhook & Segurança */}
      <div className="p-4 bg-stone-900/60 border border-stone-800 rounded-xl text-xs text-stone-400 flex items-center gap-3">
        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
        <span>
          <strong>Segurança &amp; Privacidade</strong>: Os dados do cartão são enviados ao processador de pagamentos e não são armazenados pela Conexão Maçônica.
        </span>
      </div>
    </div>
  );
}
