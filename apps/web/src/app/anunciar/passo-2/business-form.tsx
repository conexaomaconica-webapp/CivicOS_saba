'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  validateBusinessStep,
  hasBusinessStepErrors,
  formatCnpj,
  type BusinessStepErrors,
} from '@/lib/onboarding/onboarding-validation';
import { createBusinessDraft, type BusinessCategoryOption } from '@/lib/business/business-registration-service';
import { loadResponsibleDraft, clearResponsibleDraft } from '@/lib/onboarding/responsible-flow';
import { upsertMasonicAffiliation } from '@/lib/masonic/masonic-affiliation-service';
import { MASONIC_STATUS_LABELS } from '@/lib/masonic/masonic-affiliation';
import { MasonicLinkAuthorizationModal } from '@/components/onboarding/MasonicLinkAuthorizationModal';

const FIELD_ERROR_STYLE = {
  marginTop: 'var(--space-1)',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-error-500)',
  fontWeight: 'var(--font-weight-medium)',
} as const;

const INPUT_STYLE = {
  padding: 'var(--space-3)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border-default)',
  backgroundColor: 'var(--bg-tertiary)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
} as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span style={FIELD_ERROR_STYLE}>{message}</span>;
}

export interface BusinessFormProps {
  categories: BusinessCategoryOption[];
  tenantId: string | null;
}

