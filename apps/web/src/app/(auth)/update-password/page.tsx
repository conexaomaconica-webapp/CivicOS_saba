'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getSession, updatePassword, signOut } from '@/lib/auth/auth-service';
import { validatePassword, validateConfirmPassword, hasErrors } from '@/lib/auth/validation';

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

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const { user } = await getSession(supabase);
      setAuthenticated(Boolean(user));
      setCheckingSession(false);
    };
    void check();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validateConfirmPassword(password, confirmPassword);
    setPasswordError(nextPasswordError ?? undefined);
    setConfirmError(nextConfirmError ?? undefined);

    if (hasErrors({
      password: nextPasswordError ?? undefined,
      confirmPassword: nextConfirmError ?? undefined,
    })) {
      setLoading(false);
      return;
    }

    try {
      await updatePassword(supabase, password);
      await signOut(supabase);
      router.push('/login?reset=ok');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao atualizar sua senha.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8) 0' }}>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Verificando sessão...</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { void handleSubmit(e); }}
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
          Definir Nova Senha
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Escolha uma nova senha forte para sua conta.
        </p>
      </div>

      {!authenticated && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'oklch(0.9 0.1 60 / 0.12)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-sm)',
          }}
        >
          Você não possui uma sessão ativa de recuperação. Use o link enviado por e-mail para acessar esta página.{' '}
          <Link href="/forgot-password" style={{ color: 'var(--text-link)', fontWeight: 'var(--font-weight-semibold)' }}>
            Solicitar novo link
          </Link>
        </div>
      )}

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

      {/* New Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label
          htmlFor="password"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-secondary)',
          }}
        >
          Nova Senha
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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
        <FieldError message={passwordError} />
      </div>

      {/* Confirm New Password */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <label
          htmlFor="confirm-password"
          style={{
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-secondary)',
          }}
        >
          Confirmar Nova Senha
        </label>
        <input
          id="confirm-password"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repita a nova senha"
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
        <FieldError message={confirmError} />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || !authenticated}
        style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: (loading || !authenticated) ? 'var(--accent-subtle)' : 'var(--accent)',
          color: 'var(--text-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--text-sm)',
          border: 'none',
          cursor: (loading || !authenticated) ? 'not-allowed' : 'pointer',
          transition: 'background-color var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-spring)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          boxShadow: 'var(--shadow-sm)',
          marginTop: 'var(--space-2)',
        }}
      >
        {loading ? 'Salvando...' : 'Salvar Nova Senha'}
      </button>

      {/* Back to Login Link */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-secondary)',
          marginTop: 'var(--space-2)',
        }}
      >
        <Link href="/login" style={{ color: 'var(--text-link)', fontWeight: 'var(--font-weight-semibold)' }}>
          Voltar para o Login
        </Link>
      </div>
    </form>
  );
}