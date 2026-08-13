'use client';

import React, { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updatePersonalProfile, updatePassword } from '@/lib/auth/auth-service';
import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  hasErrors,
} from '@/lib/auth/validation';

export interface ProfileFormData {
  user: {
    id: string;
    email: string;
    name: string;
  };
  profile: {
    role: string;
    createdAt: string;
  };
}

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
  transition: 'border-color var(--duration-fast) var(--ease-default)',
  outline: 'none',
} as const;

const FIELD_LABEL_STYLE = {
  fontSize: 'var(--text-xs)',
  fontWeight: 'var(--font-weight-semibold)',
  color: 'var(--text-secondary)',
} as const;

const CARD_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--space-4)',
  padding: 'var(--space-5)',
  backgroundColor: 'var(--bg-secondary)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-lg)',
  marginBottom: 'var(--space-4)',
} as const;

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span style={FIELD_ERROR_STYLE}>{message}</span>;
}

function Banner({ kind, children }: { kind: 'info' | 'error'; children: React.ReactNode }) {
  const colors =
    kind === 'error'
      ? { backgroundColor: 'oklch(0.95 0.05 25 / 0.1)', borderColor: 'var(--color-error-500)', color: 'var(--color-error-500)' }
      : { backgroundColor: 'oklch(0.93 0.06 160 / 0.1)', borderColor: 'oklch(0.55 0.12 160)', color: 'oklch(0.4 0.1 160)' };
  return (
    <div
      style={{
        padding: 'var(--space-3)',
        backgroundColor: colors.backgroundColor,
        border: `1px solid ${colors.borderColor}`,
        borderRadius: 'var(--radius-md)',
        color: colors.color,
        fontSize: 'var(--text-sm)',
        fontWeight: 'var(--font-weight-medium)',
      }}
    >
      {children}
    </div>
  );
}

function SubmitButton({
  loading,
  label,
  loadingLabel,
}: {
  loading: boolean;
  label: string;
  loadingLabel: string;
}) {
  return (
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
        transition: 'background-color var(--duration-fast) var(--ease-default)',
        width: '100%',
      }}
    >
      {loading ? loadingLabel : label}
    </button>
  );
}

export default function ProfileForm({ user, profile }: ProfileFormData) {
  const supabase = createClient();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileInfo, setProfileInfo] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>(undefined);
  const [confirmError, setConfirmError] = useState<string | undefined>(undefined);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  const roleLabel: Record<string, string> = {
    master: 'Master',
    socio_admin: 'Sócio Administrador',
    anunciante: 'Anunciante',
    usuario_comum: 'Usuário Comum',
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileInfo(null);
    setProfileError(null);

    const nextNameError = validateName(name);
    const nextEmailError = validateEmail(email);
    setNameError(nextNameError ?? undefined);
    setEmailError(nextEmailError ?? undefined);

    if (hasErrors({ name: nextNameError ?? undefined, email: nextEmailError ?? undefined })) {
      setSavingProfile(false);
      return;
    }

    const result = await updatePersonalProfile(supabase, user.id, { name, email });
    if (result.ok) {
      setProfileInfo(
        result.emailConfirmationRequired
          ? 'Perfil atualizado. Verifique seu e-mail para confirmar a alteração de endereço.'
          : 'Perfil atualizado com sucesso.',
      );
    } else {
      setProfileError(result.error ?? 'Erro ao atualizar seu perfil.');
    }
    setSavingProfile(false);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPassword(true);
    setPasswordInfo(null);
    setPasswordErrorMsg(null);

    const nextPasswordError = validatePassword(password);
    const nextConfirmError = validateConfirmPassword(password, confirmPassword);
    setPasswordError(nextPasswordError ?? undefined);
    setConfirmError(nextConfirmError ?? undefined);

    if (hasErrors({ password: nextPasswordError ?? undefined, confirmPassword: nextConfirmError ?? undefined })) {
      setSavingPassword(false);
      return;
    }

    const { error } = await updatePassword(supabase, password);
    if (error) {
      setPasswordErrorMsg(error.message);
    } else {
      setPasswordInfo('Senha atualizada com sucesso.');
      setPassword('');
      setConfirmPassword('');
    }
    setSavingPassword(false);
  };

  const createdAt = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('pt-BR')
    : '—';

  return (
    <>
      <section style={CARD_STYLE}>
        <h2
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-primary)',
          }}
        >
          Dados Pessoais
        </h2>

        {profileInfo && <Banner kind="info">{profileInfo}</Banner>}
        {profileError && <Banner kind="error">{profileError}</Banner>}

        <form
          onSubmit={(e) => {
            void handleProfileSubmit(e);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="name" style={FIELD_LABEL_STYLE}>
              Nome Completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              style={INPUT_STYLE}
            />
            <FieldError message={nameError} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="email" style={FIELD_LABEL_STYLE}>
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              style={INPUT_STYLE}
            />
            <FieldError message={emailError} />
          </div>

          <SubmitButton
            loading={savingProfile}
            label="Salvar Alterações"
            loadingLabel="Salvando..."
          />
        </form>
      </section>

      <section style={CARD_STYLE}>
        <h2
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-primary)',
          }}
        >
          Sobre a Conta
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...FIELD_LABEL_STYLE, paddingTop: 'var(--space-2)' }}>Papel</span>
            <span
              style={{
                padding: 'var(--space-1) var(--space-2)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--text-primary)',
              }}
            >
              {roleLabel[profile.role] ?? profile.role}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...FIELD_LABEL_STYLE, paddingTop: 'var(--space-2)' }}>Membro desde</span>
            <span
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--text-secondary)',
                paddingTop: 'var(--space-1)',
              }}
            >
              {createdAt}
            </span>
          </div>
        </div>
      </section>

      <section style={CARD_STYLE}>
        <h2
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 'var(--font-weight-semibold)',
            color: 'var(--text-primary)',
          }}
        >
          Segurança
        </h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          Troque sua senha periodicamente e nunca a compartilhe.
        </p>

        {passwordInfo && <Banner kind="info">{passwordInfo}</Banner>}
        {passwordErrorMsg && <Banner kind="error">{passwordErrorMsg}</Banner>}

        <form
          onSubmit={(e) => {
            void handlePasswordSubmit(e);
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="new-password" style={FIELD_LABEL_STYLE}>
              Nova Senha
            </label>
            <input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              style={INPUT_STYLE}
            />
            <FieldError message={passwordError} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            <label htmlFor="confirm-password" style={FIELD_LABEL_STYLE}>
              Confirmar Nova Senha
            </label>
            <input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              style={INPUT_STYLE}
            />
            <FieldError message={confirmError} />
          </div>

          <SubmitButton
            loading={savingPassword}
            label="Atualizar Senha"
            loadingLabel="Atualizando..."
          />
        </form>
      </section>
    </>
  );
}