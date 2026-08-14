'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  validateResponsibleStep,
  hasResponsibleStepErrors,
  RESPONSIBLE_RELATIONSHIP_LABELS,
  type ResponsibleRelationship,
  type ResponsibleStepErrors,
} from '@/lib/onboarding/onboarding-validation';
import {
  MASONIC_STATUS_OPTIONS,
  MASONIC_STATUS_LABELS,
  validateMasonicStep,
  hasMasonicStepErrors,
  emptyMasonicAffiliation,
  toPersistedAffiliation,
  type MasonicAffiliationInput,
  type MasonicStepErrors,
} from '@/lib/masonic/masonic-affiliation';
import {
  saveResponsibleDraft,
  loadResponsibleDraft,
} from '@/lib/onboarding/responsible-flow';

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

function RadioOption({
  name,
  value,
  checked,
  label,
  onChange,
}: {
  name: string;
  value: string;
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3)',
        backgroundColor: checked ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
        border: `1px solid ${checked ? 'var(--accent)' : 'var(--border-default)'}`,
        borderRadius: 'var(--radius-md)',
        cursor: 'pointer',
        fontSize: 'var(--text-sm)',
        color: 'var(--text-primary)',
      }}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}

export interface ResponsibleFormProps {
  authenticated: boolean;
  initial: {
    name: string;
    email: string;
  };
}

