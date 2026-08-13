'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  validateResponsibleStep,
  hasResponsibleStepErrors,
  RESPONSIBLE_RELATIONSHIP_LABELS,
  type ResponsibleRelationship,
  type ResponsibleStepErrors,
} from '@/lib/onboarding/onboarding-validation';
import { saveResponsibleDraft } from '@/lib/onboarding/responsible-flow';

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
  const [errors, setErrors] = useState<ResponsibleStepErrors>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateField = (field: 'name' | 'email' | 'relationship', value: string) => {
    const next: {
      name: string;
      email: string;
      relationship: ResponsibleRelationship | '';
    } = {
      name,
      email,
      relationship,
    };
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const nextErrors = validateResponsibleStep({ name, email, relationship });
    setErrors(nextErrors);
    if (hasResponsibleStepErrors(nextErrors)) {
      setLoading(false);
      return;
    }

    const saved = saveResponsibleDraft({
      name: name.trim(),
      email: email.trim(),
      relationship: relationship as ResponsibleRelationship,
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
            <label
              key={value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-3)',
                backgroundColor: relationship === value ? 'var(--accent-subtle)' : 'var(--bg-tertiary)',
                border: `1px solid ${relationship === value ? 'var(--accent)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
              }}
            >
              <input
                type="radio"
                name="relationship"
                value={value}
                checked={relationship === value}
                onChange={() => updateField('relationship', value)}
              />
              <span>{RESPONSIBLE_RELATIONSHIP_LABELS[value]}</span>
            </label>
          ))}
        </div>
        <FieldError message={errors.relationship} />
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