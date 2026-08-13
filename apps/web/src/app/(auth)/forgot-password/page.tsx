'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { sendPasswordResetEmail } from '@/lib/auth/auth-service';
import { validateEmail } from '@/lib/auth/validation';

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

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccess(false);

    const nextEmailError = validateEmail(email);
    setEmailError(nextEmailError ?? undefined);
    if (nextEmailError) {
      setLoading(false);
      return;
    }

    try {
      const { error } = await sendPasswordResetEmail(
        supabase,
        email.trim(),
        `${window.location.origin}/auth/callback?next=/update-password`,
      );

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccess(true);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado ao enviar link de recuperação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={(e) => { void handleResetPassword(e); }}
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
          Recuperar Senha
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Forneça seu endereço de e-mail e enviaremos as instruções de recuperação.
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

      {success && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'oklch(0.95 0.05 145 / 0.1)',
            border: '1px solid var(--color-success-500)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-success-500)',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--font-weight-medium)',
          }}
        >
          E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada.
        </div>
      )}

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
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(validateEmail(e.target.value) ?? undefined);
          }}
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
          onFocus={(e) => {
            e.target.style.borderColor = 'var(--border-focus)';
            e.target.style.backgroundColor = 'var(--bg-secondary)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = 'var(--border-default)';
            e.target.style.backgroundColor = 'var(--bg-tertiary)';
          }}
        />
        <FieldError message={emailError} />
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading || success}
        style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: (loading || success) ? 'var(--accent-subtle)' : 'var(--accent)',
          color: 'var(--text-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--text-sm)',
          border: 'none',
          cursor: (loading || success) ? 'not-allowed' : 'pointer',
          transition: 'background-color var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-spring)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          boxShadow: 'var(--shadow-sm)',
          marginTop: 'var(--space-2)',
        }}
        onMouseEnter={(e) => {
          if (!loading && !success) {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading && !success) {
            e.currentTarget.style.backgroundColor = 'var(--accent)';
            e.currentTarget.style.transform = 'translateY(0)';
          }
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
            Enviando...
          </>
        ) : (
          'Enviar Instruções'
        )}
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
        <Link
          href="/login"
          style={{
            color: 'var(--text-link)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          Voltar para o Login
        </Link>
      </div>
    </form>
  );
}
