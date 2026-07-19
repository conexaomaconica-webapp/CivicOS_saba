'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingTenant, setFetchingTenant] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const resolveTenant = async () => {
      if (typeof window === 'undefined') return;

      const host = window.location.host;
      // Resolve subdomain, skipping localhost and IP addresses
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

    resolveTenant();
  }, [supabase]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'usuario_comum', // default role
            tenant_id: tenantId, // associated tenant if signed up through subdomain
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        // Sign-up successful. Depending on email confirmation settings,
        // we either redirect to verify email page or auto-login.
        alert('Cadastro realizado com sucesso! Verifique seu e-mail para confirmação se necessário.');
        router.push('/login');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro inesperado ao realizar cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleRegister}
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
            ? `Crie seu perfil de membro para participar deste ecossistema.`
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
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
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
        onMouseEnter={(e) => {
          if (!loading && !fetchingTenant) {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }
        }}
        onMouseLeave={(e) => {
          if (!loading && !fetchingTenant) {
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
