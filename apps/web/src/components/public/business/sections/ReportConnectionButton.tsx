'use client';

import { useEffect, useId, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { Flag, X } from 'lucide-react';
import { reportConnectionAction, type ReportReason } from '@/app/actions/connections';

const REASONS: Array<{ value: ReportReason; label: string; hint: string }> = [
  { value: 'foto_inadequada', label: 'Foto inadequada', hint: 'A imagem não é apropriada ou não tem relação com a empresa.' },
  { value: 'informacao_falsa', label: 'Informação falsa', hint: 'A conexão não aconteceu ou os dados estão errados.' },
  { value: 'ofensivo', label: 'Conteúdo ofensivo', hint: 'Texto ou imagem que desrespeita alguém.' },
  { value: 'outro', label: 'Outro motivo', hint: 'Explique abaixo o que está errado.' },
];

const DETAILS_MAX = 300;
const OTHER_MIN = 5;

/**
 * Denunciar uma conexão pública (só membro logado). A administração da plataforma analisa.
 *
 * A janela é renderizada FORA do card (portal no <body>, posição fixa): cartões com `overflow-hidden` não cortam mais o formulário
 * e cliques nela não acionam o link do card.
 */
export function ReportConnectionButton({ connectionId, loginRedirect }: { connectionId: string; loginRedirect: string }) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>('foto_inadequada');
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const send = () => {
    setError('');
    const text = details.trim();
    if (reason === 'outro' && text.length < OTHER_MIN) {
      setError('Para "Outro motivo", conte em poucas palavras o que está errado.');
      return;
    }
    startTransition(async () => {
      const res = await reportConnectionAction(connectionId, reason, text || undefined);
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
    <>
      <button
        type="button"
        onClick={(event) => { event.preventDefault(); event.stopPropagation(); setError(''); setOpen(true); }}
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-stone-400 hover:text-rose-700"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Flag className="h-3 w-3" />
        Denunciar
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-3 sm:items-center"
          onClick={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) setOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="flex items-center gap-2 font-serif text-lg font-bold text-[#3B0B14]">
                <Flag className="h-4 w-4 text-rose-700" aria-hidden="true" /> Denunciar esta conexão
              </h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar" className="rounded-lg p-1 text-stone-500 hover:bg-stone-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-stone-600">Nossa equipe analisa cada denúncia. Escolha o motivo e, se puder, explique o que aconteceu.</p>

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">Motivo da denúncia</legend>
              {REASONS.map((item) => (
                <label
                  key={item.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm ${reason === item.value ? 'border-rose-600 bg-rose-50' : 'border-stone-200 hover:bg-stone-50'}`}
                >
                  <input
                    type="radio"
                    name={`report-reason-${connectionId}`}
                    value={item.value}
                    checked={reason === item.value}
                    onChange={() => setReason(item.value)}
                    className="mt-0.5 accent-rose-700"
                  />
                  <span>
                    <span className="block font-semibold text-stone-900">{item.label}</span>
                    <span className="block text-xs text-stone-600">{item.hint}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="mt-4 block text-xs font-semibold text-stone-700">
              Justificativa {reason === 'outro' ? '(obrigatória)' : '(opcional)'}
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value.slice(0, DETAILS_MAX))}
                rows={3}
                maxLength={DETAILS_MAX}
                placeholder="Conte em poucas palavras o que está errado."
                className="mt-1 block w-full rounded-xl border border-stone-300 px-3 py-2 text-sm font-normal text-stone-900 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
              <span className="mt-1 block text-right text-[10px] font-normal text-stone-500">{details.length}/{DETAILS_MAX}</span>
            </label>

            {error && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-xs font-medium text-rose-800" role="alert">{error}</p>}

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={send}
                disabled={pending}
                className="flex-1 rounded-xl bg-rose-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {pending ? 'Enviando…' : 'Enviar denúncia'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">
                Cancelar
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
