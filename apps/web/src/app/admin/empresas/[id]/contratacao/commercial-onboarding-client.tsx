'use client';

import React, { useState, useTransition, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  Building2,
  ChevronLeft,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Calendar,
  Sparkles,
  Clock,
  Briefcase,
  AlertCircle,
  AlertTriangle,
  CreditCard,
  FileText,
  RotateCcw,
  Copy,
  CheckCheck,
  X,
  History,
  Ban,
  Send,
  MessageSquare,
  Mail,
  ExternalLink,
  MapPin,
  Search,
  Save,
} from 'lucide-react';
import type { AdminBusiness360DTO } from '@/lib/admin/admin-businesses-service';
import {
  confirmAdminCommercialTermsAction,
  saveAdminBusinessContractAddressAction,
  reconcileMasonicCommercialStatus,
} from '@/lib/admin/admin-businesses-service';
import { formatCentsToReais } from '@/lib/billing/plans-service';
import { MASONIC_ELIGIBILITY_TYPE_LABELS } from '@/lib/masonic/masonic-links-service';
import { COMMERCIAL_STATUS_LABELS } from '@/lib/commercial-onboarding-status';
import {
  getAdminContractDraftPreviewAction,
  generateAdminContractSnapshotAction,
  getAdminContractSnapshotsHistoryAction,
  invalidateAdminContractSnapshotAction,
  sendAdminContractForSignatureAction,
  revokeAdminContractSignatureTokenAction,
  ContractDraftPreviewResult,
  GenerateContractSnapshotResult,
  ContractSnapshotHistoryItem,
  SendContractForSignatureResult,
} from '@/lib/contracts/admin-contracts-service';
import { unlockAdminCommercialDossierAction } from '@/lib/admin/admin-commercial-dossier-service';

interface CommercialOnboardingClientProps {
  dto: AdminBusiness360DTO;
}

const ONBOARDING_STEPS = [
  { step: 1, name: 'Pré-cadastro' },
  { step: 2, name: 'Vínculo maçônico' },
  { step: 3, name: 'Dados comerciais' },
  { step: 4, name: 'Contrato' },
  { step: 5, name: 'Assinatura' },
  { step: 6, name: 'Pagamento' },
  { step: 7, name: 'Prontuário 360' },
  { step: 8, name: 'Publicação' },
];

// Presets comerciais canônicos
interface PlanPreset {
  name: string;
  code: 'bronze' | 'prata' | 'ouro';
  payInFullCents: number;
  installmentTotalCents: number;
  installmentsMax: number;
  installmentValueCents: number;
  tagline: string;
}

const PLAN_PRESETS: Record<'bronze' | 'prata' | 'ouro', PlanPreset> = {
  bronze: {
    name: 'Plano Esquadro',
    code: 'bronze',
    payInFullCents: 60000,
    installmentTotalCents: 63500,
    installmentsMax: 2,
    installmentValueCents: 31750,
    tagline: 'Presença básica no Guia Comercial Oficial',
  },
  prata: {
    name: 'Plano Compasso',
    code: 'prata',
    payInFullCents: 80000,
    installmentTotalCents: 85500,
    installmentsMax: 3,
    installmentValueCents: 28500,
    tagline: 'Destaque no Guia, mídias e canal WhatsApp',
  },
  ouro: {
    name: 'Plano Acácia',
    code: 'ouro',
    payInFullCents: 100000,
    installmentTotalCents: 108000,
    installmentsMax: 4,
    installmentValueCents: 27000,
    tagline: 'Topo das buscas, vídeo e analytics avançado',
  },
};