export default function BusinessForm({ categories, tenantId }: BusinessFormProps) {
  const router = useRouter();
  const supabase = createClient();
  const responsibleDraft = loadResponsibleDraft();

  const [cnpj, setCnpj] = useState('');
  const [legalName, setLegalName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [phone, setPhone] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [isMasonicConnectionPublic, setIsMasonicConnectionPublic] = useState(true);
  const [errors, setErrors] = useState<BusinessStepErrors>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State para Autorização Empresarial (ADV-007b)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authorizationData, setAuthorizationData] = useState<{
    authorizationTermAccepted: boolean;
    representationScope: string;
    termHash: string;
  } | null>(null);

  const isRepresentativeRole = responsibleDraft?.relationship === 'representative';

  const updateField = (field: keyof BusinessStepErrors, value: string) => {
    const next = { cnpj, legalName, tradingName, phone, categoryId };
    next[field] = value;

    if (field === 'cnpj') setCnpj(formatCnpj(value));
    if (field === 'legalName') setLegalName(value);
    if (field === 'tradingName') setTradingName(value);
    if (field === 'phone') setPhone(value);
    if (field === 'categoryId') setCategoryId(value);

    const nextErrors = validateBusinessStep(next);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  };

  const processSubmission = async (authData = authorizationData) => {
    setLoading(true);
    setErrorMsg(null);

    const nextErrors = validateBusinessStep({ cnpj, legalName, tradingName, phone, categoryId });
    setErrors(nextErrors);
    if (hasBusinessStepErrors(nextErrors)) {
      setLoading(false);
      return;
    }
    if (!tenantId) {
      setErrorMsg('Identificador do tenant não resolvido. Entre em contato com o administrador.');
      setLoading(false);
      return;
    }

    // Gate: Se for representante/procurador e ainda não preencheu autorização, abre o modal ADV-007b
    if (isRepresentativeRole && !authData?.authorizationTermAccepted) {
      setIsAuthModalOpen(true);
      setLoading(false);
      return;
    }

    // LGPD (CRIT-TRN-012): registra consentimento para dados sensíveis
    const hasMasonicDeclaration =
      responsibleDraft?.masonic && responsibleDraft.masonic.status !== 'none';
    if (hasMasonicDeclaration) {
      const { error: consentError } = await supabase.rpc('grant_sensitive_consent', {
        p_purpose: 'masonic_affiliation_publication',
        p_version: '1.0',
      });
      if (consentError) {
        setErrorMsg(
          `Não foi possível registrar o consentimento LGPD: ${consentError.message}. Nenhum dado foi salvo.`,
        );
        setLoading(false);
        return;
      }
      const { error: acceptanceError } = await supabase.rpc('accept_legal_doc', {
        p_code: 'privacy_policy',
        p_version: '1.0',
      });
      if (acceptanceError) {
        setErrorMsg(
          `Não foi possível registrar o aceite da Política de Privacidade: ${acceptanceError.message}.`,
        );
        setLoading(false);
        return;
      }
    }

    const result = await createBusinessDraft(supabase, {
      tenantId,
      cnpj,
      legalName,
      tradingName,
      phone,
      categoryId,
    });

    if (result.ok) {
      if (hasMasonicDeclaration && responsibleDraft?.masonic) {
        await upsertMasonicAffiliation(supabase, {
          ...responsibleDraft.masonic,
          masonicConsent: isMasonicConnectionPublic,
        });
      }
      clearResponsibleDraft();
      router.push('/anunciar/passo-3');
    } else {
      setErrorMsg(result.error ?? 'Erro ao salvar a empresa.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processSubmission();
  };

  return (
    <form
      onSubmit={(e) => {
        void handleSubmit(e);
      }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        padding: 'var(--space-5)',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {responsibleDraft && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'var(--bg-tertiary)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-secondary)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-1)',
          }}
        >
          <span>
            Responsável: <strong>{responsibleDraft.name}</strong> ·{' '}
            {responsibleDraft.relationship === 'owner' ? 'Proprietário / Sócio Direto' : 'Representante Comercial / Procurador'}
          </span>
          {responsibleDraft.masonic && (
            <span>
              Vínculo maçônico:{' '}
              <strong>
                {MASONIC_STATUS_LABELS[responsibleDraft.masonic.status]}
                {responsibleDraft.masonic.status === 'mason' &&
                  ` · ${responsibleDraft.masonic.isActive ? 'Ativo' : 'Inativo / pendente'}`}
              </strong>
            </span>
          )}
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'oklch(0.95 0.05 25 / 0.1)',
            border: '1px solid var(--color-error-500)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error-500)',
            fontSize: 'var(--text-sm)',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label htmlFor="cnpj" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
          CNPJ
        </label>
        <input
          id="cnpj"
          type="text"
          inputMode="numeric"
          value={cnpj}
          onChange={(e) => updateField('cnpj', e.target.value)}
          placeholder="00.000.000/0000-00"
          style={INPUT_STYLE}
        />
        <FieldError message={errors.cnpj} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label htmlFor="legal-name" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
          Razão Social
        </label>
        <input
          id="legal-name"
          type="text"
          value={legalName}
          onChange={(e) => updateField('legalName', e.target.value)}
          placeholder="Razão social da empresa"
          style={INPUT_STYLE}
        />
        <FieldError message={errors.legalName} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label htmlFor="trading-name" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
          Nome Fantasia
        </label>
        <input
          id="trading-name"
          type="text"
          value={tradingName}
          onChange={(e) => updateField('tradingName', e.target.value)}
          placeholder="Nome comumente usado pelos clientes"
          style={INPUT_STYLE}
        />
        <FieldError message={errors.tradingName} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label htmlFor="phone" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
          WhatsApp
        </label>
        <input
          id="phone"
          type="tel"
          value={phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="(00) 00000-0000"
          style={INPUT_STYLE}
        />
        <FieldError message={errors.phone} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label htmlFor="category" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
          Categoria
        </label>
        <select
          id="category"
          value={categoryId}
          onChange={(e) => updateField('categoryId', e.target.value)}
          style={INPUT_STYLE}
        >
          <option value="">Selecione uma categoria</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <FieldError message={errors.categoryId} />
      </div>

      {responsibleDraft?.masonic && responsibleDraft.masonic.status !== 'none' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
          <input
            id="masonic-public-consent"
            type="checkbox"
            checked={isMasonicConnectionPublic}
            onChange={(e) => setIsMasonicConnectionPublic(e.target.checked)}
            style={{ cursor: 'pointer', width: 16, height: 16 }}
          />
          <label htmlFor="masonic-public-consent" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            Autorizo exibir publicamente o vínculo fraterno no perfil do Guia (ex: "Empresa de Irmão/Cunhada").
          </label>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        style={{
          marginTop: 'var(--space-2)',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: loading ? 'var(--accent-subtle)' : 'var(--accent)',
          color: 'var(--text-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--text-sm)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Salvando...' : isRepresentativeRole ? 'Autorizar & Continuar · Seleção do Plano' : 'Continuar · Seleção do Plano'}
      </button>

      <MasonicLinkAuthorizationModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        companyName={tradingName || legalName || 'Sua Empresa'}
        applicantName={responsibleDraft?.name || 'Solicitante'}
        businessRole={responsibleDraft?.relationship === 'representative' ? 'authorized_representative' : 'owner'}
        onConfirmAuthorization={(data) => {
          setAuthorizationData(data);
          setIsAuthModalOpen(false);
          void processSubmission(data);
        }}
      />
    </form>
  );
}