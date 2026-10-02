'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Building2,
  Shield,
  ShieldCheck,
  Users,
  HeartHandshake,
  Award,
  ArrowRight,
  AlertCircle,
  Save,
  Check,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import { upsertAdminMasonicLinkAction } from '@/lib/admin/admin-businesses-service';
import type { MasonicEligibilityType } from '@/lib/masonic/masonic-links-service';

export interface MasonicLinkDetail {
  id?: string;
  status?: 'pending' | 'verified' | 'rejected';
  organization_id?: string | null;
  lodge_name?: string;
  potency?: string;
  link_type?: string;
  eligibility_type?: 'mason' | 'mason_spouse' | 'mason_family' | string | null;
  reference_mason_name?: string | null;
  reference_mason_cim?: string | null;
  family_relationship?: string | null;
  notes?: string | null;
  verified_at?: string | null;
  verified_by?: string | null;
}

interface MasonicLinkOnboardingFormProps {
  businessId: string;
  businessName: string;
  legalName: string;
  cnpj: string;
  commercialStatus: string;
  initialMasonicLink?: MasonicLinkDetail;
}

const ONBOARDING_STEPS = [
  { step: 1, name: 'Pré-cadastro', status: 'completed' },
  { step: 2, name: 'Vínculo maçônico', status: 'current' },
  { step: 3, name: 'Contratação', status: 'upcoming' },
  { step: 4, name: 'Contrato', status: 'upcoming' },
  { step: 5, name: 'Pagamento', status: 'upcoming' },
  { step: 6, name: 'Prontuário', status: 'upcoming' },
  { step: 7, name: 'Publicação', status: 'upcoming' },
];

const FAMILY_RELATIONSHIP_OPTIONS = [
  { value: 'filho', label: 'Filho' },
  { value: 'filha', label: 'Filha' },
  { value: 'sobrinho', label: 'Sobrinho' },
  { value: 'sobrinha', label: 'Sobrinha' },
  { value: 'neto', label: 'Neto' },
  { value: 'neta', label: 'Neta' },
  { value: 'outro', label: 'Outro familiar' },
];