export default function CommercialOnboardingClient({ dto }: CommercialOnboardingClientProps) {
  const router = useRouter();
  const { business, owner, masonic_link_detail, commercial_terms: savedTerms } = dto;
  const [isPending, startTransition] = useTransition();

  // Normalização do plano inicial
  const initialPlanTier: 'bronze' | 'prata' | 'ouro' = useMemo(() => {
    const raw = savedTerms?.plan_code || business.plan_code || 'bronze';
    if (raw === 'acacia' || raw === 'ouro') return 'ouro';
    if (raw === 'compasso' || raw === 'prata') return 'prata';
    return 'bronze';
  }, [savedTerms, business.plan_code]);

  // Estados locais do formulário de conferência
  const [selectedPlan, setSelectedPlan] = useState<'bronze' | 'prata' | 'ouro'>(initialPlanTier);
  const [isPedraFundamental, setIsPedraFundamental] = useState<boolean>(
    savedTerms ? Boolean(savedTerms.is_pedra_fundamental) : Boolean(business.is_pedra_fundamental)
  );
  const [billingCycle, setBillingCycle] = useState<'annual' | 'biennial'>(
    savedTerms?.billing_cycle || (business.is_pedra_fundamental ? 'biennial' : 'annual')
  );
  const [paymentMethod, setPaymentMethod] = useState<'avista' | 'parcelado'>(
    savedTerms?.payment_method || 'avista'
  );
  const [installmentsCount, setInstallmentsCount] = useState<number>(
    savedTerms?.installments_count || (savedTerms?.payment_method === 'parcelado' ? 2 : 1)
  );
  const [amountCents, setAmountCents] = useState<number>(
    savedTerms?.amount_cents ||
    (isPedraFundamental
      ? (paymentMethod === 'avista' ? 120000 : 130000)
      : (paymentMethod === 'avista' ? PLAN_PRESETS[initialPlanTier].payInFullCents : PLAN_PRESETS[initialPlanTier].installmentTotalCents))
  );
  const [notes, setNotes] = useState<string>(savedTerms?.notes || '');
  const [commercialStatus, setCommercialStatus] = useState<string>(
    masonic_link_detail?.status === 'verified' &&
      ['pre_cadastro', 'vinculo_informado'].includes(business.commercial_status || 'pre_cadastro')
      ? 'vinculo_verificado'
      : business.commercial_status || 'pre_cadastro'
  );
  const [lastSaved, setLastSaved] = useState(savedTerms || null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showFase4Modal, setShowFase4Modal] = useState<boolean>(false);
  const [contractDraft, setContractDraft] = useState<ContractDraftPreviewResult['data'] | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState<boolean>(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [isGeneratingSnapshot, setIsGeneratingSnapshot] = useState<boolean>(false);
  const [generatedSnapshot, setGeneratedSnapshot] = useState<GenerateContractSnapshotResult['data'] | null>(
    dto.contract
      ? {
        contract_id: dto.contract.id,
        snapshot_id: dto.contract.snapshot_id,
        sha256_hash: dto.contract.sha256_hash,
        commercial_status: business.commercial_status || 'contrato_gerado',
        created_at: dto.contract.signed_at || new Date().toISOString(),
      }
      : null
  );

  // Estados para Microetapa 4.3: Versionamento, Invalidação e Histórico de Snapshots
  const [snapshotHistory, setSnapshotHistory] = useState<ContractSnapshotHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [hasPendingChanges, setHasPendingChanges] = useState<boolean>(false);
  const [pendingChangesReason, setPendingChangesReason] = useState<string | null>(null);

  const [showInvalidateModal, setShowInvalidateModal] = useState<boolean>(false);
  const [invalidationReason, setInvalidationReason] = useState<string>('');
  const [isInvalidating, setIsInvalidating] = useState<boolean>(false);
  const [invalidationError, setInvalidationError] = useState<string | null>(null);

  // Estados para Microetapa 4.4: Envio para Assinatura e Token Seguro
  const [signatureTokenData, setSignatureTokenData] = useState<SendContractForSignatureResult['data'] | null>(null);
  const [isSendingForSignature, setIsSendingForSignature] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [copiedLinkFeedback, setCopiedLinkFeedback] = useState<boolean>(false);

  const [showRevokeTokenModal, setShowRevokeTokenModal] = useState<boolean>(false);
  const [revokeTokenReason, setRevokeTokenReason] = useState<string>('');
  const [isRevokingToken, setIsRevokingToken] = useState<boolean>(false);
  const [revokeTokenError, setRevokeTokenError] = useState<string | null>(null);

  // Estados para Endereço da Contratante (Sede / Minuta Contratual)
  const [cep, setCep] = useState<string>(business.postal_code || '');
  const [street, setStreet] = useState<string>(business.street || business.address || '');
  const [number, setNumber] = useState<string>(business.number || '');
  const [complement, setComplement] = useState<string>(business.complement || '');
  const [neighborhood, setNeighborhood] = useState<string>(business.neighborhood || '');
  const [city, setCity] = useState<string>(business.city || '');
  const [state, setState] = useState<string>(business.state || '');
  const [isSearchingCep, setIsSearchingCep] = useState<boolean>(false);
  const [isSavingAddress, setIsSavingAddress] = useState<boolean>(false);
  const [addressFeedback, setAddressFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [addressSavedSuccess, setAddressSavedSuccess] = useState<boolean>(
    Boolean(business.street && business.city && business.state)
  );

  // Estado da data de início do contrato
  const [contractStartDate, setContractStartDate] = useState<string>(
    (savedTerms as any)?.contract_start_date || ''
  );

  const currentFormattedAddress = useMemo(() => {
    const parts: string[] = [];
    if (street.trim()) {
      parts.push(street.trim());
      if (number.trim()) {
        parts.push(`, nº ${number.trim()}`);
      } else {
        parts.push(', s/nº');
      }
      if (complement.trim()) parts.push(` - ${complement.trim()}`);
    }
    if (neighborhood.trim()) parts.push(`, Bairro ${neighborhood.trim()}`);
    if (city.trim()) parts.push(` - ${city.trim()}`);
    if (state.trim()) parts.push(`/${state.trim().toUpperCase()}`);
    if (cep.trim()) parts.push(`, CEP ${cep.trim()}`);
    return parts.join('');
  }, [street, number, complement, neighborhood, city, state, cep]);

  const handleCepSearch = async (cepInput?: string) => {
    const raw = (cepInput !== undefined ? cepInput : cep).replace(/\D/g, '');
    if (raw.length !== 8) {
      setAddressFeedback({ type: 'error', message: 'Informe um CEP válido com 8 dígitos numéricos.' });
      return;
    }

    setIsSearchingCep(true);
    setAddressFeedback(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      if (!res.ok) throw new Error('Serviço de consulta de CEP indisponível no momento.');
      const data = await res.json();
      if (data.erro) {
        setAddressFeedback({ type: 'error', message: 'CEP não localizado na base dos Correios.' });
        return;
      }

      if (data.logradouro) setStreet(data.logradouro);
      if (data.bairro) setNeighborhood(data.bairro);
      if (data.localidade) setCity(data.localidade);
      if (data.uf) setState(data.uf.toUpperCase());
      setAddressFeedback({
        type: 'success',
        message: 'Endereço localizado via CEP! Complete com o número e complemento.',
      });
    } catch (err: any) {
      setAddressFeedback({
        type: 'error',
        message: err?.message || 'Falha ao buscar CEP. Você pode preencher manualmente.',
      });
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length > 8) val = val.slice(0, 8);
    let formatted = val;
    if (val.length > 5) {
      formatted = `${val.slice(0, 5)}-${val.slice(5)}`;
    }
    setCep(formatted);
    setAddressFeedback(null);
    if (val.length === 8) {
      handleCepSearch(val);
    }
  };

  const handleSaveAddressOnly = async () => {
    if (!street.trim() || !city.trim() || !state.trim()) {
      setAddressFeedback({
        type: 'error',
        message: 'Preencha pelo menos Logradouro, Cidade e Estado para salvar o endereço.',
      });
      return;
    }

    setIsSavingAddress(true);
    setAddressFeedback(null);
    try {
      const res = await saveAdminBusinessContractAddressAction({
        business_id: business.id,
        postal_code: cep.trim() || undefined,
        street: street.trim(),
        number: number.trim() || undefined,
        complement: complement.trim() || undefined,
        neighborhood: neighborhood.trim() || undefined,
        city: city.trim(),
        state: state.trim().toUpperCase(),
      });

      if (!res.success) {
        setAddressFeedback({ type: 'error', message: res.error || 'Falha ao salvar endereço.' });
      } else {
        setAddressFeedback({
          type: 'success',
          message: 'Endereço da contratante salvo com sucesso e pronto para o contrato ✓',
        });
        setAddressSavedSuccess(true);
        router.refresh();
      }
    } catch (err: any) {
      setAddressFeedback({ type: 'error', message: err?.message || 'Erro inesperado ao salvar endereço.' });
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Vínculo maçônico verificado
  const isMasonicVerified =
    masonic_link_detail?.status === 'verified' ||
    commercialStatus === 'vinculo_verificado' ||
    commercialStatus === 'dados_comerciais_conferidos' ||
    commercialStatus === 'contrato_gerado' ||
    commercialStatus === 'contrato_enviado' ||
    commercialStatus === 'contrato_assinado';

  // Bloqueio de conferência se vínculo não estiver verificado
  const isBlockedByMasonicLink = !isMasonicVerified;
  const hasMasonicStatusMismatch =
    isMasonicVerified &&
    ['pre_cadastro', 'vinculo_informado'].includes(business.commercial_status || 'pre_cadastro');

  const [isSyncingStatus, setIsSyncingStatus] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const handleSyncMasonicStatus = async () => {
    setIsSyncingStatus(true);
    setSyncError(null);
    try {
      const res = await reconcileMasonicCommercialStatus(business.id);
      if (!res.success) {
        setSyncError(res.error || 'Falha ao sincronizar status.');
        return;
      }
      if (res.commercial_status) setCommercialStatus(res.commercial_status);
      setFeedback({ type: 'success', message: 'Status comercial sincronizado para Vínculo verificado.' });
      router.refresh();
    } catch (err: any) {
      setSyncError(err?.message || 'Erro inesperado ao sincronizar status.');
    } finally {
      setIsSyncingStatus(false);
    }
  };

  // Detecção de alterações em relação ao que foi formalmente gravado
  const isDirty = useMemo(() => {
    if (!lastSaved) return true;
    return (
      selectedPlan !== lastSaved.plan_code ||
      billingCycle !== lastSaved.billing_cycle ||
      paymentMethod !== lastSaved.payment_method ||
      installmentsCount !== lastSaved.installments_count ||
      amountCents !== lastSaved.amount_cents ||
      isPedraFundamental !== lastSaved.is_pedra_fundamental
    );
  }, [lastSaved, selectedPlan, billingCycle, paymentMethod, installmentsCount, amountCents, isPedraFundamental]);

  // Estado conferido ativo, contrato gerado e contrato enviado
  const isConferred = commercialStatus === 'dados_comerciais_conferidos' && !isDirty;
  const isContractGenerated = commercialStatus === 'contrato_gerado';
  const isContractSent = commercialStatus === 'contrato_enviado';
  const canOpenDraft = isConferred || isContractGenerated || isContractSent;

  // Atualização de valores ao mudar plano ou condição
  const handlePlanChange = (plan: 'bronze' | 'prata' | 'ouro') => {
    setSelectedPlan(plan);
    setFeedback(null);
    if (!isPedraFundamental) {
      const preset = PLAN_PRESETS[plan];
      if (paymentMethod === 'avista') {
        setAmountCents(preset.payInFullCents);
      } else {
        setAmountCents(preset.installmentTotalCents);
        if (installmentsCount > preset.installmentsMax) {
          setInstallmentsCount(preset.installmentsMax);
        }
      }
    }
  };

  const handlePedraFundamentalToggle = (checked: boolean) => {
    setIsPedraFundamental(checked);
    setFeedback(null);
    if (checked) {
      setSelectedPlan('ouro');
      setBillingCycle('biennial');
      if (paymentMethod === 'avista') {
        setAmountCents(120000);
      } else {
        setAmountCents(130000);
        setInstallmentsCount(4);
      }
    } else {
      setBillingCycle('annual');
      const preset = PLAN_PRESETS[selectedPlan];
      setAmountCents(paymentMethod === 'avista' ? preset.payInFullCents : preset.installmentTotalCents);
    }
  };

  const handlePaymentMethodChange = (method: 'avista' | 'parcelado') => {
    setPaymentMethod(method);
    setFeedback(null);
    if (isPedraFundamental) {
      if (method === 'avista') {
        setAmountCents(120000);
        setInstallmentsCount(1);
      } else {
        setAmountCents(130000);
        setInstallmentsCount(4);
      }
    } else {
      const preset = PLAN_PRESETS[selectedPlan];
      if (method === 'avista') {
        setAmountCents(preset.payInFullCents);
        setInstallmentsCount(1);
      } else {
        setAmountCents(preset.installmentTotalCents);
        setInstallmentsCount(preset.installmentsMax);
      }
    }
  };

  const maxInstallmentsAllowed = isPedraFundamental ? 4 : PLAN_PRESETS[selectedPlan].installmentsMax;
  const calculatedInstallmentValueCents =
    paymentMethod === 'avista'
      ? amountCents
      : Math.round(amountCents / Math.max(1, installmentsCount));

  // Ação de Conferir Dados Comerciais
  const handleConfirmCommercialTerms = () => {
    setFeedback(null);

    // Validação client-side
    if (amountCents <= 0) {
      setFeedback({ type: 'error', message: 'O valor contratado deve ser maior que zero.' });
      return;
    }

    startTransition(async () => {
      const result = await confirmAdminCommercialTermsAction({
        business_id: business.id,
        plan_code: selectedPlan,
        billing_cycle: billingCycle,
        payment_method: paymentMethod,
        amount_cents: amountCents,
        installments_count: paymentMethod === 'avista' ? 1 : installmentsCount,
        installment_amount_cents: calculatedInstallmentValueCents,
        is_pedra_fundamental: isPedraFundamental,
        notes: notes.trim() || undefined,
        contract_start_date: contractStartDate.trim() || null,
        address:
          street.trim() || cep.trim()
            ? {
              postal_code: cep.trim() || undefined,
              street: street.trim() || undefined,
              number: number.trim() || undefined,
              complement: complement.trim() || undefined,
              neighborhood: neighborhood.trim() || undefined,
              city: city.trim() || undefined,
              state: state.trim().toUpperCase() || undefined,
            }
            : undefined,
      });

      if (!result.success) {
        setFeedback({
          type: 'error',
          message: result.error || 'Falha ao confirmar dados comerciais.',
        });
      } else {
        setCommercialStatus('dados_comerciais_conferidos');
        setAddressSavedSuccess(true);
        setLastSaved({
          id: `terms-${business.id}`,
          plan_code: selectedPlan,
          plan_name: isPedraFundamental
            ? 'Plano Acácia (Pedra Fundamental)'
            : PLAN_PRESETS[selectedPlan].name,
          billing_cycle: billingCycle,
          payment_method: paymentMethod,
          amount_cents: amountCents,
          installments_count: paymentMethod === 'avista' ? 1 : installmentsCount,
          installment_amount_cents: calculatedInstallmentValueCents,
          is_pedra_fundamental: isPedraFundamental,
          notes: notes.trim() || null,
          status: 'conferido',
          conferred_at: new Date().toISOString(),
          conferred_by: null,
        });
        setFeedback({
          type: 'success',
          message: 'Dados comerciais e endereço conferidos e congelados com sucesso ✓',
        });
        router.refresh();
      }
    });
  };

  const handleOpenDraftPreview = async () => {
    setShowFase4Modal(true);
    setIsLoadingDraft(true);
    setDraftError(null);
    try {
      const res = await getAdminContractDraftPreviewAction(
        business.id,
        currentFormattedAddress || undefined
      );
      if (!res.success || !res.data) {
        setDraftError(res.error || 'Não foi possível carregar a minuta do contrato.');
      } else {
        setContractDraft(res.data);
      }
    } catch (err: any) {
      setDraftError(err?.message || 'Falha ao buscar minuta.');
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const loadSnapshotHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getAdminContractSnapshotsHistoryAction(business.id);
      if (res.success && res.data) {
        setSnapshotHistory(res.data.history || []);
        setHasPendingChanges(Boolean(res.data.has_pending_changes));
        setPendingChangesReason(res.data.pending_changes_reason || null);
        if (res.data.active_snapshot) {
          setGeneratedSnapshot({
            contract_id: res.data.active_snapshot.contract_id,
            snapshot_id: res.data.active_snapshot.snapshot_id,
            sha256_hash: res.data.active_snapshot.sha256_hash,
            commercial_status: commercialStatus,
            created_at: res.data.active_snapshot.created_at,
          });
        }
        if (commercialStatus === 'contrato_enviado') {
          sendAdminContractForSignatureAction(business.id).then((tokenRes) => {
            if (tokenRes.success && tokenRes.data) {
              setSignatureTokenData(tokenRes.data);
            }
          });
        }
      }
    } catch (err) {
      console.error('[CommercialOnboardingClient] Erro ao carregar histórico de snapshots:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadSnapshotHistory();
  }, [business.id, commercialStatus]);

  const handleCopyMarkdown = async () => {
    if (!contractDraft?.rendered_markdown) return;
    try {
      await navigator.clipboard.writeText(contractDraft.rendered_markdown);
      setCopiedFeedback(true);
      setTimeout(() => setCopiedFeedback(false), 2500);
    } catch (_e) { }
  };

  const handleGenerateSnapshot = async () => {
    setIsGeneratingSnapshot(true);
    setDraftError(null);
    try {
      const res = await generateAdminContractSnapshotAction(
        business.id,
        currentFormattedAddress || undefined
      );
      if (!res.success || !res.data) {
        setDraftError(res.error || 'Falha ao gerar snapshot do contrato.');
      } else {
        setGeneratedSnapshot(res.data);
        setCommercialStatus('contrato_gerado');
        setFeedback({
          type: 'success',
          message: res.data.already_existed
            ? 'Contrato já gerado previamente para esta empresa. Snapshot recuperado com sucesso ✓'
            : 'Novo contrato congelado com sucesso! Hash SHA-256 gravado no banco de dados ✓',
        });
        await loadSnapshotHistory();
        router.refresh();
      }
    } catch (err: any) {
      setDraftError(err?.message || 'Erro inesperado ao gerar snapshot.');
    } finally {
      setIsGeneratingSnapshot(false);
    }
  };

  const handleConfirmInvalidation = async () => {
    const trimmed = invalidationReason.trim();
    if (!trimmed || trimmed.length < 5) {
      setInvalidationError('A justificativa administrativa é obrigatória e deve conter no mínimo 5 caracteres.');
      return;
    }

    setIsInvalidating(true);
    setInvalidationError(null);

    try {
      const res = await invalidateAdminContractSnapshotAction(business.id, trimmed);
      if (!res.success) {
        setInvalidationError(res.error || 'Falha ao invalidar snapshot do contrato.');
        return;
      }

      setCommercialStatus('dados_comerciais_conferidos');
      setShowInvalidateModal(false);
      setInvalidationReason('');
      setFeedback({
        type: 'success',
        message:
          'Snapshot anterior marcado como "Substituído" e preservado no histórico. O status comercial retornou para "Dados Comerciais Conferidos" para nova conferência e regeração ✓',
      });
      await loadSnapshotHistory();
      router.refresh();
    } catch (err: any) {
      setInvalidationError(err?.message || 'Erro inesperado ao invalidar contrato.');
    } finally {
      setIsInvalidating(false);
    }
  };

  const handleSendForSignature = async () => {
    setIsSendingForSignature(true);
    setSendError(null);
    try {
      const res = await sendAdminContractForSignatureAction(business.id);
      if (!res.success || !res.data) {
        setSendError(res.error || 'Falha ao enviar contrato para assinatura.');
      } else {
        setSignatureTokenData(res.data);
        setCommercialStatus('contrato_enviado');
        setFeedback({
          type: 'success',
          message: res.data.already_sent
            ? 'Link de assinatura ativo recuperado com sucesso ✓'
            : 'Contrato enviado para assinatura com sucesso! Token seguro gerado ✓',
        });
        await loadSnapshotHistory();
        router.refresh();
      }
    } catch (err: any) {
      setSendError(err?.message || 'Erro inesperado ao enviar contrato para assinatura.');
    } finally {
      setIsSendingForSignature(false);
    }
  };

  const handleRevokeSignatureToken = async () => {
    const trimmed = revokeTokenReason.trim();
    if (!trimmed || trimmed.length < 5) {
      setRevokeTokenError('A justificativa para revogação é obrigatória (mínimo de 5 caracteres).');
      return;
    }

    setIsRevokingToken(true);
    setRevokeTokenError(null);
    try {
      const res = await revokeAdminContractSignatureTokenAction(business.id, trimmed);
      if (!res.success) {
        setRevokeTokenError(res.error || 'Falha ao revogar link de assinatura.');
        return;
      }

      setCommercialStatus('contrato_gerado');
      setSignatureTokenData(null);
      setShowRevokeTokenModal(false);
      setRevokeTokenReason('');
      setFeedback({
        type: 'success',
        message: 'Link de assinatura revogado com sucesso. Status revertido para "Contrato Gerado" ✓',
      });
      await loadSnapshotHistory();
      router.refresh();
    } catch (err: any) {
      setRevokeTokenError(err?.message || 'Erro inesperado ao revogar link de assinatura.');
    } finally {
      setIsRevokingToken(false);
    }
  };

  const handleCopySignatureLink = async () => {
    if (!signatureTokenData?.public_url) return;
    try {
      await navigator.clipboard.writeText(signatureTokenData.public_url);
      setCopiedLinkFeedback(true);
      setTimeout(() => setCopiedLinkFeedback(false), 2500);
    } catch (_e) { }
  };

  const handleOpenWhatsAppShare = () => {
    if (!signatureTokenData?.public_url) return;
    const name = signatureTokenData.responsavel_nome || business.name;
    const message = `Olá, ${name}.\n\nSeu contrato da Conexão Maçônica está disponível para conferência e assinatura:\n\n${signatureTokenData.public_url}\n\nApós a assinatura, você poderá prosseguir para a etapa de pagamento.`;
    const cleanPhone = signatureTokenData.responsavel_whatsapp?.replace(/\D/g, '') || '';
    const waUrl = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const handleOpenEmailShare = () => {
    if (!signatureTokenData?.public_url) return;
    const name = signatureTokenData.responsavel_nome || business.name;
    const subject = `Contrato de Adesão — ${business.name} | Conexão Maçônica`;
    const body = `Olá, ${name}.\n\nSeu contrato da Conexão Maçônica está disponível para conferência e assinatura eletrônica:\n\n${signatureTokenData.public_url}\n\nO link possui validade de 7 dias.\n\nAtenciosamente,\nEquipe Conexão Maçônica`;
    const mailtoUrl = `mailto:${business.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  // Microetapa 6.4A: Liberação Formal do Prontuário 360 pelo Administrador
  const [isUnlockingDossier, setIsUnlockingDossier] = useState(false);

  const handleUnlockDossier = async () => {
    setIsUnlockingDossier(true);
    setFeedback(null);
    try {
      const res = await unlockAdminCommercialDossierAction(business.id);
      if (res.success && res.commercial_status) {
        setCommercialStatus(res.commercial_status as any);
        setFeedback({
          type: 'success',
          message: 'Prontuário 360 liberado com sucesso! Redirecionando para a configuração...',
        });
        setTimeout(() => {
          router.push(`/admin/empresas/${business.id}`);
        }, 200);
      } else {
        setFeedback({
          type: 'error',
          message: res.error || 'Falha ao liberar Prontuário 360.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err?.message || 'Erro inesperado ao liberar Prontuário 360.',
      });
    } finally {
      setIsUnlockingDossier(false);
    }
  };

  // Informações de Vínculo Maçônico para o resumo
  const rawEligibility = masonic_link_detail?.eligibility_type as
    | keyof typeof MASONIC_ELIGIBILITY_TYPE_LABELS
    | undefined;
  const eligibilityLabel = rawEligibility
    ? MASONIC_ELIGIBILITY_TYPE_LABELS[rawEligibility]
    : 'Não informado';

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/admin/empresas/${business.id}/vinculo-maconico`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Vínculo Maçônico
          </Link>
          <span className="text-xs font-bold tracking-widest text-[#3B0B14] uppercase block">
            Conexão Maçônica · Onboarding Comercial
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Resumo e Contratação Comercial
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isConferred ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-300">
              <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[3]" /> Dados conferidos ✓
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              <Clock className="h-3.5 w-3.5 text-amber-600" /> Etapa atual:{' '}
              {COMMERCIAL_STATUS_LABELS[commercialStatus as keyof typeof COMMERCIAL_STATUS_LABELS] || commercialStatus}
            </span>
          )}
        </div>
      </div>

      {/* Stepper canônico da ativação comercial */}
      <nav aria-label="Progresso do Onboarding" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
          {ONBOARDING_STEPS.map((s) => {
            const currentStepByStatus: Record<string, number> = {
              pre_cadastro: 2,
              vinculo_informado: 2,
              vinculo_verificado: 3,
              dados_comerciais_conferidos: 4,
              contrato_gerado: 5,
              contrato_enviado: 5,
              contrato_assinado: 6,
              aguardando_pagamento: 6,
              pagamento_confirmado: 7,
              prontuario_em_configuracao: 7,
              pronto_para_publicar: 8,
              publicado: 9,
            };
            const currentStep = currentStepByStatus[commercialStatus] || 1;
            const status: 'completed' | 'current' | 'upcoming' =
              s.step < currentStep ? 'completed' : s.step === currentStep ? 'current' : 'upcoming';

            const isCompleted = status === 'completed';
            const isCurrent = status === 'current';

            return (
              <li
                key={s.step}
                className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${isCurrent
                  ? 'bg-[#3B0B14]/10 text-[#3B0B14] font-bold border border-[#3B0B14]/20'
                  : isCompleted
                    ? 'text-emerald-700 bg-emerald-50/70 border border-emerald-200'
                    : 'text-stone-400'
                  }`}
              >
                {isCompleted ? (
                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 stroke-[2.5]" />
                ) : isCurrent ? (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#3B0B14] text-[9px] font-bold text-white">
                    {s.step}
                  </span>
                ) : (
                  <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-stone-300 text-[9px] text-stone-400">
                    {s.step}
                  </span>
                )}
                <span className="truncate">{s.name}</span>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Alertas de Estado e Notificações */}
      {feedback && (
        <div
          className={`flex items-start gap-3 rounded-2xl p-4 text-xs font-medium border ${feedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
        >
          {feedback.type === 'success' ? (
            <Check className="h-5 w-5 shrink-0 text-emerald-600 stroke-[2.5]" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-sm">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Alerta de Erro de Envio para Assinatura */}
      {sendError && (
        <div className="flex items-start gap-3 rounded-2xl p-4 text-xs font-medium border bg-rose-50 border-rose-200 text-rose-900 animate-in fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Falha no Envio para Assinatura</p>
            <p className="mt-0.5 text-xs text-rose-800">{sendError}</p>
          </div>
          <button
            type="button"
            onClick={() => setSendError(null)}
            className="text-rose-500 hover:text-rose-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isBlockedByMasonicLink && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-200 text-amber-950 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Vínculo Maçônico Não Verificado</p>
            <p className="text-amber-800">
              O status atual da empresa é{' '}
              <strong className="font-semibold">
                {COMMERCIAL_STATUS_LABELS[commercialStatus as keyof typeof COMMERCIAL_STATUS_LABELS] || commercialStatus}
              </strong>
              . A conferência comercial exige que o vínculo maçônico esteja verificado antes de avançar.
            </p>
            <div className="pt-2">
              <Link
                href={`/admin/empresas/${business.id}/vinculo-maconico`}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-900 transition"
              >
                Verificar Vínculo Maçônico Agora
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {hasMasonicStatusMismatch && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-300 text-amber-950 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Inconsistência de ativação detectada</p>
            <p className="text-amber-800">
              O vínculo maçônico está <strong className="font-semibold">verificado</strong>, mas o status comercial ainda está em{' '}
              <strong className="font-semibold">
                {COMMERCIAL_STATUS_LABELS[(business.commercial_status || 'pre_cadastro') as keyof typeof COMMERCIAL_STATUS_LABELS] ||
                  business.commercial_status}
              </strong>
              .
            </p>
            {syncError && <p className="text-rose-700 font-semibold">{syncError}</p>}
            <div className="pt-2">
              <button
                id="sync-masonic-commercial-status"
                type="button"
                onClick={handleSyncMasonicStatus}
                disabled={isSyncingStatus}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-900 transition disabled:opacity-60"
              >
                <RotateCcw className={`h-3.5 w-3.5 ${isSyncingStatus ? 'animate-spin' : ''}`} />
                {isSyncingStatus ? 'Sincronizando…' : 'Sincronizar status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {lastSaved && isDirty && commercialStatus === 'dados_comerciais_conferidos' && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 border border-amber-300 text-amber-950 text-xs">
          <RotateCcw className="h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold text-sm text-amber-900">Conferência Desatualizada (Valores Modificados)</p>
            <p className="text-amber-800">
              Os parâmetros comerciais foram alterados em relação à última conferência formal. É necessário clicar em{' '}
              <strong className="font-semibold text-amber-950">“Conferir Dados Comerciais”</strong> para atualizar e
              congelar os novos termos antes de prosseguir para a geração do contrato.
            </p>
          </div>
        </div>
      )}

      {commercialStatus === 'contrato_gerado' ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl bg-amber-50/90 p-4 border border-amber-300 text-amber-950 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-600 text-white shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-amber-950">Contrato gerado e snapshot congelado ✓</p>
              <p className="text-amber-800 text-[11px]">
                Snapshot imutável e hash criptográfico SHA-256 registrados com sucesso (status: <code>draft</code>). Minuta pronta para o envio de assinatura (Fase 4.4).
                {(generatedSnapshot?.created_at || dto.contract?.signed_at) && (
                  <span className="block text-[11px] text-amber-700 mt-0.5">
                    Registrado em: {new Date(generatedSnapshot?.created_at || dto.contract?.signed_at!).toLocaleString('pt-BR')}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenDraftPreview}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-800 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-900 transition shrink-0"
          >
            <FileText className="h-4 w-4" />
            Ver Contrato Gerado
            <ArrowRight className="h-4 w-4 text-white/70" />
          </button>
        </div>
      ) : isConferred && (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50/80 p-4 border border-emerald-200 text-emerald-950 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white">
              <Check className="h-5 w-5 stroke-[3]" />
            </div>
            <div>
              <p className="font-bold text-sm text-emerald-950">Dados comerciais conferidos e congelados ✓</p>
              <p className="text-emerald-800">
                Os termos contratuais foram revisados e estão prontos para a geração da minuta na Fase 4.
                {lastSaved?.conferred_at && (
                  <span className="block text-[11px] text-emerald-700 mt-0.5">
                    Conferido em: {new Date(lastSaved.conferred_at).toLocaleString('pt-BR')}
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOpenDraftPreview}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B0B14] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#2b080f] transition"
          >
            <FileText className="h-4 w-4" />
            Visualizar Minuta (Fase 4)
            <ArrowRight className="h-4 w-4 text-white/70" />
          </button>
        </div>
      )}

      {/* Grid: Empresa + Vínculo Maçônico */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Card 1: Dados da Empresa & Responsável */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="flex items-center gap-2 font-serif text-base font-bold text-stone-900">
              <Building2 className="h-5 w-5 text-[#3B0B14]" />
              Dados da Empresa
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                {business.category || 'Geral'}
              </span>
              <Link
                href={`/admin/empresas/${business.id}`}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3B0B14] hover:underline"
              >
                Editar dados cadastrais
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-stone-400 block font-medium">Nome Fantasia</span>
              <span className="font-bold text-stone-900 text-sm">{business.name}</span>
            </div>

            {business.legal_name && business.legal_name !== business.name && (
              <div>
                <span className="text-stone-400 block font-medium">Razão Social</span>
                <span className="font-medium text-stone-700">{business.legal_name}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-stone-400 block font-medium">CNPJ</span>
                <span className="font-mono font-semibold text-stone-800">
                  {business.cnpj || business.cnpj_cpf || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Localização</span>
                <span className="font-medium text-stone-700">
                  {city || business.city}/{state || business.state}
                </span>
              </div>
            </div>

            {currentFormattedAddress && (
              <div className="pt-1">
                <span className="text-stone-400 block font-medium">Endereço da Sede</span>
                <span className="font-medium text-stone-700 truncate block">
                  {currentFormattedAddress}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
              <div>
                <span className="text-stone-400 block font-medium">Responsável</span>
                <span className="font-semibold text-stone-900">{owner?.full_name || 'Titular'}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">E-mail</span>
                <span className="font-mono text-stone-700 truncate block">{owner?.email || 'Não informado'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Card 2: Vínculo Maçônico Verificado */}
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <h2 className="flex items-center gap-2 font-serif text-base font-bold text-stone-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Vínculo com a Maçonaria
            </h2>
            {isMasonicVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                <Check className="h-3 w-3 text-emerald-600" /> Verificado
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-200">
                <Clock className="h-3 w-3 text-amber-600" /> Pendente
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-stone-400 block font-medium">Modalidade de Elegibilidade</span>
              <span className="font-bold text-stone-900 text-sm">{eligibilityLabel}</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-stone-400 block font-medium">Potência</span>
                <span className="font-semibold text-stone-800">
                  {masonic_link_detail?.potency || 'Não informada'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">Loja Maçônica</span>
                <span className="font-semibold text-stone-800 truncate block">
                  {masonic_link_detail?.lodge_name || 'Não informada'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100">
              <div>
                <span className="text-stone-400 block font-medium">Irmão de Referência</span>
                <span className="font-medium text-stone-800">
                  {masonic_link_detail?.reference_mason_name || owner?.full_name || 'Não informado'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block font-medium">CIM</span>
                <span className="font-mono text-stone-700">
                  {masonic_link_detail?.reference_mason_cim || 'Não informado'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Link
                href={`/admin/empresas/${business.id}/vinculo-maconico`}
                className="text-[11px] font-bold text-[#3B0B14] hover:underline inline-flex items-center gap-1"
              >
                Revisar ou alterar vínculo
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>
      </div>

      {/* Card: Endereço da Contratante (Sede e Minuta Contratual) */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B0B14]/10 text-[#3B0B14]">
              <MapPin className="h-5 w-5 text-[#3B0B14]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-base font-bold text-stone-900">
                  Endereço da Contratante (Sede e Minuta Contratual)
                </h2>
                {street && city && state ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    <Check className="h-3 w-3 text-emerald-600 stroke-[3]" /> Completo
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                    <Clock className="h-3 w-3 text-amber-600" /> Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500">
                Auto-preenchimento via CEP e sincronização automática com a qualificação da Contratante no contrato.
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isSavingAddress}
            onClick={handleSaveAddressOnly}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSavingAddress ? (
              <>
                <Clock className="h-3.5 w-3.5 animate-spin" />
                Salvando...
              </>
            ) : addressSavedSuccess ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400 stroke-[3]" />
                Salvar Endereço
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Salvar Endereço
              </>
            )}
          </button>
        </div>

        {/* Feedback do endereço */}
        {addressFeedback && (
          <div
            className={`flex items-start gap-2.5 rounded-xl p-3 text-xs border ${addressFeedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
          >
            {addressFeedback.type === 'success' ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600 stroke-[2.5]" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            )}
            <p className="flex-1 font-medium">{addressFeedback.message}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-12 text-xs">
          {/* CEP com busca */}
          <div className="sm:col-span-4 space-y-1">
            <label className="block text-[11px] font-semibold text-stone-600">
              CEP (com busca automática)
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={cep}
                onChange={handleCepChange}
                placeholder="00000-000"
                maxLength={9}
                className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-mono font-medium text-stone-900 focus:bg-white focus:border-[#3B0B14] focus:outline-none transition"
              />
              <button
                type="button"
                disabled={isSearchingCep}
                onClick={() => handleCepSearch()}
                title="Consultar CEP nos Correios"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-3 py-2 text-stone-700 hover:bg-stone-100 transition cursor-pointer disabled:opacity-50"
              >
                {isSearchingCep ? (
                  <Clock className="h-3.5 w-3.5 animate-spin text-[#3B0B14]" />
                ) : (
                  <Search className="h-3.5 w-3.5 text-stone-600" />
                )}
              </button>
            </div>
          </div>

          {/* Logradouro */}
          <div className="sm:col-span-6 space-y-1">
            <label className="block text-[11px] font-semibold text-stone-600">
              Logradouro (Rua, Av, Rodovia...)
            </label>
            <input
              type="text"
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                setAddressSavedSuccess(false);
              }}
              placeholder="Ex: Av. Paulista, Rua da Glória..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-medium text-stone-900 focus:bg-white focus:border-[#3B0B14] focus:outline-none transition"
            />
          </div>

          {/* Número */}
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-[11px] font-semibold text-stone-600">
              Número
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => {
                setNumber(e.target.value);
                setAddressSavedSuccess(false);
              }}
              placeholder="Ex: 100 ou S/N"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-medium text-stone-900 focus:bg-white focus:border-[#3B0B14] focus:outline-none transition"
            />
          </div>

          {/* Complemento */}
          <div className="sm:col-span-4 space-y-1">
            <label className="block text-[11px] font-semibold text-stone-600">
              Complemento (Opcional)
            </label>
            <input
              type="text"
              value={complement}
              onChange={(e) => {
                setComplement(e.target.value);
                setAddressSavedSuccess(false);
              }}
              placeholder="Ex: Sala 402, Bloco B..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-medium text-stone-900 focus:bg-white focus:border-[#3B0B14] focus:outline-none transition"
            />
          </div>

          {/* Bairro */}
          <div className="sm:col-span-4 space-y-1">
            <label className="block text-[11px] font-semibold text-stone-600">
              Bairro
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => {
                setNeighborhood(e.target.value);
                setAddressSavedSuccess(false);
              }}
              placeholder="Ex: Centro, Bela Vista..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-medium text-stone-900 focus:bg-white focus:border-[#3B0B14] focus:outline-none transition"
            />
          </div>

          {/* Cidade */}
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-[11px] font-semibold text-stone-600">
              Cidade
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setAddressSavedSuccess(false);
              }}
              placeholder="Ex: São Paulo"
              className="w-full rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-medium text-stone-900 focus:bg-white focus:border-[#3B0B14] focus:outline-none transition"
            />
          </div>

          {/* UF */}
          <div className="sm:col-span-1 space-y-1">
            <label className="block text-[11px] font-semibold text-stone-600">
              UF
            </label>
            <input
              type="text"
              value={state}
              onChange={(e) => {
                setState(e.target.value.toUpperCase());
                setAddressSavedSuccess(false);
              }}
              placeholder="SP"
              maxLength={2}
              className="w-full uppercase rounded-xl border border-stone-200 bg-stone-50/50 px-3 py-2 text-xs font-semibold text-stone-900 focus:bg-white focus:border-[#3B0B14] focus:outline-none transition text-center"
            />
          </div>
        </div>

        {/* Linha de pré-visualização do endereço no contrato */}
        <div className="rounded-xl bg-stone-50 p-3 border border-stone-200 text-[11px] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-stone-600 truncate">
            <span className="font-semibold text-stone-800 shrink-0">Auto-preenchimento no Contrato:</span>
            <span className="font-mono text-stone-700 truncate">
              {currentFormattedAddress || 'Endereço ainda não informado'}
            </span>
          </div>
          {currentFormattedAddress && !addressSavedSuccess && (
            <span className="text-[10px] text-amber-700 font-medium shrink-0">
              * Clique em "Salvar Endereço" ou "Conferir Dados Comerciais" para gravar.
            </span>
          )}
        </div>
      </section>

      {/* Card 3: Painel de Conferência Comercial Interativo (Microetapa 3.2) */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
              <Briefcase className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-stone-900">
                Conferência de Termos Comerciais
              </h2>
              <p className="text-xs text-stone-500">
                Revise e ajuste plano, vigência, condição de faturamento e parcelamento
              </p>
            </div>
          </div>

          {/* Toggle Pedra Fundamental */}
          <label className="inline-flex items-center gap-2.5 cursor-pointer rounded-xl border border-amber-200 bg-amber-50/60 px-3.5 py-2 hover:bg-amber-50 transition">
            <input
              type="checkbox"
              checked={isPedraFundamental}
              onChange={(e) => handlePedraFundamentalToggle(e.target.checked)}
              className="h-4 w-4 rounded border-amber-400 text-[#3B0B14] focus:ring-[#3B0B14]"
            />
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
              <Sparkles className="h-3.5 w-3.5 text-amber-700" />
              Selo Pedra Fundamental (Bienal)
            </div>
          </label>
        </div>

        {/* 1. Seleção de Plano */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
            1. Plano Comercial
          </span>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['bronze', 'prata', 'ouro'] as const).map((planKey) => {
              const preset = PLAN_PRESETS[planKey];
              const isSelected = selectedPlan === planKey;
              return (
                <button
                  type="button"
                  key={planKey}
                  onClick={() => handlePlanChange(planKey)}
                  className={`flex flex-col justify-between text-left p-4 rounded-2xl border-2 transition ${isSelected
                    ? 'border-[#3B0B14] bg-[#3B0B14]/5 shadow-xs'
                    : 'border-stone-200 hover:border-stone-300 bg-white'
                    }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-serif font-bold text-base text-stone-900">
                        {isPedraFundamental && planKey === 'ouro'
                          ? 'Plano Acácia (Pedra Fundamental)'
                          : preset.name}
                      </span>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3B0B14] text-white">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">{preset.tagline}</p>
                  </div>

                  <div className="pt-4 border-t border-stone-100 mt-3">
                    <span className="text-xs text-stone-400 block font-medium">À vista regular:</span>
                    <span className="font-bold text-stone-900 text-sm">
                      {isPedraFundamental && planKey === 'ouro'
                        ? 'R$ 1.200,00'
                        : formatCentsToReais(preset.payInFullCents)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Vigência Contratual & Condição de Pagamento */}
        <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-stone-100">
          {/* Vigência */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              2. Vigência Contratual
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isPedraFundamental}
                onClick={() => {
                  setBillingCycle('annual');
                  setFeedback(null);
                }}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${billingCycle === 'annual'
                  ? 'border-[#3B0B14] bg-[#3B0B14]/5 text-[#3B0B14]'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  } ${isPedraFundamental ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Calendar className="h-4 w-4" />
                Anual (12 meses)
              </button>

              <button
                type="button"
                onClick={() => {
                  setBillingCycle('biennial');
                  setFeedback(null);
                }}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${billingCycle === 'biennial'
                  ? 'border-[#3B0B14] bg-[#3B0B14]/5 text-[#3B0B14]'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
              >
                <Sparkles className="h-4 w-4" />
                Bienal (24 meses)
              </button>
            </div>
            {isPedraFundamental && (
              <p className="text-[11px] text-amber-800 font-medium">
                * Condição Pedra Fundamental inclui vigência bienal garantida.
              </p>
            )}
          </div>

          {/* Forma de Pagamento */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              3. Condição de Pagamento
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePaymentMethodChange('avista')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${paymentMethod === 'avista'
                  ? 'border-[#3B0B14] bg-[#3B0B14]/5 text-[#3B0B14]'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
              >
                <CreditCard className="h-4 w-4" />
                À vista (PIX / Boleto / Cartão)
              </button>

              <button
                type="button"
                onClick={() => handlePaymentMethodChange('parcelado')}
                className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition ${paymentMethod === 'parcelado'
                  ? 'border-[#3B0B14] bg-[#3B0B14]/5 text-[#3B0B14]'
                  : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
              >
                <CreditCard className="h-4 w-4" />
                Parcelado no Cartão
              </button>
            </div>
          </div>
        </div>

        {/* 3. Parcelas e Valor Contratado */}
        <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-stone-100">
          {/* Parcelamento */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Quantidade de Parcelas
            </label>
            {paymentMethod === 'avista' ? (
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-xs font-medium text-stone-600">
                1x (Pagamento integral à vista)
              </div>
            ) : (
              <select
                value={installmentsCount}
                onChange={(e) => {
                  setInstallmentsCount(Number(e.target.value));
                  setFeedback(null);
                }}
                className="w-full rounded-xl border border-stone-300 bg-white p-2.5 text-xs font-bold text-stone-900 focus:border-[#3B0B14] focus:ring-[#3B0B14]"
              >
                {Array.from({ length: maxInstallmentsAllowed }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}x de {formatCentsToReais(Math.round(amountCents / n))}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-stone-500">
              Máximo de {maxInstallmentsAllowed}x sem juros para este plano.
            </p>
          </div>

          {/* Valor Total Contratado */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              Valor Total Contratado (R$)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs font-bold text-stone-400">
                R$
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={(amountCents / 100).toFixed(2)}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setAmountCents(isNaN(val) ? 0 : Math.round(val * 100));
                  setFeedback(null);
                }}
                className="w-full rounded-xl border border-stone-300 bg-white pl-9 pr-3 py-2.5 text-xs font-mono font-bold text-stone-900 focus:border-[#3B0B14] focus:ring-[#3B0B14]"
              />
            </div>
            <p className="text-[11px] text-stone-500">
              {paymentMethod === 'parcelado'
                ? `Equivalente a ${installmentsCount}x de ${formatCentsToReais(calculatedInstallmentValueCents)}`
                : 'Valor cobrado em parcela única.'}
            </p>
          </div>
        </div>

        {/* 4. Observações Comerciais Opcionais */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
            Observações ou Condições Especiais da Negociação
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setFeedback(null);
            }}
            placeholder="Ex: Acordo aprovado em reunião com a diretoria; condição especial acordada para o lançamento."
            className="w-full rounded-xl border border-stone-300 bg-white p-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[#3B0B14] focus:ring-[#3B0B14]"
          />
        </div>

        {/* 4b. Data de Início da Vigência Contratual */}
        <div className="space-y-2 pt-2 border-t border-stone-100">
          <label
            htmlFor="contract-start-date"
            className="text-xs font-bold text-stone-700 uppercase tracking-wider flex items-center gap-1.5"
          >
            <Calendar className="h-3.5 w-3.5 text-[#3B0B14]" />
            Data de Início da Vigência Contratual
          </label>
          <input
            id="contract-start-date"
            type="date"
            value={contractStartDate}
            onChange={(e) => {
              setContractStartDate(e.target.value);
              setFeedback(null);
            }}
            className="w-full sm:max-w-xs rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs font-mono font-bold text-stone-900 focus:border-[#3B0B14] focus:ring-[#3B0B14]"
          />
          <p className="text-[11px] text-stone-500 leading-relaxed">
            Opcional. Define a data exata em que a vigência de{' '}
            {billingCycle === 'biennial' ? '24' : '12'} meses começar a contar.{' '}
            Deixe em branco para que a vigência conte <strong>a partir da data de assinatura</strong>.
          </p>
        </div>
      </section>

      {/* Card 4: Checklist de Prontidão para Contrato */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
        <h2 className="flex items-center gap-2 font-serif text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
          <FileCheck2 className="h-5 w-5 text-[#3B0B14]" />
          Checklist de Prontidão do Onboarding
        </h2>

        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-900">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-3.5 w-3.5 stroke-[3]" />
            </div>
            <span className="font-medium">
              <strong>Pré-cadastro concluído:</strong> Dados cadastrais básicos da empresa e do anunciante foram preenchidos.
            </span>
          </div>

          <div
            className={`flex items-center gap-3 p-2.5 rounded-xl border ${isMasonicVerified
              ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900'
              : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
          >
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isMasonicVerified ? 'bg-emerald-600 text-white' : 'border border-stone-400 text-stone-500'
                }`}
            >
              {isMasonicVerified ? (
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              )}
            </div>
            <span className="font-medium">
              <strong>Vínculo maçônico registrado e conferido:</strong> Loja, Potência e modalidade de elegibilidade validadas.
            </span>
          </div>

          <div
            className={`flex items-center gap-3 p-2.5 rounded-xl border ${isConferred
              ? 'bg-emerald-50/60 border-emerald-100 text-emerald-900'
              : 'bg-stone-50 border-stone-200 text-stone-600'
              }`}
          >
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isConferred ? 'bg-emerald-600 text-white' : 'border border-stone-400 text-stone-500'
                }`}
            >
              {isConferred ? (
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
              )}
            </div>
            <span className="font-medium">
              <strong>Conferência Comercial (Microetapa 3.2):</strong> Plano, vigência, condição de faturamento e parcelas conferidos e congelados.
            </span>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600">
            <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-stone-400 text-stone-500">
              <span className="h-1.5 w-1.5 rounded-full bg-stone-400" />
            </div>
            <span>
              <strong>Geração de Minuta Contratual (Fase 4):</strong> Snapshot imutável com hash criptográfico SHA-256 e token seguro de assinatura.
            </span>
          </div>
        </div>
      </section>

      {/* Alerta de Mudança Relevante Detectada (Microetapa 4.3) */}
      {commercialStatus === 'contrato_gerado' && (isDirty || hasPendingChanges) && (
        <section className="rounded-2xl border-2 border-amber-400 bg-amber-50/90 p-5 shadow-xs space-y-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="font-serif font-bold text-sm text-amber-950">
                Alteração Relevante Detectada nos Dados Comerciais/Cadastrais
              </h3>
              <p className="text-xs text-amber-900 leading-relaxed">
                {pendingChangesReason ||
                  'Os termos comerciais ou dados cadastrais atuais diferem da minuta congelada no snapshot ativo. Para aplicar essas alterações e gerar o novo contrato, é necessário invalidar o snapshot atual.'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200">
            <button
              type="button"
              onClick={() => {
                setInvalidationReason(
                  isDirty
                    ? 'Ajuste nas condições comerciais acordadas (plano/valor/vigência).'
                    : 'Alteração cadastral/responsável detectada após emissão do contrato.'
                );
                setShowInvalidateModal(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-900 hover:bg-amber-950 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-300" />
              Invalidar Contrato Atual e Reabrir Conferência
            </button>
          </div>
        </section>
      )}

      {/* Card de Assinatura Ativa (Fase 4: Microetapa 4.4) */}
      {commercialStatus === 'contrato_enviado' && (
        <section className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/70 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-emerald-200/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white shadow-xs">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif font-bold text-base text-emerald-950">
                    Contrato Enviado para Assinatura ✓
                  </h3>
                  <span className="rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
                    Aguardando Assinatura
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  {signatureTokenData?.expires_at ? (
                    <>Link seguro com validade de 7 dias (expira em {new Date(signatureTokenData.expires_at).toLocaleString('pt-BR')})</>
                  ) : (
                    <>Link criptográfico emitido e disponível para conferência e assinatura do anunciante.</>
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRevokeTokenReason('Cancelamento administrativo do envio antes da assinatura.');
                setShowRevokeTokenModal(true);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 hover:text-rose-900 transition hover:underline cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Revogar Link
            </button>
          </div>

          {/* Campo com Link Público */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-emerald-950 uppercase tracking-wider block">
              Link Seguro de Acesso do Anunciante
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={signatureTokenData?.public_url || 'Carregando link seguro...'}
                className="flex-1 rounded-xl border border-emerald-300 bg-white px-3.5 py-2.5 font-mono text-xs text-stone-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopySignatureLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                {copiedLinkFeedback ? (
                  <>
                    <CheckCheck className="h-4 w-4" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copiar link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Botões de Ação Direta */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {signatureTokenData?.public_url && (
              <a
                href={signatureTokenData.public_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/60 transition shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir página
              </a>
            )}
            <button
              type="button"
              onClick={handleOpenWhatsAppShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/60 transition shadow-2xs cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              Enviar por WhatsApp
            </button>
            <button
              type="button"
              onClick={handleOpenEmailShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/60 transition shadow-2xs cursor-pointer"
            >
              <Mail className="h-3.5 w-3.5 text-stone-600" />
              Enviar por e-mail
            </button>
          </div>
        </section>
      )}

      {/* Card 5: Histórico de Versões e Snapshots da Empresa (Fase 4: Microetapas 4.3 e 4.4) */}
      {(snapshotHistory.length > 0 || commercialStatus === 'contrato_gerado' || commercialStatus === 'contrato_enviado') && (
        <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-[#3B0B14]" />
              <h2 className="font-serif text-base font-bold text-stone-900">
                Histórico de Minutas e Snapshots da Empresa
              </h2>
            </div>
            <span className="text-xs text-stone-500">
              {snapshotHistory.length} {snapshotHistory.length === 1 ? 'versão registrada' : 'versões registradas'} · Imutabilidade jurídica
            </span>
          </div>

          {isLoadingHistory ? (
            <div className="flex items-center justify-center py-6 text-xs text-stone-500 gap-2">
              <Clock className="h-4 w-4 animate-spin text-[#3B0B14]" />
              Carregando histórico de snapshots...
            </div>
          ) : snapshotHistory.length === 0 ? (
            <p className="text-xs text-stone-500 italic py-2">
              Nenhum snapshot gerado ainda. Conclua a conferência comercial e gere a primeira minuta.
            </p>
          ) : (
            <div className="space-y-3">
              {snapshotHistory.map((item) => {
                const isDraft = item.contract_status === 'draft';
                const isSuperseded = item.contract_status === 'superseded';
                const isAwaiting = item.contract_status === 'awaiting_signature';
                const isSigned = item.contract_status === 'signed';

                return (
                  <div
                    key={item.contract_id}
                    className={`rounded-xl border p-4 transition text-xs space-y-3 ${item.is_current
                      ? 'border-emerald-300 bg-emerald-50/40 shadow-2xs'
                      : 'border-stone-200 bg-stone-50/60 opacity-80'
                      }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-stone-900">
                          Snapshot {item.iteration_number}
                        </span>
                        <span className="rounded-md bg-stone-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-stone-700">
                          Template {item.template_version}
                        </span>
                        {item.is_current ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-300">
                            <Check className="h-3 w-3 stroke-[3]" /> Status: Atual
                          </span>
                        ) : isSuperseded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-stone-200 px-2.5 py-0.5 text-[10px] font-bold text-stone-600">
                            <RotateCcw className="h-3 w-3" /> Status: Substituído
                          </span>
                        ) : isAwaiting ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
                            Aguardando Assinatura
                          </span>
                        ) : isSigned ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-900">
                            Assinado
                          </span>
                        ) : (
                          <span className="rounded-full bg-stone-200 px-2 py-0.5 text-[10px] font-bold text-stone-600">
                            {item.contract_status}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-stone-500">
                        <span>
                          Gerado em: <strong className="text-stone-700">{new Date(item.created_at).toLocaleString('pt-BR')}</strong>
                        </span>
                        {item.is_current && isDraft && (
                          <button
                            type="button"
                            onClick={() => {
                              setInvalidationReason('Invalidação para ajuste de termos comerciais ou cadastrais.');
                              setShowInvalidateModal(true);
                            }}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 hover:underline transition ml-2 cursor-pointer"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Invalidar
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 bg-white rounded-lg p-2 border border-stone-200 font-mono text-[11px] text-stone-700">
                      <div className="truncate">
                        <strong className="font-sans text-stone-500 mr-2">SHA-256:</strong>
                        <span className="break-all">{item.sha256_hash || 'Hash não calculado'}</span>
                      </div>
                      {item.sha256_hash && (
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(item.sha256_hash);
                            setCopiedFeedback(true);
                            setTimeout(() => setCopiedFeedback(false), 2000);
                          }}
                          title="Copiar Hash SHA-256"
                          className="shrink-0 p-1 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Barra de Ações do Rodapé */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href={`/admin/empresas/${business.id}/vinculo-maconico`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Vínculo Maçônico
          </Link>
          <Link
            href={`/admin/empresas/${business.id}`}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
          >
            Prontuário 360º
          </Link>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Botão de Conferência Comercial */}
          <button
            type="button"
            disabled={isBlockedByMasonicLink || isPending}
            onClick={handleConfirmCommercialTerms}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-xs ${isBlockedByMasonicLink
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : isConferred
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-[#3B0B14] hover:bg-[#2b080f] text-white'
              }`}
          >
            {isPending ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Salvando Conferência...
              </>
            ) : isConferred ? (
              <>
                <Check className="h-4 w-4 stroke-[3]" />
                Dados Comerciais Conferidos ✓
              </>
            ) : (
              <>
                <FileCheck2 className="h-4 w-4 text-emerald-400" />
                Conferir Dados Comerciais
                <ArrowRight className="h-4 w-4 text-white/60" />
              </>
            )}
          </button>

          {/* Botão para Invalidação se já houver contrato gerado (Microetapa 4.3) */}
          {commercialStatus === 'contrato_gerado' && (
            <button
              type="button"
              onClick={() => {
                setInvalidationReason('Invalidação para revisão e ajuste comercial.');
                setShowInvalidateModal(true);
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Invalidar Contrato...
            </button>
          )}

          {/* Botão de Envio para Assinatura (Fase 4: Microetapa 4.4) */}
          {commercialStatus === 'contrato_gerado' && (
            <button
              type="button"
              disabled={isSendingForSignature}
              onClick={handleSendForSignature}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B0B14] hover:bg-[#2b080f] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSendingForSignature ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Gerando Token e Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 text-emerald-400" />
                  Enviar para Assinatura
                  <ArrowRight className="h-4 w-4 text-white/60" />
                </>
              )}
            </button>
          )}

          {/* Badge de Contrato Enviado */}
          {commercialStatus === 'contrato_enviado' && (
            <div className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-50 border border-emerald-300 px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-2xs">
              <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
              Aguardando Assinatura do Anunciante
            </div>
          )}

          {/* Botão de Liberação do Prontuário 360 (Microetapa 6.4A) */}
          {commercialStatus === 'pagamento_confirmado' && (
            <button
              type="button"
              disabled={isUnlockingDossier}
              onClick={handleUnlockDossier}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-5 py-2.5 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isUnlockingDossier ? (
                <>
                  <Clock className="h-4 w-4 animate-spin" />
                  Liberando Prontuário 360...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 text-emerald-300 stroke-[3]" />
                  Liberar Prontuário 360
                  <ArrowRight className="h-4 w-4 text-white/70" />
                </>
              )}
            </button>
          )}

          {/* Atalho para Prontuário em Configuração ou Pronto */}
          {(commercialStatus === 'prontuario_em_configuracao' || commercialStatus === 'pronto_para_publicar' || commercialStatus === 'publicado') && (
            <Link
              href={`/admin/empresas/${business.id}`}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B0B14] hover:bg-[#2b080f] text-white px-5 py-2.5 text-xs font-bold transition shadow-xs"
            >
              <FileText className="h-4 w-4" />
              <span>Acessar Prontuário 360 →</span>
            </Link>
          )}

          {/* Botão para Minuta / Fase 4 */}
          <button
            type="button"
            disabled={!canOpenDraft}
            onClick={handleOpenDraftPreview}
            title={
              !canOpenDraft
                ? 'Conclua a conferência comercial para liberar a visualização da minuta.'
                : isContractSent
                  ? 'Visualizar Minuta Enviada para Assinatura'
                  : isContractGenerated
                    ? 'Visualizar Contrato Gerado e Snapshot Imutável (Fase 4: Microetapa 4.2)'
                    : 'Visualizar Minuta do Contrato (Fase 4: Microetapa 4.1)'
            }
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition shadow-xs ${isContractSent
              ? 'bg-emerald-800 hover:bg-emerald-900 text-white cursor-pointer'
              : isContractGenerated
                ? 'bg-amber-700 hover:bg-amber-800 text-white cursor-pointer'
                : isConferred
                  ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
          >
            <FileText className="h-4 w-4" />
            {isContractSent ? 'Ver Contrato Enviado' : isContractGenerated ? 'Ver Contrato Gerado' : 'Visualizar Minuta'}
            <ArrowRight className="h-4 w-4 text-white/70" />
          </button>
        </div>
      </div>

      {/* Modal de Pré-visualização da Minuta do Contrato (Fase 4: Microetapa 4.1) */}
      {showFase4Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 border border-stone-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50/70">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B0B14] text-white">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Minuta do Contrato de Adesão — Anunciante
                    </h3>
                    <span className="rounded-md bg-stone-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-stone-700">
                      {contractDraft?.template_version || 'v1.0'}
                    </span>
                  </div>
                  <p className="text-xs text-stone-500">
                    Template: <span className="font-mono text-stone-700 font-semibold">{contractDraft?.template_code || 'contrato_adesao_anunciante_v1'}</span> · Fase 4: Microetapa 4.1
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFase4Modal(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isLoadingDraft ? (
                <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
                  <Clock className="h-8 w-8 animate-spin text-[#3B0B14]" />
                  <p className="text-xs font-semibold text-stone-700">
                    Carregando template canônico e renderizando minuta contratual...
                  </p>
                  <p className="text-[11px] text-stone-500">
                    Validando variáveis obrigatórias e formatação financeira em BRL
                  </p>
                </div>
              ) : draftError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="h-4 w-4 text-rose-600" />
                    Não foi possível renderizar a minuta
                  </div>
                  <p>{draftError}</p>
                </div>
              ) : contractDraft ? (
                <>
                  {/* Resumo das variáveis preenchidas */}
                  <div className="rounded-xl bg-stone-50 p-4 border border-stone-200 text-xs">
                    <div className="font-semibold text-stone-900 mb-2 flex items-center justify-between">
                      <span>Resumo de Variáveis Contratuais Conferidas</span>
                      <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100/70 px-2 py-0.5 rounded">
                        100% Preenchidas sem pendências ✓
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 font-mono text-[11px] text-stone-700">
                      <div><strong className="font-sans text-stone-500">Razão Social:</strong> {contractDraft.variables.razao_social}</div>
                      <div><strong className="font-sans text-stone-500">CNPJ:</strong> {contractDraft.variables.cnpj}</div>
                      <div><strong className="font-sans text-stone-500">Responsável:</strong> {contractDraft.variables.responsavel_nome}</div>
                      <div><strong className="font-sans text-stone-500">CPF:</strong> {contractDraft.variables.responsavel_cpf}</div>
                      <div className="sm:col-span-2 lg:col-span-4 border-t border-stone-200/60 pt-1">
                        <strong className="font-sans text-stone-500">Endereço da Contratante:</strong>{' '}
                        {contractDraft.variables.endereco || 'Endereço não informado'}
                      </div>
                      <div><strong className="font-sans text-stone-500">Plano:</strong> {contractDraft.variables.plano_nome}</div>
                      <div><strong className="font-sans text-stone-500">Vigência:</strong> {contractDraft.variables.vigencia}</div>
                      <div><strong className="font-sans text-stone-500">Valor Total:</strong> {contractDraft.variables.valor_total}</div>
                      <div><strong className="font-sans text-stone-500">Condição:</strong> {contractDraft.variables.parcelas} ({contractDraft.variables.forma_pagamento})</div>
                    </div>
                    {(!contractDraft.variables.endereco || contractDraft.variables.endereco === 'Endereço não informado') && (
                      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-amber-50 p-2 border border-amber-200 text-amber-900 text-[11px]">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                        <span>Recomendamos salvar o endereço na etapa de contratação para qualificar a Contratante na minuta antes de gerar o snapshot imutável.</span>
                      </div>
                    )}
                  </div>

                  {/* Visualizador da Minuta Renderizada */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold text-stone-700">Texto Integral da Minuta (Markdown Renderizado)</span>
                      <button
                        type="button"
                        onClick={handleCopyMarkdown}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-stone-600 hover:text-stone-900 transition"
                      >
                        {copiedFeedback ? (
                          <>
                            <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Texto Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar Markdown
                          </>
                        )}
                      </button>
                    </div>

                    <div className="rounded-xl border border-stone-300 bg-stone-900 text-stone-100 p-5 font-mono text-xs leading-relaxed max-h-96 overflow-y-auto whitespace-pre-wrap select-all">
                      {contractDraft.rendered_markdown}
                    </div>
                  </div>

                  {/* Card de Confirmação do Snapshot (Fase 4: Microetapa 4.2) */}
                  {(generatedSnapshot || (dto.contract && commercialStatus === 'contrato_gerado')) && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 text-xs text-emerald-950 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-2 text-emerald-900">
                          <Check className="h-4 w-4 text-emerald-600 stroke-[3]" />
                          Snapshot Imutável Gerado e Auditado (Fase 4: Microetapa 4.2)
                        </span>
                        <span className="rounded bg-emerald-200/80 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-800">
                          Status: contrato_gerado
                        </span>
                      </div>
                      <div className="bg-white rounded-lg p-2.5 border border-emerald-200 font-mono text-[11px] text-stone-800 break-all select-all">
                        <strong className="font-sans text-stone-500 mr-2">Hash SHA-256:</strong>
                        {generatedSnapshot?.sha256_hash || dto.contract?.sha256_hash}
                      </div>
                      <p className="text-[11px] text-emerald-800">
                        O contrato foi congelado no banco (tabela <code>contract_snapshots</code>) com status <code>draft</code>. A integridade jurídica está assegurada.
                      </p>
                    </div>
                  )}

                  {/* Informações da Etapa 4 */}
                  <div className="rounded-xl bg-amber-50/80 p-3.5 border border-amber-200 text-xs text-amber-950 space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Sparkles className="h-4 w-4 text-amber-700" />
                      {commercialStatus === 'contrato_gerado'
                        ? 'Microetapa 4.2 Concluída — Documento Congelado'
                        : 'Minuta Canônica Pronta para Registro'}
                    </p>
                    <p className="text-amber-800 text-[11px]">
                      {commercialStatus === 'contrato_gerado'
                        ? 'O snapshot deste contrato foi gerado no servidor e o hash SHA-256 foi gravado de forma imutável. Na Microetapa 4.4, o link com token seguro será gerado para coleta da assinatura eletrônica.'
                        : 'Ao clicar em "Confirmar e Gerar Snapshot", o sistema renderiza novamente a minuta no servidor, calcula o hash criptográfico SHA-256, grava na tabela de snapshots e avança o status para "contrato_gerado".'}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-stone-200 px-6 py-3.5 bg-stone-50/70">
              <span className="text-[11px] text-stone-500 font-medium">
                {commercialStatus === 'contrato_gerado'
                  ? 'Próximos passos: Microetapas 4.3 (Versionamento) e 4.4 (Token de Assinatura)'
                  : 'Fase 4: Microetapa 4.2 (Geração de Snapshot Imutável)'}
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowFase4Modal(false)}
                  className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
                >
                  Fechar
                </button>
                {commercialStatus === 'contrato_gerado' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFase4Modal(false);
                      setInvalidationReason('Invalidação solicitada a partir da conferência da minuta.');
                      setShowInvalidateModal(true);
                    }}
                    className="rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                  >
                    Invalidar Contrato...
                  </button>
                )}
                {commercialStatus === 'contrato_gerado' ? (
                  <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs">
                      <Check className="h-4 w-4 stroke-[3]" />
                      Snapshot Gravado ✓
                    </div>
                    <button
                      type="button"
                      disabled={isSendingForSignature}
                      onClick={async () => {
                        setShowFase4Modal(false);
                        await handleSendForSignature();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#3B0B14] hover:bg-[#2b080f] text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5 text-emerald-400" />
                      Enviar para Assinatura
                    </button>
                  </div>
                ) : commercialStatus === 'contrato_enviado' ? (
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-xs">
                    <Check className="h-4 w-4 stroke-[3]" />
                    Contrato Enviado ✓
                  </div>
                ) : generatedSnapshot ? (
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-bold text-white shadow-xs">
                    <Check className="h-4 w-4 stroke-[3]" />
                    Snapshot Gravado ✓
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={!isConferred || isGeneratingSnapshot}
                    onClick={handleGenerateSnapshot}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingSnapshot ? (
                      <>
                        <Clock className="h-4 w-4 animate-spin" />
                        Gerando Snapshot (SHA-256)...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Confirmar e Gerar Snapshot
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Invalidação Administrativa (Fase 4: Microetapa 4.3) */}
      {showInvalidateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-600 text-white">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Invalidar Snapshot do Contrato
                  </h3>
                  <p className="text-xs text-stone-500">
                    Microetapa 4.3 — Versionamento e Invalidação
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInvalidateModal(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-amber-950 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5 text-amber-900">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                  Regras de Integridade Jurídica:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-900">
                  <li>O contrato atual será marcado como <strong>superseded (Substituído)</strong>.</li>
                  <li>O texto renderizado e o hash SHA-256 serão <strong>100% preservados no histórico</strong>.</li>
                  <li>O status da empresa retornará para <strong>dados_comerciais_conferidos</strong>.</li>
                  <li>Você poderá revisar plano, vigência ou dados cadastrais e gerar um <strong>novo snapshot com novo hash</strong>.</li>
                </ul>
              </div>

              {invalidationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{invalidationError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block">
                  Justificativa Administrativa Obrigatória <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={invalidationReason}
                  onChange={(e) => {
                    setInvalidationReason(e.target.value);
                    setInvalidationError(null);
                  }}
                  placeholder="Ex: Anunciante solicitou alteração do parcelamento para 3x antes do envio do contrato."
                  className="w-full rounded-xl border border-stone-300 p-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[#3B0B14] focus:ring-[#3B0B14]"
                />
                <span className="text-[10px] text-stone-400 block">
                  Esta justificativa será registrada de forma permanente em <code>admin_audit_logs</code>.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-6 py-3.5 bg-stone-50">
              <button
                type="button"
                onClick={() => setShowInvalidateModal(false)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isInvalidating || !invalidationReason.trim() || invalidationReason.trim().length < 5}
                onClick={handleConfirmInvalidation}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-4 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isInvalidating ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Invalidando...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Confirmar Invalidação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Revogação de Token de Assinatura (Fase 4: Microetapa 4.4) */}
      {showRevokeTokenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in fade-in zoom-in-95 border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-base text-stone-900">
                    Revogar Link de Assinatura
                  </h3>
                  <p className="text-xs text-stone-500">
                    Microetapa 4.4 — Envio e Revogação de Link
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRevokeTokenModal(false)}
                className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-200 hover:text-stone-700 transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-950 space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Atenção: Acesso do Anunciante será Cancelado
                </p>
                <p className="text-rose-800 text-[11px] leading-relaxed">
                  Ao revogar, o link <code>/contratacao/[token]</code> atual deixará de funcionar imediatamente.
                  O status do contrato voltará para <strong>draft</strong> e a empresa para <strong>contrato_gerado</strong>,
                  permitindo invalidar a minuta ou reenviar um novo link posteriormente.
                </p>
              </div>

              {revokeTokenError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-900 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span>{revokeTokenError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-bold text-stone-800 uppercase tracking-wider text-[11px] block">
                  Justificativa Administrativa para Revogação <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={revokeTokenReason}
                  onChange={(e) => {
                    setRevokeTokenReason(e.target.value);
                    setRevokeTokenError(null);
                  }}
                  placeholder="Ex: Anunciante solicitou ajuste nos termos comerciais antes de assinar."
                  className="w-full rounded-xl border border-stone-300 p-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[#3B0B14] focus:ring-[#3B0B14]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-6 py-3.5 bg-stone-50">
              <button
                type="button"
                onClick={() => setShowRevokeTokenModal(false)}
                className="rounded-xl border border-stone-300 bg-white px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRevokingToken || !revokeTokenReason.trim() || revokeTokenReason.trim().length < 5}
                onClick={handleRevokeSignatureToken}
                className="inline-flex items-center gap-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 text-xs font-bold transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isRevokingToken ? (
                  <>
                    <Clock className="h-4 w-4 animate-spin" />
                    Revogando...
                  </>
                ) : (
                  <>
                    <Ban className="h-4 w-4" />
                    Confirmar Revogação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
