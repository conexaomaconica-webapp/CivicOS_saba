'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active Session State
  const [activeUser, setActiveUser] = useState<import('@supabase/supabase-js').User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setActiveUser(user);
      setCheckingSession(false);
    };
    void checkSession();
  }, [supabase]);

  const handleLogout = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await supabase.auth.signOut();
      setActiveUser(null);
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao deslogar da conta.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.refresh();
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro inesperado ao realizar login.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-8) 0' }}>
        <div
          style={{
            width: 32,
            height: 32,
            border: '3px solid var(--border-default)',
            borderTopColor: 'var(--accent)',
            borderRadius: 'var(--radius-full)',
            animation: 'spin 0.8s linear infinite',
            marginBottom: 'var(--space-3)',
          }}
        />
        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Verificando sessão ativa...</p>
      </div>
    );
  }

  if (activeUser) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', width: '100%', fontFamily: 'var(--font-sans)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--text-primary)' }}>
            Sessão Ativa Detectada
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            Você já está conectado na plataforma como:
          </p>
          <div
            style={{
              padding: 'var(--space-3)',
              backgroundColor: 'var(--bg-tertiary)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'bold',
              color: 'var(--text-primary)',
              wordBreak: 'break-all',
              marginTop: 'var(--space-1)',
            }}
          >
            {activeUser.email}
          </div>
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
            }}
          >
            {errorMsg}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Link
            href="/dashboard"
            style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)',
              color: 'var(--text-inverse)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--text-sm)',
              textAlign: 'center',
              textDecoration: 'none',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            Acessar Painel (Dashboard)
          </Link>
          
          <button
            onClick={() => { void handleLogout(); }}
            disabled={loading}
            style={{
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'oklch(0.60 0.22 25 / 0.1)',
              color: 'var(--color-error-500)',
              fontWeight: 'var(--font-weight-semibold)',
              fontSize: 'var(--text-sm)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? 'Saindo...' : 'Sair desta Conta'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => { void handleLogin(e); }}
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
          Bem-vindo de volta
        </h3>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Entre com seu e-mail e senha para acessar sua conta.
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
          onChange={(e) => setEmail(e.target.value)}
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
      </div>

      {/* Password Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <label
            htmlFor="password"
            style={{
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--font-weight-semibold)',
              color: 'var(--text-secondary)',
            }}
          >
            Senha de Acesso
          </label>
          <Link
            href="/forgot-password"
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-link)',
              fontWeight: 'var(--font-weight-medium)',
            }}
          >
            Esqueceu a senha?
          </Link>
        </div>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Sua senha secreta"
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
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        style={{
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: loading ? 'var(--accent-subtle)' : 'var(--accent)',
          color: 'var(--text-inverse)',
          fontWeight: 'var(--font-weight-semibold)',
          fontSize: 'var(--text-sm)',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background-color var(--duration-fast) var(--ease-default), transform var(--duration-fast) var(--ease-spring)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
          boxShadow: 'var(--shadow-sm)',
          marginTop: 'var(--space-2)',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
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
            Entrando...
          </>
        ) : (
          'Entrar no Painel'
        )}
      </button>

      {/* Register Link */}
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
        <span>Não tem uma conta?</span>
        <Link
          href="/register"
          style={{
            color: 'var(--text-link)',
            fontWeight: 'var(--font-weight-semibold)',
          }}
        >
          Cadastre-se grátis
        </Link>
      </div>
    </form>
  );
}