export default function MasonicLinkOnboardingForm({
  businessId,
  businessName,
  legalName,
  cnpj,
  commercialStatus,
  initialMasonicLink,
}: MasonicLinkOnboardingFormProps) {
  const router = useRouter();

  // Initial state derived from props
  const [eligibilityType, setEligibilityType] = useState<MasonicEligibilityType>(() => {
    const raw = initialMasonicLink?.eligibility_type;
    if (raw === 'mason' || raw === 'mason_spouse' || raw === 'mason_family') {
      return raw;
    }
    return 'mason';
  });

  const [linkType, setLinkType] = useState<string>(() => {
    return initialMasonicLink?.link_type === 'equity_partner' ? 'equity_partner' : 'owner';
  });

  const [referenceMasonName, setReferenceMasonName] = useState(
    initialMasonicLink?.reference_mason_name || ''
  );
  const [referenceMasonCim, setReferenceMasonCim] = useState(
    initialMasonicLink?.reference_mason_cim || ''
  );
  const [familyRelationship, setFamilyRelationship] = useState(
    initialMasonicLink?.family_relationship || 'filho'
  );
  const [potency, setPotency] = useState(initialMasonicLink?.potency || '');
  const [lodgeName, setLodgeName] = useState(initialMasonicLink?.lodge_name || '');
  const [notes, setNotes] = useState(initialMasonicLink?.notes || '');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitActionType, setSubmitActionType] = useState<'pending' | 'verified' | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentVerificationStatus, setCurrentVerificationStatus] = useState<string | undefined>(
    initialMasonicLink?.status
  );

  const isAlreadyVerified =
    currentVerificationStatus === 'verified' ||
    commercialStatus === 'vinculo_verificado' ||
    commercialStatus === 'dados_comerciais_conferidos' ||
    commercialStatus === 'contrato_assinado' ||
    commercialStatus === 'pagamento_confirmado' ||
    commercialStatus === 'publicado';

  const inputClass =
    'w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-[#3B0B14] focus:ring-2 focus:ring-[#3B0B14]/10';

  async function handleSave(targetStatus: 'pending' | 'verified') {
    setFeedback(null);

    // Validações por cenário
    if (!lodgeName.trim()) {
      setFeedback({ type: 'error', message: 'O nome da Loja Maçônica é obrigatório.' });
      return;
    }
    if (!potency.trim()) {
      setFeedback({ type: 'error', message: 'A Potência Maçônica é obrigatória (ex: GOB, GL, COMAB).' });
      return;
    }

    if (eligibilityType === 'mason') {
      if (!referenceMasonName.trim()) {
        setFeedback({ type: 'error', message: 'Informe o Nome do Irmão.' });
        return;
      }
    } else if (eligibilityType === 'mason_spouse') {
      if (!referenceMasonName.trim()) {
        setFeedback({ type: 'error', message: 'Informe o Nome do Maçom de referência (cônjuge).' });
        return;
      }
    } else if (eligibilityType === 'mason_family') {
      if (!referenceMasonName.trim()) {
        setFeedback({ type: 'error', message: 'Informe o Nome do Maçom de referência.' });
        return;
      }
      if (!familyRelationship.trim()) {
        setFeedback({ type: 'error', message: 'Selecione o grau de parentesco.' });
        return;
      }
    }

    setIsSubmitting(true);
    setSubmitActionType(targetStatus);

    try {
      const resolvedLinkType =
        eligibilityType === 'mason'
          ? linkType
          : 'family_owner';

      const resolvedRelationship =
        eligibilityType === 'mason_spouse'
          ? 'conjuge'
          : eligibilityType === 'mason_family'
            ? familyRelationship
            : undefined;

      const res = await upsertAdminMasonicLinkAction(businessId, {
        lodge_name: lodgeName.trim(),
        potency: potency.trim(),
        link_type: resolvedLinkType,
        eligibility_type: eligibilityType,
        reference_mason_name: referenceMasonName.trim(),
        reference_mason_cim: referenceMasonCim.trim() || undefined,
        family_relationship: resolvedRelationship,
        notes: notes.trim() || undefined,
        status: targetStatus,
        justification:
          targetStatus === 'verified'
            ? 'Vínculo maçônico verificado e aprovado pelo Administrador.'
            : 'Vínculo maçônico salvo e enviado para conferência.',
      });

      if (!res.success) {
        setFeedback({
          type: 'error',
          message: res.error || 'Ocorreu um erro ao salvar o vínculo maçônico.',
        });
        setIsSubmitting(false);
        setSubmitActionType(null);
        return;
      }

      setCurrentVerificationStatus(targetStatus);

      if (targetStatus === 'verified') {
        setFeedback({
          type: 'success',
          message: 'Vínculo verificado e aprovado com sucesso! Redirecionando para Contratação...',
        });
        setTimeout(() => {
          router.push(`/admin/empresas/${businessId}/contratacao`);
        }, 200);
      } else {
        setFeedback({
          type: 'success',
          message: 'Vínculo salvo com sucesso! Status: Aguardando verificação (vinculo_informado).',
        });
        setIsSubmitting(false);
        setSubmitActionType(null);
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Falha inesperada ao registrar vínculo.',
      });
      setIsSubmitting(false);
      setSubmitActionType(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href={`/admin/empresas/${businessId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-stone-900 transition mb-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar ao Prontuário 360º
          </Link>
          <span className="text-xs font-bold tracking-widest text-[#3B0B14] uppercase">
            Conexão Maçônica · Onboarding Comercial
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-stone-900">
            Vínculo com a Família Maçônica
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentVerificationStatus === 'verified' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Vínculo Verificado
            </span>
          ) : currentVerificationStatus === 'pending' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200">
              <Shield className="h-3.5 w-3.5 text-amber-600" /> Aguardando Verificação
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 border border-stone-200">
              <Circle className="h-3.5 w-3.5 text-stone-400" /> Não Informado
            </span>
          )}
        </div>
      </div>

      {/* Stepper (7 Etapas) */}
      <nav aria-label="Progresso do Onboarding" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {ONBOARDING_STEPS.map((s) => {
            const isCompleted = s.status === 'completed';
            const isCurrent = s.status === 'current';
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

      {/* Card da Empresa */}
      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-stone-100 text-stone-700 border border-stone-200">
              <Building2 className="h-5 w-5 text-[#3B0B14]" />
            </div>
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Empresa em cadastro</p>
              <h2 className="font-serif text-lg font-bold text-stone-900">{businessName}</h2>
              {legalName && legalName !== businessName && (
                <p className="text-xs text-stone-500">{legalName}</p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <div>
              <span className="text-stone-400 block font-medium">CNPJ</span>
              <span className="font-mono font-semibold text-stone-800">{cnpj || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-stone-400 block font-medium">Estado Comercial</span>
              <span className="font-mono font-semibold text-stone-800">{commercialStatus}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Aviso de Vínculo Já Verificado (se aplicável) */}
      {isAlreadyVerified && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <p className="font-bold">Este vínculo maçônico já foi verificado.</p>
            <p className="text-amber-800">
              Alterações em informações essenciais de Loja, Potência ou Grau de Parentesco podem exigir revalidação do cadastro institucional.
            </p>
          </div>
        </div>
      )}

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-2xl border p-4 text-sm font-medium ${feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900'
            }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Seleção dos 3 Cenários de Elegibilidade */}
      <section className="space-y-4">
        <div>
          <h2 className="font-serif text-lg font-bold text-stone-900">
            Qual é o vínculo que habilita esta empresa?
          </h2>
          <p className="text-xs text-stone-600">
            Selecione uma das três modalidades reconhecidas pelo Estatuto Conexão Maçônica:
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {/* Opção 1: Sou Maçom */}
          <button
            type="button"
            onClick={() => setEligibilityType('mason')}
            className={`flex flex-col text-left rounded-2xl border p-4.5 transition cursor-pointer relative ${eligibilityType === 'mason'
                ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-2 ring-[#3B0B14]/10 shadow-xs'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${eligibilityType === 'mason'
                    ? 'bg-[#3B0B14] text-white'
                    : 'bg-stone-100 text-stone-600'
                  }`}
              >
                <Award className="h-5 w-5" />
              </div>
              <span
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${eligibilityType === 'mason'
                    ? 'border-[#3B0B14] bg-[#3B0B14]'
                    : 'border-stone-300'
                  }`}
              >
                {eligibilityType === 'mason' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <h3 className="font-serif font-bold text-sm text-stone-900">Maçom</h3>
            <p className="text-xs text-stone-600 mt-1">
              O responsável ou proprietário da empresa é maçom regular.
            </p>
          </button>

          {/* Opção 2: Esposa/Cônjuge */}
          <button
            type="button"
            onClick={() => setEligibilityType('mason_spouse')}
            className={`flex flex-col text-left rounded-2xl border p-4.5 transition cursor-pointer relative ${eligibilityType === 'mason_spouse'
                ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-2 ring-[#3B0B14]/10 shadow-xs'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${eligibilityType === 'mason_spouse'
                    ? 'bg-[#3B0B14] text-white'
                    : 'bg-stone-100 text-stone-600'
                  }`}
              >
                <HeartHandshake className="h-5 w-5" />
              </div>
              <span
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${eligibilityType === 'mason_spouse'
                    ? 'border-[#3B0B14] bg-[#3B0B14]'
                    : 'border-stone-300'
                  }`}
              >
                {eligibilityType === 'mason_spouse' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <h3 className="font-serif font-bold text-sm text-stone-900">Esposa / Cônjuge</h3>
            <p className="text-xs text-stone-600 mt-1">
              A empresa pertence à esposa ou ao cônjuge de um maçom.
            </p>
          </button>

          {/* Opção 3: Filho/Familiar */}
          <button
            type="button"
            onClick={() => setEligibilityType('mason_family')}
            className={`flex flex-col text-left rounded-2xl border p-4.5 transition cursor-pointer relative ${eligibilityType === 'mason_family'
                ? 'border-[#3B0B14] bg-[#3B0B14]/5 ring-2 ring-[#3B0B14]/10 shadow-xs'
                : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/50'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-xl ${eligibilityType === 'mason_family'
                    ? 'bg-[#3B0B14] text-white'
                    : 'bg-stone-100 text-stone-600'
                  }`}
              >
                <Users className="h-5 w-5" />
              </div>
              <span
                className={`h-4 w-4 rounded-full border flex items-center justify-center ${eligibilityType === 'mason_family'
                    ? 'border-[#3B0B14] bg-[#3B0B14]'
                    : 'border-stone-300'
                  }`}
              >
                {eligibilityType === 'mason_family' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <h3 className="font-serif font-bold text-sm text-stone-900">Filho / Familiar</h3>
            <p className="text-xs text-stone-600 mt-1">
              O responsável possui vínculo familiar com um maçom.
            </p>
          </button>
        </div>
      </section>

      {/* Formulário Dinâmico dos Campos */}
      <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xs space-y-5">
        <h3 className="font-serif text-base font-bold text-stone-900 border-b border-stone-100 pb-3">
          {eligibilityType === 'mason' && 'Dados do Irmão e Loja Maçônica'}
          {eligibilityType === 'mason_spouse' && 'Dados do Maçom de Referência (Cônjuge)'}
          {eligibilityType === 'mason_family' && 'Dados do Familiar e Maçom de Referência'}
        </h3>

        {/* Campos específicos do Maçom */}
        {eligibilityType === 'mason' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Relação com a empresa
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer">
                  <input
                    type="radio"
                    name="linkType"
                    value="owner"
                    checked={linkType === 'owner'}
                    onChange={() => setLinkType('owner')}
                    className="accent-[#3B0B14]"
                  />
                  <span>Proprietário Titular</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-stone-800 cursor-pointer">
                  <input
                    type="radio"
                    name="linkType"
                    value="equity_partner"
                    checked={linkType === 'equity_partner'}
                    onChange={() => setLinkType('equity_partner')}
                    className="accent-[#3B0B14]"
                  />
                  <span>Sócio / Acionista</span>
                </label>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nome do Irmão <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo do maçom"
                  value={referenceMasonName}
                  onChange={(e) => setReferenceMasonName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  CIM <span className="text-stone-400 font-normal">(Cadastro Individual Maçônico)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123456"
                  value={referenceMasonCim}
                  onChange={(e) => setReferenceMasonCim(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Campos específicos da Esposa / Cônjuge */}
        {eligibilityType === 'mason_spouse' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nome do Maçom de Referência (Cônjuge) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do esposo/cônjuge maçom"
                  value={referenceMasonName}
                  onChange={(e) => setReferenceMasonName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  CIM do Maçom <span className="text-stone-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123456"
                  value={referenceMasonCim}
                  onChange={(e) => setReferenceMasonCim(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Campos específicos do Filho / Familiar */}
        {eligibilityType === 'mason_family' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Grau de Parentesco <span className="text-rose-500">*</span>
                </label>
                <select
                  value={familyRelationship}
                  onChange={(e) => setFamilyRelationship(e.target.value)}
                  className={inputClass}
                >
                  {FAMILY_RELATIONSHIP_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nome do Maçom de Referência <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do pai, tio, avô, etc."
                  value={referenceMasonName}
                  onChange={(e) => setReferenceMasonName(e.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  CIM do Maçom <span className="text-stone-400 font-normal">(se disponível)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: 123456"
                  value={referenceMasonCim}
                  onChange={(e) => setReferenceMasonCim(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* Campos de Loja e Potência (Comuns a todos) */}
        <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-stone-100">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Potência Maçônica <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: GOB, GLMMG, COMAB, etc."
              value={potency}
              onChange={(e) => setPotency(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Loja Maçônica <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ex: ARLS Fraternidade e Progresso nº 123"
              value={lodgeName}
              onChange={(e) => setLodgeName(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Observações Administrativas */}
        <div className="pt-2 border-t border-stone-100">
          <label className="block text-xs font-bold text-stone-700 mb-1">
            Observações Administrativas
          </label>
          <textarea
            rows={2}
            placeholder="Detalhes ou anotações internas sobre a conferência deste vínculo..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClass}
          />
          <p className="text-[11px] text-stone-400 mt-1">
            Uso interno. Não será exibido publicamente no Guia.
          </p>
        </div>
      </section>

      {/* Botões de Ação do Administrador */}
      <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-2">
        <Link
          href={`/admin/empresas/${businessId}`}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition"
        >
          Cancelar
        </Link>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Botão Secundário: Salvar e Enviar para Verificação */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave('pending')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-stone-300 bg-white px-5 py-2.5 text-xs font-bold text-stone-800 hover:bg-stone-50 transition disabled:opacity-60 cursor-pointer shadow-2xs"
          >
            {isSubmitting && submitActionType === 'pending' ? (
              <Loader2 className="h-4 w-4 animate-spin text-stone-600" />
            ) : (
              <Save className="h-4 w-4 text-stone-600" />
            )}
            Salvar e enviar para verificação
          </button>

          {/* Botão Principal: Salvar e Aprovar Vínculo */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSave('verified')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#3B0B14] px-6 py-2.5 text-xs font-bold text-white hover:bg-[#4A0E1A] transition disabled:opacity-60 cursor-pointer shadow-md shadow-[#3B0B14]/15"
          >
            {isSubmitting && submitActionType === 'verified' ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            )}
            Salvar e aprovar vínculo
            <ArrowRight className="h-4 w-4 text-white/70" />
          </button>
        </div>
      </div>
    </div>
  );
}
