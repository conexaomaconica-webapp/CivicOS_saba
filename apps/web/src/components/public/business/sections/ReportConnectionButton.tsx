'use client';

import { useState, useTransition } from 'react';
import { Flag } from 'lucide-react';
import { reportConnectionAction, type ReportReason } from '@/app/actions/connections';

const REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'foto_inadequada', label: 'Foto inadequada' },
  { value: 'informacao_falsa', label: 'Informação falsa' },
  { value: 'ofensivo', label: 'Conteúdo ofensivo' },
  { value: 'outro', label: 'Outro motivo' },
];

/** Denunciar uma conexão pública (só membro logado). A administração da plataforma analisa. */
export function ReportConnectionButton({ connectionId, loginRedirect }: { connectionId: string; loginRedirect: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('foto_inadequada');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const send = () => {
    setError('');
    startTransition(async () => {
      const res = await reportConnectionAction(connectionId, reason);
      if (res.unauthorized) {
        window.location.href = `/login?redirect=${encodeURIComponent(loginRedirect)}`;
        return;
      }
      if (!res.success) {
        setError(res.error || 'Não foi possível enviar a denúncia.');
        return;
      }
      setDone(true);
      setOpen(false);
    });
  };

  if (done) return <span className="text-[10px] text-stone-500">Denúncia enviada. Obrigado.</span>;

  return (
    <span className="relative inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-400 hover:text-rose-700"
        aria-expanded={open}
      >
        <Flag className="h-3 w-3" />
        Denunciar
      </button>
      {open && (
        <span className="absolute right-0 top-5 z-20 w-52 space-y-2 rounded-xl border border-stone-200 bg-white p-3 shadow-lg">
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value as ReportReason)}
            className="w-full rounded-lg border border-stone-300 px-2 py-1.5 text-xs"
            aria-label="Motivo da denúncia"
          >
            {REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={send}
            disabled={pending}
            className="w-full rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {pending ? 'Enviando…' : 'Enviar denúncia'}
          </button>
          {error && <span className="block text-[10px] text-rose-700" role="alert">{error}</span>}
        </span>
      )}
    </span>
  );
}
