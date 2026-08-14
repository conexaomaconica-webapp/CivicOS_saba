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
  const [errors, setErrors] = useState<BusinessStepErrors>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // LGPD (CRIT-TRN-012): antes de persistir qualquer dado sensível de vínculo,
    // registra o consentimento destacado + aceite da Política de Privacidade
    // versionada (com hash SHA-256 da minuta).
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
        await upsertMasonicAffiliation(supabase, responsibleDraft.masonic);
      }
      clearResponsibleDraft();
      router.push('/anunciar/passo-3');
    } else {
      setErrorMsg(result.error ?? 'Erro ao salvar a empresa.');
      setLoading(false);
    }
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
        {loading ? 'Salvando...' : 'Continuar · Seleção do Plano'}
      </button>
    </form>
  );
}