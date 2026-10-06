'use client';

import Link from 'next/link';
import { FormEvent, useState, useTransition } from 'react';
import { Eye, EyeOff, KeyRound, Loader2 } from 'lucide-react';
import { changeMemberPasswordAction } from '@/lib/member/member-password-service';

const MIN_LENGTH = 8;

function Field({
  label,
  value,
  onChange,
  autoComplete,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  hint?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <label className="block text-xs font-bold text-stone-700">
      {label}
      <span className="relative mt-1 block">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          required
          className="block w-full rounded-xl border border-stone-300 px-3 py-2.5 pr-12 text-sm font-normal"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </span>
      {hint && <span className="mt-1 block text-[11px] font-normal text-stone-500">{hint}</span>}
    </label>
  );
}

export default function PasswordForm({ canChangePassword }: { canChangePassword: boolean }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  if (!canChangePassword) {
    return (
      <section className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600 shadow-xs">
        Sua conta entra por um provedor externo e não possui senha própria nesta plataforma.
      </section>
    );
  }

  const mismatch = confirm.length > 0 && next !== confirm;
  const tooShort = next.length > 0 && next.length < MIN_LENGTH;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(undefined);
    startTransition(async () => {
      const result = await changeMemberPasswordAction({ currentPassword: current, newPassword: next, confirmPassword: confirm });
      setMessage({ ok: result.success, text: result.success ? 'Senha alterada com sucesso.' : result.error || 'Não foi possível alterar a senha.' });
      if (result.success) {
        setCurrent('');
        setNext('');
        setConfirm('');
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[var(--member-accent)]" aria-hidden />
          <h2 className="font-serif font-bold text-[var(--member-primary)]">Alterar senha</h2>
        </div>
        <Field label="Senha atual" value={current} onChange={setCurrent} autoComplete="current-password" />
        <Field
          label="Nova senha"
          value={next}
          onChange={setNext}
          autoComplete="new-password"
          hint={tooShort ? `Use pelo menos ${MIN_LENGTH} caracteres.` : `Mínimo de ${MIN_LENGTH} caracteres. Evite senhas usadas em outros sites.`}
        />
        <Field label="Confirmar nova senha" value={confirm} onChange={setConfirm} autoComplete="new-password" hint={mismatch ? 'A confirmação não confere.' : undefined} />
        <p className="text-xs text-stone-500">
          Esqueceu a senha atual? <Link href="/forgot-password" className="font-bold underline">Receba um link por e-mail</Link>.
        </p>
      </section>

      {message && (
        <div
          className={`rounded-xl border p-3 text-sm ${message.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}
          role={message.ok ? 'status' : 'alert'}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          disabled={pending || tooShort || mismatch || !current || !next || !confirm}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--member-primary)] px-5 py-3 text-sm font-bold text-[var(--member-primary-fg)] disabled:opacity-60 sm:w-auto"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Alterar senha
        </button>
      </div>
    </form>
  );
}
