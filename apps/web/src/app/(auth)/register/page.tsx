'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signUp } from '@/lib/auth/auth-service';
import {
  validateRegistration,
  hasErrors,
  type RegistrationErrors,
  type RegistrationFields,
} from '@/lib/auth/validation';

const FIELD_ERROR_STYLE = {
  marginTop: 'var(--space-1)',
  fontSize: 'var(--text-xs)',
  color: 'var(--color-error-500)',
  fontWeight: 'var(--font-weight-medium)',
} as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span style={FIELD_ERROR_STYLE}>{message}</span>;
}

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [fields, setFields] = useState<RegistrationFields>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<RegistrationErrors>({});
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingTenant, setFetchingTenant] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const resolveTenant = async () => {
      if (typeof window === 'undefined') return;

      const host = window.location.host;
      if (host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) {
        setFetchingTenant(false);
        return;
      }

      const parts = host.split('.');
      if (parts.length >= 3) {
        const subdomain = parts[0];
        if (subdomain && subdomain !== 'www') {
          try {
            const { data } = await supabase
              .from('tenants')
              .select('id, name')
              .eq('slug', subdomain)
              .maybeSingle();

            if (data) {
              setTenantId(data.id);
              setTenantName(data.name);
            }
          } catch (err) {
            console.error('Error resolving tenant:', err);
          }
        }
      }
      setFetchingTenant(false);
    };

    void resolveTenant();
  }, [supabase]);

  const updateField = (key: keyof RegistrationFields, value: string) => {
    const nextFields = { ...fields, [key]: value };
    setFields(nextFields);
    // CRIT-TRN-023 — validate in real time, error next to the field.
    const nextErrors = validateRegistration(nextFields);
    setErrors({ ...errors, [key]: nextErrors[key] });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const nextErrors = validateRegistration(fields);
    setErrors(nextErrors);

    if (hasErrors(nextErrors)) {
      setLoading(false);
      return;
    }

    try {
      const result = await signUp(supabase, fields.email.trim(), fields.password, {
        name: fields.name.trim(),
        role: 'usuario_comum',
        tenant_id: tenantId,
      });

      if (result.error) {
        setErrorMsg(result.error.message);
      } else {
        alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação se necessário.');
        router.push('/login');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleRegister(e); }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
        width: '100%',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <h3
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-primary)',
          }}
        >
          {tenantName ? `Cadastre-se na ${tenantName}` : 'Criar nova conta'}
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          {tenantName
            ? 'Crie seu perfil de membro para participar deste ecossistema.'
            : 'Preencha os campos abaixo para iniciar sua jornada.'}
        </p>
      </div>

      {errorMsg && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'oklch(0.95 0.05 25 / 0.1)',
            border: '1px solid var(--color-error-500)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-error-500)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          {errorMsg}
        </div>
      )}

      {/* Name Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label
          htmlFor="name"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-secondary)',
          }}
        >
          Nome Completo
        </label>
        <input
          id="name"
          type="text"
          required
          value={fields.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Ex: João Silva"
          style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            transition: 'border-color var(--duration-fast) var(--ease-default)',
            outline: 'none',
          }}
        />
        <FieldError message={errors.name} />
      </div>

      {/* Email Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label
          htmlFor="email"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-secondary)',
          }}
        >
          Endereço de E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          value={fields.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="exemplo@email.com"
          style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            transition: 'border-color var(--duration-fast) var(--ease-default)',
            outline: 'none',
          }}
        />
        <FieldError message={errors.email} />
      </div>

      {/* Password Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label
          htmlFor="password"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-secondary)',
          }}
        >
          Senha
        </label>
        <input
          id="password"
          type="password"
          required
          value={fields.password}
          onChange={(e) => updateField('password', e.target.value)}
          placeholder="Mínimo 8 caracteres"
          style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            transition: 'border-color var(--duration-fast) var(--ease-default)',
            outline: 'none',
          }}
        />
        <FieldError message={errors.password} />
      </div>

      {/* Confirm Password Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label
          htmlFor="confirm-password"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-secondary)',
          }}
        >
          Confirmar Senha
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          value={fields.confirmPassword}
          onChange={(e) => updateField('confirmPassword', e.target.value)}
          placeholder="Repita a sua senha"
          style={{
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-sm)',
            transition: 'border-color var(--duration-fast) var(--ease-default)',
            outline: 'none',
          }}
        />
        <FieldError message={errors.confirmPassword} />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || fetchingTenant}
        style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: (loading || fetchingTenant) ? 'var(--accent-subtle)' : 'var(--accent)',
          color: 'var(--text-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--text-sm)',
          border: 'none',
          cursor: (loading || fetchingTenant) ? 'not-allowed' : 'pointer',
          transition: 'background-color var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-spring)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          boxShadow: 'var(--shadow-sm)',
          marginTop: 'var(--space-2)',
        }}
      >
        {loading ? (
          <>
            <div
              style={{
                width: 16,
                height: 16,
                border: '2px solid var(--text-inverse)',
                borderTopColor: 'transparent',
                borderRadius: 'var(--radius-full)',
                animation: 'spin 0.6s linear infinite',
              }}
            />
            Registrando...
          </>
        ) : (
          'Criar Conta'
        )}
      </button>

      {/* Login Link */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          marginTop: 'var(--space-2)',
          gap: 'var(--space-1)',
        }}
      >
        <span>Já tem uma conta?</span>
        <Link
          href="/login"
          style={{
            color: 'var(--text-link)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          Fazer Login
        </Link>
      </div>
    </form>
  );
}