export default function ResponsibleForm({ authenticated, initial }: ResponsibleFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [relationship, setRelationship] = useState<ResponsibleRelationship | ''>('');
  const [masonic, setMasonic] = useState<MasonicAffiliationInput>(emptyMasonicAffiliation);
  const [errors, setErrors] = useState<ResponsibleStepErrors>({});
  const [masonicErrors, setMasonicErrors] = useState<MasonicStepErrors>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const existing = loadResponsibleDraft();
    if (!existing) return;
    setRelationship(existing.relationship);
    if (existing.masonic) {
      setMasonic({
        status: existing.masonic.status,
        isActive: existing.masonic.isActive,
        cimbCode: existing.masonic.cimbCode,
        lodgeName: existing.masonic.lodgeName,
        chapterName: existing.masonic.chapterName,
        spouseMasonName: existing.masonic.spouseMasonName,
        masonicConsent: existing.masonic.masonicConsent,
      });
    }
  }, []);

  const updateField = (field: 'name' | 'email' | 'relationship', value: string) => {
    const next: {
      name: string;
      email: string;
      relationship: ResponsibleRelationship | '';
    } = { name, email, relationship };
    if (field === 'name') {
      next.name = value;
      setName(value);
    }
    if (field === 'email') {
      next.email = value;
      setEmail(value);
    }
    if (field === 'relationship') {
      next.relationship = value as ResponsibleRelationship | '';
      setRelationship(next.relationship);
    }
    const nextErrors = validateResponsibleStep(next);
    setErrors((prev) => ({ ...prev, [field]: nextErrors[field] }));
  };

  const updateMasonic = (partial: Partial<MasonicAffiliationInput>) => {
    const next = { ...masonic, ...partial };
    if (partial.status && partial.status !== masonic.status) {
      next.isActive = null;
      next.cimbCode = '';
      next.lodgeName = '';
      next.chapterName = '';
      next.spouseMasonName = '';
    }
    setMasonic(next);
    const nextErrors = validateMasonicStep(next);
    const changedKey = (Object.keys(partial) as (keyof typeof nextErrors)[])[0];
    if (changedKey && changedKey in nextErrors) {
      setMasonicErrors((prev) => ({ ...prev, [changedKey]: nextErrors[changedKey] }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const nextErrors = validateResponsibleStep({ name, email, relationship });
    const nextMasonicErrors = validateMasonicStep(masonic);
    setErrors(nextErrors);
    setMasonicErrors(nextMasonicErrors);

    if (hasResponsibleStepErrors(nextErrors) || hasMasonicStepErrors(nextMasonicErrors)) {
      setLoading(false);
      return;
    }

    const saved = saveResponsibleDraft({
      name: name.trim(),
      email: email.trim(),
      relationship: relationship as ResponsibleRelationship,
      masonic: toPersistedAffiliation(masonic),
    });
    if (!saved) {
      setErrorMsg('Não foi possível salvar os dados neste navegador.');
      setLoading(false);
      return;
    }

    if (authenticated) {
      router.push('/anunciar/passo-2');
    } else {
      router.push('/login?redirect=%2Fanunciar%2Fpasso-1');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
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
        <label htmlFor="name" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
          Nome Completo
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Seu nome completo"
          style={INPUT_STYLE}
        />
        <FieldError message={errors.name} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label htmlFor="email" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
          E-mail
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="voce@exemplo.com"
          style={INPUT_STYLE}
        />
        <FieldError message={errors.email} />
      </div>

      <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', border: 'none', padding: 0 }}>
        <legend style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
          Qual sua relação com a empresa?
        </legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {(Object.keys(RESPONSIBLE_RELATIONSHIP_LABELS) as ResponsibleRelationship[]).map((value) => (
            <RadioOption
              key={value}
              name="relationship"
              value={value}
              checked={relationship === value}
              label={RESPONSIBLE_RELATIONSHIP_LABELS[value]}
              onChange={() => updateField('relationship', value)}
            />
          ))}
        </div>
        <FieldError message={errors.relationship} />
      </fieldset>

      <fieldset style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', border: 'none', padding: 0 }}>
        <legend
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-bold)',
            color: 'var(--text-secondary)',
            marginBottom: 'var(--space-1)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Vínculo com a Maçonaria
        </legend>
        <p style={{ margin: 0, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
          Sua declaração é usada para habilitar o Selo de Membro Maçônico e validar
          o vínculo fraterno da empresa (CRIT-VSC-003).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {MASONIC_STATUS_OPTIONS.map((status) => (
            <RadioOption
              key={status}
              name="masonicStatus"
              value={status}
              checked={masonic.status === status}
              label={MASONIC_STATUS_LABELS[status]}
              onChange={() => updateMasonic({ status })}
            />
          ))}
        </div>
        <FieldError message={masonicErrors.status} />

        {masonic.status && masonic.status !== 'none' && (
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
              padding: 'var(--space-3)',
              backgroundColor: masonic.masonicConsent ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
              border: `1px solid ${masonic.masonicConsent ? 'var(--accent)' : 'var(--border-default)'}`,
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
            }}
          >
            <input
              type="checkbox"
              name="masonicConsent"
              checked={masonic.masonicConsent === true}
              onChange={(e) => updateMasonic({ masonicConsent: e.target.checked })}
              style={{ marginTop: 'var(--space-1)' }}
            />
            <span>
              Autorizo o tratamento dos meus dados maçônicos (vínculo, loja, CIMB e status de
              membro — dado pessoal sensível) pela Conexão Maçônica para verificação fraterna,
              emissão do selo e operação do guia, conforme a{' '}
              <strong>Política de Privacidade v1.0</strong>. Entendo que posso revogar este
              consentimento a qualquer momento na tela de Privacidade do meu perfil.
            </span>
          </label>
        )}
        <FieldError message={masonicErrors.consent} />

        {masonic.status === 'mason' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
                Você está ativo na Ordem?
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <RadioOption
                  name="masonicActive"
                  value="true"
                  checked={masonic.isActive === true}
                  label="Sim, ativo"
                  onChange={() => updateMasonic({ isActive: true })}
                />
                <RadioOption
                  name="masonicActive"
                  value="false"
                  checked={masonic.isActive === false}
                  label="Não ativo / pendente"
                  onChange={() => updateMasonic({ isActive: false })}
                />
              </div>
              <FieldError message={masonicErrors.isActive} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="cimb" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
                CIMB — Carteira de Identificação Maçônica
              </label>
              <input
                id="cimb"
                type="text"
                inputMode="numeric"
                value={masonic.cimbCode}
                onChange={(e) => updateMasonic({ cimbCode: e.target.value })}
                placeholder="Número do CIMB"
                style={INPUT_STYLE}
              />
              <FieldError message={masonicErrors.cimbCode} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              <label htmlFor="lodge" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
                Loja Maçônica (opcional)
              </label>
              <input
                id="lodge"
                type="text"
                value={masonic.lodgeName}
                onChange={(e) => updateMasonic({ lodgeName: e.target.value })}
                placeholder="Nome da Loja"
                style={INPUT_STYLE}
              />
            </div>
          </div>
        )}

        {masonic.status === 'mason_wife' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="spouse" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
              Nome do marido maçom
            </label>
            <input
              id="spouse"
              type="text"
              value={masonic.spouseMasonName}
              onChange={(e) => updateMasonic({ spouseMasonName: e.target.value })}
              placeholder="Nome completo do marido maçom"
              style={INPUT_STYLE}
            />
            <FieldError message={masonicErrors.spouseMasonName} />
          </div>
        )}

        {(masonic.status === 'demolay' || masonic.status === 'job_daughter') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="chapter" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-secondary)' }}>
              {masonic.status === 'demolay' ? 'Capítulo DeMolay' : 'Capítulo / Beth-El (Filha de Jó)'}
            </label>
            <input
              id="chapter"
              type="text"
              value={masonic.chapterName}
              onChange={(e) => updateMasonic({ chapterName: e.target.value })}
              placeholder="Nome do Capítulo"
              style={INPUT_STYLE}
            />
            <FieldError message={masonicErrors.chapterName} />
          </div>
        )}
      </fieldset>

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
          transition: 'background-color var(--duration-fast) var(--ease-default)',
        }}
      >
        {loading ? 'Salvando...' : authenticated ? 'Continuar · Dados da Empresa' : 'Continuar · Criar minha conta'}
      </button>

      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
        {authenticated
          ? 'Seus dados serão vinculados como responsáveis pelo anúncio (titular da empresa).'
          : 'Ao continuar você criará sua conta e retornará para esta etapa automaticamente.'}
      </p>
    </form>
  );
}