'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ShieldCheck,
  FileSignature,
  CreditCard,
  CheckCircle2,
  Lock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  BadgeCheck,
  Eraser,
} from 'lucide-react';
import {
  signContractInOnboardingSessionAction,
  processCheckoutInOnboardingSessionAction,
} from '@/lib/onboarding/onboarding-link-service';

interface AdesaoJourneyProps {
  session: {
    token: string;
    expiresAt: string;
    business: {
      id: string;
      name: string;
      slug: string;
      cnpjCpf: string;
      ownerName: string;
      masonicLodge: string;
      planCode: string;
      planName: string;
      commercialStatus: string;
    };
    offer: {
      planCode: string;
      planName: string;
      billingCycle: string;
      priceUpfront: number;
      priceInstallmentsTotal: number;
      installmentsCount: number;
      installmentValue: number;
      formattedUpfront: string;
      formattedInstallmentsTotal: string;
      formattedInstallmentValue: string;
      summaryText: string;
    };
    contract?: {
      id: string;
      status: string;
      signedAt?: string;
      sha256Hash?: string;
      signedByName?: string;
    } | null;
  };
}

export function AdesaoJourneyClient({ session }: AdesaoJourneyProps) {
  const router = useRouter();
  const { business, offer, token } = session;

  // Initial step determination based on contract/status
  const initialStep = session.contract?.status === 'signed' || business.commercialStatus === 'contrato_assinado'
    ? 3
    : 1;

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'upfront' | 'installments'>('upfront');
  
  // Step 2 Signature State
  const [signerName, setSignerName] = useState(business.ownerName || '');
  const [signerCpf, setSignerCpf] = useState(business.cnpjCpf || '');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  // Canvas Pad Drawing State
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    setHasDrawnSignature(true);
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e && e.touches[0] ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : ('clientX' in e ? e.clientX : 0);
    const clientY = touch ? touch.clientY : ('clientY' in e ? e.clientY : 0);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = 'touches' in e && e.touches[0] ? e.touches[0] : null;
    const clientX = touch ? touch.clientX : ('clientX' in e ? e.clientX : 0);
    const clientY = touch ? touch.clientY : ('clientY' in e ? e.clientY : 0);
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    ctx.strokeStyle = '#F59E0B'; // amber stroke
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawnSignature(false);
  };

  // Step 3 Checkout State
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(
    business.commercialStatus === 'pagamento_confirmado' ||
    business.commercialStatus === 'pagina_em_preparacao' ||
    business.commercialStatus === 'em_revisao' ||
    business.commercialStatus === 'publicado'
  );

  const contractText = `
CONTRATO DE ADESÃO E PRESTAÇÃO DE SERVIÇOS DE DIVULGAÇÃO
CONEXÃO MAÇÔNICA (CIVICOS SABA)

1. DAS PARTES
CONTRATANTE: ${business.name} (CNPJ/CPF: ${business.cnpjCpf || 'Não informado'}), representada por ${signerName || business.ownerName}.
CONTRATADA: Conexão Maçônica - Plataforma de Negócios e Serviços Maçônicos SABA.

2. DO OBJETO
O presente instrumento tem por objeto a concessão de licença de uso do Guia de Negócios Conexão Maçônica para a publicação da página da empresa CONTRATANTE, sob o Plano ${offer.planName.toUpperCase()}.

3. DAS CONDIÇÕES COMERCIAIS
- Plano Selecionado: ${offer.planName}
- Condição Escolhida: ${selectedPaymentMode === 'upfront' ? `À vista por ${offer.formattedUpfront}` : `${offer.installmentsCount}x de ${offer.formattedInstallmentValue} (Total: ${offer.formattedInstallmentsTotal})`}
- Vigência: 12 (doze) meses a contar da data de publicação oficial.

4. DA ELEGIBILIDADE E PRIVACIDADE MAÇÔNICA
A CONTRATANTE declara expressamente o seu vínculo com a Família Maçônica (Loja: ${business.masonicLodge || 'Informada em cadastro'}) e concorda com as diretrizes institucionais do ecossistema.

5. DA ASSINATURA DIGITAL E VALIDADE JURÍDICA
As partes reconhecem a validade e a integridade da assinatura eletrônica realizada nesta plataforma, acompanhada de hash criptográfico SHA-256 e registro auditável de data e IP.
  `.trim();

  const handleSignContract = async () => {
    if (!signerName.trim()) {
      setSignatureError('Por favor, informe o nome completo do signatário.');
      return;
    }
    if (!hasDrawnSignature) {
      setSignatureError('Por favor, desenhe sua assinatura no quadro abaixo antes de prosseguir.');
      return;
    }
    if (!acceptedTerms) {
      setSignatureError('É necessário aceitar os termos do contrato para prosseguir.');
      return;
    }

    setSignatureError(null);
    setIsSigning(true);

    const signatureImageData = canvasRef.current ? canvasRef.current.toDataURL('image/png') : undefined;

    try {
      const res = await signContractInOnboardingSessionAction({
        token,
        signerName,
        signerCpf,
        paymentConditionChoice: selectedPaymentMode,
        contractText,
        signatureImageData,
      });

      if (!res.success) {
        setSignatureError(res.error || 'Erro ao assinar contrato.');
        return;
      }

      setCurrentStep(3);
    } catch (err: any) {
      setSignatureError(err.message || 'Erro inesperado ao assinar contrato.');
    } finally {
      setIsSigning(false);
    }
  };

  const handleProcessPayment = async () => {
    setPaymentError(null);
    setIsProcessingPayment(true);

    try {
      const res = await processCheckoutInOnboardingSessionAction({
        token,
        paymentMethod,
        paymentConditionChoice: selectedPaymentMode,
      });

      if (!res.success) {
        setPaymentError(res.error || 'Erro ao processar pagamento.');
        return;
      }

      setPaymentSuccess(true);
      router.refresh();
    } catch (err: any) {
      setPaymentError(err.message || 'Erro ao finalizar checkout.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
              CM
            </div>
            <div>
              <h1 className="font-semibold text-lg text-slate-100 leading-tight">
                Conexão Maçônica
              </h1>
              <p className="text-xs text-slate-400">Jornada Unificada de Adesão Empresarial</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Link Individual Seguro</span>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Progress Stepper Bar */}
        <div className="mb-10">
          <div className="grid grid-cols-3 gap-2 relative">
            {/* Step 1 Pill */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                currentStep === 1
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/5'
                  : currentStep > 1
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep > 1
                    ? 'bg-emerald-500 text-slate-950'
                    : currentStep === 1
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-semibold">Revisão de Dados</p>
                <p className="text-[10px] opacity-75">Empresa & Plano</p>
              </div>
            </div>

            {/* Step 2 Pill */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                currentStep === 2
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/5'
                  : currentStep > 2
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep > 2
                    ? 'bg-emerald-500 text-slate-950'
                    : currentStep === 2
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-semibold">Contrato Digital</p>
                <p className="text-[10px] opacity-75">Leitura e Assinatura</p>
              </div>
            </div>

            {/* Step 3 Pill */}
            <div
              className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                currentStep === 3
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 shadow-lg shadow-amber-500/5'
                  : paymentSuccess
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  paymentSuccess
                    ? 'bg-emerald-500 text-slate-950'
                    : currentStep === 3
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {paymentSuccess ? <CheckCircle2 className="w-4 h-4" /> : '3'}
              </div>
              <div className="hidden sm:block text-xs">
                <p className="font-semibold">Checkout</p>
                <p className="text-[10px] opacity-75">Pagamento & Ativação</p>
              </div>
            </div>
          </div>
        </div>

        {/* STEP 1: REVISÃO DE DADOS DA EMPRESA E DO PLANO */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Etapa 1 — Conferência dos Dados e da Proposta</h2>
                  <p className="text-sm text-slate-400">Confirme as informações antes de abrir o contrato digital.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Dados da Empresa */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-amber-400" />
                    Dados do Anunciante
                  </h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <div>
                      <span className="text-slate-500 text-xs block">Razão Social / Empresa</span>
                      <span className="font-medium text-slate-100">{business.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">CNPJ / CPF</span>
                      <span className="font-mono text-slate-200">{business.cnpjCpf || 'Pendente'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">Responsável</span>
                      <span>{business.ownerName || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-xs block">Família Maçônica / Loja</span>
                      <span className="text-amber-400/90 font-medium">{business.masonicLodge || 'Verificada'}</span>
                    </div>
                  </div>
                </div>

                {/* Plano e Condição Comercial */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    Plano Escolhido
                  </h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-amber-300">{offer.planName}</span>
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-500/30">
                        Vigência Anual
                      </span>
                    </div>

                    {/* Selector de Condição de Pagamento */}
                    <div className="pt-3 space-y-2">
                      <span className="text-xs text-slate-400 block font-medium">Selecione a Condição de Pagamento:</span>
                      
                      <label
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedPaymentMode === 'upfront'
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_mode"
                            checked={selectedPaymentMode === 'upfront'}
                            onChange={() => setSelectedPaymentMode('upfront')}
                            className="text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-semibold text-sm block text-slate-100">À Vista</span>
                            <span className="text-xs text-slate-400">Economia no pagamento único</span>
                          </div>
                        </div>
                        <span className="font-bold text-base text-emerald-400">{offer.formattedUpfront}</span>
                      </label>

                      <label
                        className={`p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                          selectedPaymentMode === 'installments'
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_mode"
                            checked={selectedPaymentMode === 'installments'}
                            onChange={() => setSelectedPaymentMode('installments')}
                            className="text-amber-500 focus:ring-amber-500"
                          />
                          <div>
                            <span className="font-semibold text-sm block text-slate-100">Parcelado sem juros</span>
                            <span className="text-xs text-slate-400">{offer.installmentsCount} parcelas mensais</span>
                          </div>
                        </div>
                        <span className="font-bold text-base text-slate-200">
                          {offer.installmentsCount}x de {offer.formattedInstallmentValue}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02]"
                >
                  <span>Conferido, Gerar Contrato Digital</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: LEITURA E ASSINATURA DO CONTRATO DIGITAL */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Etapa 2 — Leitura e Assinatura Digital do Contrato</h2>
                  <p className="text-sm text-slate-400">Leia a minuta oficial e assine digitalmente para liberar o checkout.</p>
                </div>
              </div>

              {/* Minuta em Scroll Box */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 mb-6 max-h-72 overflow-y-auto text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed shadow-inner">
                {contractText}
              </div>

              {/* Form de Assinatura */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-5 space-y-4 mb-6">
                <h3 className="text-sm font-semibold text-slate-200">Confirmação de Assinatura</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Nome Completo do Signatário *</label>
                    <input
                      type="text"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="Ex: João da Silva"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">CPF ou CNPJ do Signatário</label>
                    <input
                      type="text"
                      value={signerCpf}
                      onChange={(e) => setSignerCpf(e.target.value)}
                      placeholder="Ex: 000.000.000-00"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Canvas Signature Pad */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300 font-semibold block">
                      Desenhe sua Assinatura na caixa abaixo (com o dedo ou mouse) *
                    </label>
                    <button
                      type="button"
                      onClick={clearCanvas}
                      className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg transition-all"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Limpar Assinatura</span>
                    </button>
                  </div>

                  <div className="relative border-2 border-dashed border-slate-700 hover:border-amber-500/60 rounded-xl bg-slate-900/90 overflow-hidden touch-none">
                    <canvas
                      ref={canvasRef}
                      width={600}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-36 cursor-crosshair block"
                    />
                    {!hasDrawnSignature && (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs pointer-events-none">
                        Clique/Toque e desenhe aqui sua assinatura
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="accept_terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <label htmlFor="accept_terms" className="text-xs text-slate-300 cursor-pointer">
                    Declaro que li e concordo com os termos do contrato de adesão, autorizando a publicação da empresa no Guia Maçônico após confirmação do pagamento.
                  </label>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Integridade Verificada — SHA-256 (snapshot jurídico assinado e auditável)</span>
                </div>
              </div>

              {signatureError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{signatureError}</span>
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="text-xs text-slate-400 hover:text-slate-200 py-2 px-3"
                >
                  ← Voltar para Revisão
                </button>

                <button
                  onClick={handleSignContract}
                  disabled={isSigning}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] disabled:opacity-50"
                >
                  {isSigning ? (
                    <span>Registrando Assinatura...</span>
                  ) : (
                    <>
                      <span>Assinar e Ir para Checkout</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CHECKOUT E CONFIRMAÇÃO DE PAGAMENTO */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-400">
                  <CreditCard className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-100">Etapa 3 — Checkout & Ativação Comercial</h2>
                  <p className="text-sm text-slate-400">
                    Contrato assinado com sucesso! Realize o pagamento para iniciar a revisão da página.
                  </p>
                </div>
              </div>

              {/* Status Box Contrato Assinado */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="text-xs font-semibold text-emerald-300 block">Contrato Digital Assinado</span>
                    <span className="text-[11px] text-slate-400">
                      Signatário: {session.contract?.signedByName || signerName || business.ownerName}
                    </span>
                  </div>
                </div>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full font-mono">
                  SHA-256 ok
                </span>
              </div>

              {!paymentSuccess ? (
                <div className="space-y-6">
                  {/* Resumo Financeiro */}
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-5">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                      Resumo do Pagamento
                    </h3>
                    <div className="flex items-center justify-between text-slate-200 text-sm py-2 border-b border-slate-800">
                      <span>Plano {offer.planName} ({selectedPaymentMode === 'upfront' ? 'À vista' : 'Parcelado'})</span>
                      <span className="font-bold text-amber-400">
                        {selectedPaymentMode === 'upfront'
                          ? offer.formattedUpfront
                          : `${offer.installmentsCount}x de ${offer.formattedInstallmentValue}`}
                      </span>
                    </div>
                  </div>

                  {/* Seleção de Método de Pagamento */}
                  <div className="space-y-3">
                    <label className="text-xs text-slate-400 block font-medium">Escolha a Forma de Pagamento:</label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('pix')}
                        className={`p-4 rounded-xl border flex items-center gap-3 text-left transition-all ${
                          paymentMethod === 'pix'
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs">
                          PIX
                        </div>
                        <div>
                          <span className="font-semibold text-sm block text-slate-100">PIX Instantâneo</span>
                          <span className="text-[11px] text-slate-400">Aprovação imediata</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('credit_card')}
                        className={`p-4 rounded-xl border flex items-center gap-3 text-left transition-all ${
                          paymentMethod === 'credit_card'
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-200'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-400'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
                          CC
                        </div>
                        <div>
                          <span className="font-semibold text-sm block text-slate-100">Cartão de Crédito</span>
                          <span className="text-[11px] text-slate-400">Até {offer.installmentsCount}x sem juros</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {paymentError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{paymentError}</span>
                    </div>
                  )}

                  {/* Primary Checkout Action */}
                  <button
                    onClick={handleProcessPayment}
                    disabled={isProcessingPayment}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] disabled:opacity-50"
                  >
                    {isProcessingPayment ? (
                      <span>Processando Pagamento...</span>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Confirmar Pagamento e Finalizar Adesão</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                /* Payment Success View */
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100">Pagamento Confirmado com Sucesso!</h3>
                    <p className="text-sm text-slate-400 max-w-md mx-auto mt-1">
                      Sua adesão comercial foi concluída. A equipe da Conexão Maçônica foi notificada para revisar e publicar a página da sua empresa.
                    </p>
                  </div>

                  <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={`/guia`}
                      className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold px-5 py-2.5 rounded-xl text-xs border border-slate-700 transition-all"
                    >
                      Ir para o Guia Maçônico
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/40 py-6 text-center text-xs text-slate-500">
        Conexão Maçônica — CivicOS SABA &copy; {new Date().getFullYear()} — Todos os direitos reservados.
      </footer>
    </div>
  );
}
