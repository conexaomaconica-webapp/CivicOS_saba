'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  PenTool,
  RotateCcw,
  CheckCircle2,
  Lock,
  CreditCard,
  AlertCircle,
  UserCheck,
  QrCode,
  Copy,
  CheckCheck,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  signPublicContractAction,
  type PublicContractDetailsResult,
  type SignPublicContractResult,
} from '@/lib/contracts/admin-contracts-service';
import { createCommercialOnboardingChargeAction } from '@/lib/payment/commercial-onboarding-charge-service';
import { checkCommercialPaymentStatusAction } from '@/lib/payment/commercial-onboarding-webhook-service';
import { formatCpfCnpj, validateCpf } from '@/lib/onboarding/onboarding-validation';

interface ContractSignatureClientProps {
  token: string;
  contractData: NonNullable<PublicContractDetailsResult['data']>;
}

export function ContractSignatureClient({
  token,
  contractData,
}: ContractSignatureClientProps) {
  const isAlreadySigned =
    contractData.contract_status === 'signed' || Boolean(contractData.signature_image_data);

  const [signedState, setSignedState] = useState<SignPublicContractResult['data'] | null>(
    isAlreadySigned
      ? {
          contract_id: contractData.contract_id,
          snapshot_id: contractData.snapshot_id,
          commercial_status: 'contrato_assinado',
          accepted_at: contractData.accepted_at || contractData.created_at,
          signer_cpf: contractData.signer_cpf || contractData.responsavel_cpf || '',
          business_name: contractData.business_name,
          plan_name: contractData.plan_name || 'Plano Comercial',
          amount_cents: contractData.amount_cents || 0,
          formatted_amount: contractData.formatted_amount || 'R$ 0,00',
          billing_cycle: contractData.billing_cycle || 'Anual (12 meses)',
          payment_method: contractData.payment_method || 'À vista',
          installments_count: contractData.installments_count || 1,
          payment_token: contractData.payment_token,
        }
      : null
  );

  // 5.1 — Confirmação de Identidade e Aceite
  const [signerCpf, setSignerCpf] = useState(
    contractData.responsavel_cpf ? contractData.responsavel_cpf.replace(/\D/g, '') : ''
  );
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [cpfError, setCpfError] = useState<string | null>(null);

  // 5.2 — Canvas de Assinatura
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);

  // Estado da submissão da assinatura
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // 6.2 — Jornada Real de Pagamento Pós-Assinatura
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>(
    contractData.active_charge?.payment_method === 'credit_card' ? 'credit_card' : 'pix'
  );
  const [activeCharge, setActiveCharge] = useState<any>(contractData.active_charge || null);
  const [isGeneratingCharge, setIsGeneratingCharge] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [copiedPixFeedback, setCopiedPixFeedback] = useState(false);

  // Formulário do Cartão de Crédito
  const maxAllowedInstallments = contractData.installments_count || 1;
  const [cardHolderName, setCardHolderName] = useState(contractData.responsavel_nome || '');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiryMonth, setCardExpiryMonth] = useState('12');
  const [cardExpiryYear, setCardExpiryYear] = useState('2028');
  const [cardCcv, setCardCcv] = useState('');
  const [selectedInstallments, setSelectedInstallments] = useState(maxAllowedInstallments);

  const effectivePaymentToken = signedState?.payment_token || contractData.payment_token || token;
  const [isPaymentConfirmed, setIsPaymentConfirmed] = useState(
    contractData.commercial_status === 'pagamento_confirmado'
  );

  // Microetapa 6.3: Polling seguro para detecção de liquidação em tempo real via Webhook Asaas
  useEffect(() => {
    if (!signedState || isPaymentConfirmed) return;

    let isMounted = true;
    const interval = setInterval(async () => {
      try {
        const res = await checkCommercialPaymentStatusAction(effectivePaymentToken);
        if (res.success && res.is_confirmed && isMounted) {
          setIsPaymentConfirmed(true);
        }
      } catch (_pollErr) {}
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [signedState, isPaymentConfirmed, effectivePaymentToken]);

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setSignerCpf(raw);
    if (cpfError) {
      setCpfError(null);
    }
  };

  const handleCpfBlur = () => {
    if (signerCpf.length > 0) {
      const err = validateCpf(signerCpf);
      setCpfError(err);
    }
  };

  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_e) {}
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    setIsDrawing(true);
    setLastPos({ x, y });
    setSubmitError(null);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.beginPath();
    ctx.moveTo(lastPos.x, lastPos.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#1c1917';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    setLastPos({ x, y });
    setHasDrawn(true);
  };

  const stopDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPos(null);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (_e) {}
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSubmitError(null);
  };

  const handleSignContract = async () => {
    setSubmitError(null);

    // Validação 1: Aceite dos termos
    if (!agreeTerms) {
      setSubmitError('Você deve declarar ciência e concordar expressamente com os termos do contrato.');
      return;
    }

    // Validação 2: CPF
    const err = validateCpf(signerCpf);
    if (err) {
      setCpfError(err);
      setSubmitError(err);
      return;
    }

    // Validação 3: Canvas preenchido
    if (!hasDrawn || !canvasRef.current) {
      setSubmitError('Por favor, desenhe sua assinatura no campo indicado antes de prosseguir.');
      return;
    }

    const signatureImageData = canvasRef.current.toDataURL('image/png');
    if (!signatureImageData || signatureImageData.length < 200) {
      setSubmitError('Assinatura vazia ou inválida. Desenhe sua assinatura no quadro.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await signPublicContractAction({
        token,
        signer_cpf: signerCpf,
        agree_terms: agreeTerms,
        signature_image_data: signatureImageData,
      });

      if (!res.success || !res.data) {
        setSubmitError(res.error || 'Falha ao processar assinatura eletrônica.');
      } else {
        setSignedState(res.data);
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Erro inesperado ao registrar assinatura eletrônica.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6.2: Geração de Cobrança PIX (Idempotente)
  const handleGeneratePixCharge = async () => {
    if (activeCharge?.pix_copia_e_cola) return;

    setIsGeneratingCharge(true);
    setChargeError(null);

    try {
      const res = await createCommercialOnboardingChargeAction({
        token: effectivePaymentToken,
        payment_method: 'pix',
      });

      if (!res.success || !res.data) {
        setChargeError(res.error || 'Falha ao gerar cobrança PIX. Tente novamente.');
      } else {
        setActiveCharge(res.data);
      }
    } catch (err: any) {
      setChargeError(err?.message || 'Erro inesperado ao conectar com o serviço de pagamentos.');
    } finally {
      setIsGeneratingCharge(false);
    }
  };

  // 6.2: Pagamento com Cartão de Crédito
  const handlePayCreditCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargeError(null);

    const cleanNumber = cardNumber.replace(/\D/g, '');
    if (cleanNumber.length < 13 || cleanNumber.length > 19) {
      setChargeError('Número de cartão de crédito inválido.');
      return;
    }

    if (!cardHolderName.trim()) {
      setChargeError('Informe o nome do titular exatamente como impresso no cartão.');
      return;
    }

    if (!cardCcv.trim() || cardCcv.length < 3) {
      setChargeError('Código de segurança (CCV) inválido.');
      return;
    }

    setIsGeneratingCharge(true);

    try {
      const res = await createCommercialOnboardingChargeAction({
        token: effectivePaymentToken,
        payment_method: 'credit_card',
        credit_card: {
          holderName: cardHolderName.trim(),
          cardNumber: cleanNumber,
          expiryMonth: cardExpiryMonth,
          expiryYear: cardExpiryYear,
          ccv: cardCcv.trim(),
          cpfCnpj: contractData.responsavel_cpf?.replace(/\D/g, '') || contractData.cnpj?.replace(/\D/g, '') || '',
          installments: Math.min(selectedInstallments, maxAllowedInstallments),
        },
      });

      if (!res.success || !res.data) {
        setChargeError(res.error || 'Falha na aprovação do pagamento com cartão de crédito.');
      } else {
        setActiveCharge(res.data);
      }
    } catch (err: any) {
      setChargeError(err?.message || 'Erro inesperado ao processar cartão de crédito.');
    } finally {
      setIsGeneratingCharge(false);
    }
  };

  const handleCopyPix = async () => {
    if (!activeCharge?.pix_copia_e_cola) return;
    try {
      await navigator.clipboard.writeText(activeCharge.pix_copia_e_cola);
      setCopiedPixFeedback(true);
      setTimeout(() => setCopiedPixFeedback(false), 2500);
    } catch (_e) {}
  };

  // 5.5 + 6.2 — Tela Pós-Assinatura com Jornada Real de Pagamento
  if (signedState) {
    const formattedSignedDate = signedState.accepted_at
      ? new Date(signedState.accepted_at).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleString('pt-BR');

    const totalCents = signedState.amount_cents || contractData.amount_cents || 0;
    const installmentsCount = contractData.installments_count || 1;

    return (
      <section className="rounded-2xl border-2 border-emerald-500 bg-white p-6 sm:p-10 shadow-lg space-y-8 animate-in fade-in zoom-in-95">
        {/* Topo: Sucesso na Assinatura */}
        <div className="flex flex-col items-center text-center space-y-3 pb-6 border-b border-stone-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-xs">
            <CheckCircle2 className="h-9 w-9 text-emerald-600" />
          </div>
          <div className="space-y-1">
            <span className="text-[11px] font-bold tracking-widest text-emerald-800 uppercase block">
              Formalização Eletrônica Concluída
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
              Contrato assinado com sucesso ✓
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 max-w-lg mx-auto">
              Seu aceite e assinatura foram registrados com carimbo de data/hora oficial, dados do signatário e resumo criptográfico SHA-256.
            </p>
          </div>
        </div>

        {/* Resumo da Contratação (Dados Congelados) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[11px] font-medium text-stone-500 block">Plano Selecionado</span>
            <strong className="text-base font-bold text-stone-900 block">
              {signedState.plan_name}
            </strong>
            <span className="text-[11px] text-stone-500 block">
              Vigência: {signedState.billing_cycle}
            </span>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[11px] font-medium text-stone-500 block">Valor Contratado</span>
            <strong className="text-base font-bold text-emerald-700 block">
              {signedState.formatted_amount}
            </strong>
            <span className="text-[11px] text-stone-500 block">
              Congelado via Snapshot Oficial
            </span>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-1">
            <span className="text-[11px] font-medium text-stone-500 block">Condição de Pagamento</span>
            <strong className="text-base font-bold text-stone-900 block">
              {signedState.payment_method === 'Parcelado'
                ? `Até ${signedState.installments_count}x de ${(totalCents / 100 / (signedState.installments_count || 1)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
                : `À vista (${signedState.billing_cycle})`}
            </strong>
            <span className="text-[11px] text-stone-500 block">
              {signedState.billing_cycle}
            </span>
          </div>
        </div>

        {/* Detalhes Probatórios */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs space-y-2">
          <div className="flex items-center gap-2 text-emerald-950 font-bold">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            <span>Evidências Probatórias do Instrumento</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-stone-700 pt-1">
            <div>
              <span className="text-stone-500 block text-[11px]">Signatário:</span>
              <span className="font-semibold text-stone-900">{contractData.responsavel_nome}</span>
            </div>
            <div>
              <span className="text-stone-500 block text-[11px]">CPF Informado:</span>
              <span className="font-mono font-semibold text-stone-900">
                {formatCpfCnpj(signedState.signer_cpf)}
              </span>
            </div>
            <div>
              <span className="text-stone-500 block text-[11px]">Data / Hora UTC:</span>
              <span className="font-semibold text-stone-900">{formattedSignedDate}</span>
            </div>
          </div>
        </div>

        {/* 6.3: Transição Dinâmica pós-Webhook: Aguardando Pagamento -> Pagamento Confirmado */}
        {isPaymentConfirmed ? (
          <div className="rounded-2xl border-2 border-emerald-300 bg-linear-to-b from-emerald-50/90 to-white p-8 sm:p-10 shadow-sm text-center space-y-6 animate-in fade-in">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-inner">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            <div className="space-y-2 max-w-lg mx-auto">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                Pagamento Confirmado ✓
              </span>
              <h3 className="font-serif text-2xl font-bold text-stone-900">
                Contrato Formalizado e Pagamento Recebido!
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                A compensação financeira da sua contratação foi registrada com sucesso junto ao gateway. Sua adesão está formalizada no ecossistema Conexão Maçônica.
              </p>
            </div>

            <div className="mx-auto max-w-md rounded-xl border border-emerald-200 bg-white p-5 text-left space-y-2.5 text-xs shadow-xs">
              <div className="flex justify-between items-center text-stone-600">
                <span>Empresa Contratante:</span>
                <strong className="text-stone-900">{contractData.business_name}</strong>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>Plano Adesão:</span>
                <strong className="text-stone-900">{contractData.plan_name || 'Conexão Maçônica'}</strong>
              </div>
              <div className="flex justify-between items-center text-stone-600">
                <span>Valor Contratado:</span>
                <strong className="text-stone-900">{signedState?.formatted_amount || contractData.formatted_amount}</strong>
              </div>
              <div className="flex justify-between items-center border-t border-stone-100 pt-2 text-stone-600">
                <span>Status Atual:</span>
                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCheck className="h-4 w-4" />
                  Pagamento Confirmado
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-amber-50/80 p-4 border border-amber-200 text-xs text-amber-900 max-w-md mx-auto leading-relaxed">
              <strong>Próxima etapa:</strong> A equipe do Conexão Maçônica liberará o <strong>Prontuário 360</strong> para que você preencha a ficha cadastral completa, fotos, canais de contato e regras de benefícios aos irmãos.
            </div>
          </div>
        ) : (
        /* 6.2: Jornada Real de Pagamento da Contratação */
        <div className="rounded-2xl border-2 border-stone-300 bg-stone-50/70 p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-200 pb-4">
            <div className="space-y-1">
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Etapa Financeira
              </span>
              <h3 className="font-serif text-xl font-bold text-stone-900">
                Pagamento da Contratação
              </h3>
              <p className="text-xs text-stone-600">
                Escolha o meio de pagamento para concluir a adesão ao Guia Comercial.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-stone-200/80 px-3 py-1 text-xs font-semibold text-stone-800 self-start sm:self-auto">
              <Lock className="h-3.5 w-3.5 text-stone-600" />
              Ambiente Criptografado Asaas
            </div>
          </div>

          {chargeError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{chargeError}</span>
            </div>
          )}

          {/* Seletor de Método de Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod('pix');
                if (!activeCharge?.pix_copia_e_cola) {
                  handleGeneratePixCharge();
                }
              }}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition cursor-pointer text-left ${
                paymentMethod === 'pix'
                  ? 'border-[#3B0B14] bg-white shadow-xs'
                  : 'border-stone-200 bg-stone-100/60 hover:bg-white text-stone-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  paymentMethod === 'pix' ? 'bg-[#3B0B14] text-white' : 'bg-stone-200 text-stone-600'
                }`}>
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <strong className="text-sm font-bold text-stone-900 block">PIX</strong>
                  <span className="text-[11px] text-stone-500">Liquidação e aprovação instantânea</span>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-bold">
                Recomendado
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('credit_card')}
              className={`flex items-center justify-between p-4 rounded-xl border-2 transition cursor-pointer text-left ${
                paymentMethod === 'credit_card'
                  ? 'border-[#3B0B14] bg-white shadow-xs'
                  : 'border-stone-200 bg-stone-100/60 hover:bg-white text-stone-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                  paymentMethod === 'credit_card' ? 'bg-[#3B0B14] text-white' : 'bg-stone-200 text-stone-600'
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <strong className="text-sm font-bold text-stone-900 block">Cartão de Crédito</strong>
                  <span className="text-[11px] text-stone-500">
                    Parcelamento em até {installmentsCount}x sem juros
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Conteúdo da Aba PIX */}
          {paymentMethod === 'pix' && (
            <div className="rounded-xl border border-stone-200 bg-white p-6 space-y-6">
              {!activeCharge?.pix_copia_e_cola && !isGeneratingCharge && (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-stone-100 text-[#3B0B14]">
                    <QrCode className="h-7 w-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif font-bold text-base text-stone-900">
                      Pague via Pix no valor de {signedState.formatted_amount}
                    </h4>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      Clique no botão abaixo para gerar o QR Code oficial e o código Copia e Cola.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGeneratePixCharge}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#3B0B14] hover:bg-[#2A080E] text-white px-6 py-3 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Gerar Código Pix</span>
                  </button>
                </div>
              )}

              {isGeneratingCharge && (
                <div className="text-center py-10 space-y-3">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-3 border-[#3B0B14] border-t-transparent" />
                  <p className="text-xs font-medium text-stone-600">
                    Conectando com o gateway Asaas e gerando chave PIX segura...
                  </p>
                </div>
              )}

              {activeCharge?.pix_copia_e_cola && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    <div className="flex items-center gap-2 font-bold">
                      <Clock className="h-4 w-4 text-amber-700 animate-spin" />
                      <span>Status da Cobrança: Aguardando pagamento</span>
                    </div>
                    <span className="font-mono text-xs font-semibold">
                      {signedState.formatted_amount}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row items-center gap-6">
                    {/* Imagem do QR Code */}
                    <div className="shrink-0 flex flex-col items-center p-3 rounded-2xl border border-stone-200 bg-stone-50">
                      {activeCharge.qr_code_base64 ? (
                        <img
                          src={activeCharge.qr_code_base64.startsWith('data:')
                            ? activeCharge.qr_code_base64
                            : `data:image/png;base64,${activeCharge.qr_code_base64}`}
                          alt="QR Code Pix"
                          className="h-44 w-44 rounded-lg bg-white p-1"
                        />
                      ) : (
                        <div className="flex h-44 w-44 items-center justify-center rounded-lg bg-stone-200 text-stone-400">
                          <QrCode className="h-12 w-12" />
                        </div>
                      )}
                      <span className="text-[10px] text-stone-500 font-semibold mt-2">
                        Aponte a câmera do aplicativo do seu banco
                      </span>
                    </div>

                    {/* Pix Copia e Cola */}
                    <div className="flex-1 space-y-2 w-full">
                      <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                        Código Pix Copia e Cola
                      </label>
                      <div className="relative">
                        <textarea
                          readOnly
                          rows={3}
                          value={activeCharge.pix_copia_e_cola}
                          className="w-full rounded-xl border border-stone-300 bg-stone-50/80 p-3 font-mono text-[11px] text-stone-800 select-all focus:outline-none resize-none"
                        />
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={handleCopyPix}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#3B0B14] hover:bg-[#2A080E] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          {copiedPixFeedback ? (
                            <>
                              <CheckCheck className="h-4 w-4 text-emerald-400" />
                              <span>Copiado com sucesso!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4" />
                              <span>Copiar código Pix</span>
                            </>
                          )}
                        </button>
                        <span className="text-[11px] text-stone-400">Validade: 3 dias</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-50/80 p-3.5 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                    <strong>Aviso importante:</strong> Após a confirmação do pagamento, esta página será atualizada automaticamente e seu prontuário será liberado para configuração.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Conteúdo da Aba Cartão de Crédito */}
          {paymentMethod === 'credit_card' && (
            <form onSubmit={handlePayCreditCard} className="rounded-xl border border-stone-200 bg-white p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                <span className="text-xs font-bold text-stone-800">
                  Dados do Cartão de Crédito
                </span>
                <span className="text-xs font-bold text-emerald-700">
                  Total: {signedState.formatted_amount}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                    Nome Impresso no Cartão *
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value.toUpperCase())}
                    placeholder="COMO IMPRESSO NO CARTÃO"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 uppercase focus:outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                    Número do Cartão *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 16);
                      setCardNumber(digits.replace(/(\d{4})(?=\d)/g, '$1 '));
                    }}
                    placeholder="0000 0000 0000 0000"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                    Validade (Mês / Ano) *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={cardExpiryMonth}
                      onChange={(e) => setCardExpiryMonth(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 focus:outline-none"
                    >
                      {Array.from({ length: 12 }, (_, i) => {
                        const m = (i + 1).toString().padStart(2, '0');
                        return <option key={m} value={m}>{m}</option>;
                      })}
                    </select>
                    <select
                      value={cardExpiryYear}
                      onChange={(e) => setCardExpiryYear(e.target.value)}
                      className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs text-stone-900 focus:outline-none"
                    >
                      {Array.from({ length: 11 }, (_, i) => {
                        const y = (2026 + i).toString();
                        return <option key={y} value={y}>{y}</option>;
                      })}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                    Código de Segurança (CCV) *
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={4}
                    value={cardCcv}
                    onChange={(e) => setCardCcv(e.target.value.replace(/\D/g, ''))}
                    placeholder="123"
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#3B0B14]"
                  />
                </div>

                {/* Seletor Estrito de Parcelas (Máximo congelado em business_commercial_terms) */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
                    Opções de Parcelamento Permitidas
                  </label>
                  <select
                    value={selectedInstallments}
                    onChange={(e) => setSelectedInstallments(Number(e.target.value))}
                    className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-xs text-stone-900 focus:outline-none font-medium"
                  >
                    {Array.from({ length: maxAllowedInstallments }, (_, i) => {
                      const count = i + 1;
                      const instValue = (totalCents / 100 / count).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      });
                      return (
                        <option key={count} value={count}>
                          {count === 1 ? `1x de ${instValue} (À vista)` : `${count}x de ${instValue} sem juros`}
                        </option>
                      );
                    })}
                  </select>
                  <p className="text-[11px] text-stone-400">
                    Condição negociada e congelada no contrato (máximo de {maxAllowedInstallments}x).
                  </p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-stone-100">
                <span className="text-[11px] text-stone-500 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-stone-400" />
                  Transação segura com tokenização direta Asaas
                </span>
                <button
                  type="submit"
                  disabled={isGeneratingCharge}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#3B0B14] hover:bg-[#2A080E] text-white px-6 py-3 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingCharge ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Processando cobrança...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Confirmar Pagamento no Cartão</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
        )}
      </section>
    );
  }

  // Formulário de Assinatura (5.1 + 5.2)
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-10 shadow-xs space-y-6">
      <div className="border-b border-stone-200 pb-4 space-y-1">
        <div className="flex items-center gap-2">
          <PenTool className="h-5 w-5 text-[#3B0B14]" />
          <h2 className="font-serif text-xl font-bold text-stone-900">
            Assinatura Eletrônica do Contrato
          </h2>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          Confirme a identificação do signatário, declare ciência expressa dos termos e desenhe sua assinatura no quadro abaixo.
        </p>
      </div>

      {submitError && (
        <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{submitError}</span>
        </div>
      )}

      {/* 5.1 — Identificação do Signatário */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
            Nome do Representante Legal
          </label>
          <div className="relative">
            <input
              type="text"
              readOnly
              value={contractData.responsavel_nome}
              className="w-full rounded-xl border border-stone-200 bg-stone-100 px-3.5 py-2.5 text-xs text-stone-700 cursor-not-allowed"
            />
            <UserCheck className="absolute right-3 top-2.5 h-4 w-4 text-stone-400" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="signer-cpf" className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
            CPF do Signatário *
          </label>
          <input
            id="signer-cpf"
            type="text"
            value={formatCpfCnpj(signerCpf)}
            onChange={handleCpfChange}
            onBlur={handleCpfBlur}
            placeholder="000.000.000-00"
            maxLength={14}
            className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs text-stone-900 focus:outline-none focus:ring-2 ${
              cpfError
                ? 'border-rose-300 focus:ring-rose-400 bg-rose-50/50'
                : 'border-stone-300 focus:ring-[#3B0B14] bg-white'
            }`}
          />
          {cpfError && (
            <p className="text-[11px] text-rose-600 flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {cpfError}
            </p>
          )}
        </div>
      </div>

      {/* Checkbox de Aceite Expresso */}
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 transition-colors">
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => {
              setAgreeTerms(e.target.checked);
              if (submitError) setSubmitError(null);
            }}
            className="mt-0.5 h-4 w-4 rounded border-stone-300 text-[#3B0B14] focus:ring-[#3B0B14] cursor-pointer"
          />
          <div className="text-xs text-stone-800 space-y-0.5">
            <span className="font-bold block">
              Li o contrato e concordo expressamente com seus termos e condições *
            </span>
            <span className="text-[11px] text-stone-500 block">
              Declaro sob as penas da lei que possuo poderes legais de representação da contratante para formalizar esta adesão comercial.
            </span>
          </div>
        </label>
      </div>

      {/* 5.2 — Canvas de Assinatura */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-stone-700 uppercase tracking-wider block">
            Quadro de Assinatura (Dedo, Caneta ou Mouse) *
          </label>
          {hasDrawn && (
            <button
              type="button"
              onClick={clearSignature}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-stone-500 hover:text-stone-800 transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar assinatura
            </button>
          )}
        </div>

        <div className="relative rounded-2xl border-2 border-dashed border-stone-300 bg-stone-50/70 overflow-hidden hover:border-stone-400 transition">
          <canvas
            ref={canvasRef}
            width={720}
            height={220}
            onPointerDown={startDrawing}
            onPointerMove={draw}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            className="w-full h-[200px] touch-none cursor-crosshair bg-white"
          />

          {!hasDrawn && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <PenTool className="h-6 w-6 text-stone-300 mb-1" />
              <span className="text-xs font-medium text-stone-400">
                Desenhe sua assinatura aqui
              </span>
              <span className="text-[10px] text-stone-300">
                Suporta toque na tela em celulares e tablets ou mouse no computador
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Botões de Ação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-stone-200">
        <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>Integridade do documento verificada por SHA-256</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {hasDrawn && (
            <button
              type="button"
              onClick={clearSignature}
              disabled={isSubmitting}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 px-4 py-3 text-xs font-bold transition shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </button>
          )}

          <button
            type="button"
            onClick={handleSignContract}
            disabled={isSubmitting || !agreeTerms || !hasDrawn}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3 text-xs font-bold transition shadow-sm cursor-pointer ${
              isSubmitting || !agreeTerms || !hasDrawn
                ? 'bg-stone-300 text-stone-500 cursor-not-allowed'
                : 'bg-[#3B0B14] hover:bg-[#2A080E] text-white'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Processando assinatura...</span>
              </>
            ) : (
              <>
                <PenTool className="h-4 w-4" />
                <span>Assinar contrato</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
