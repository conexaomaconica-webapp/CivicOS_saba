'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Star } from 'lucide-react';
import { submitBusinessReviewAction } from '@/app/actions/reviews';

type Props = { businessSlug: string };

export function BusinessReviewForm({ businessSlug }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string; login?: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setFeedback(null);
    startTransition(async () => {
      const result = await submitBusinessReviewAction({ businessSlug, rating, comment, isAnonymous });
      if (result.success) {
        setRating(0);
        setComment('');
        setIsAnonymous(false);
        setFeedback({ ok: true, text: 'Avaliação enviada. Ela será publicada após análise da plataforma.' });
      } else {
        setFeedback({ ok: false, text: result.error || 'Não foi possível enviar a avaliação.', login: result.requiresLogin });
      }
    });
  }

  return (
    <div className="rounded-xl border border-[#E8E5DF] bg-[#FDFBF7] p-4 space-y-3">
      <div>
        <h4 className="text-sm font-bold text-[#4B161B]">Avalie esta empresa</h4>
        <p className="mt-0.5 text-[11px] text-stone-600">Entre na sua conta para compartilhar sua experiência. As avaliações passam por moderação antes da publicação. Uma avaliação por usuário por empresa.</p>
      </div>
      <div className="flex gap-1" aria-label="Nota da avaliação">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className="rounded p-1 focus:outline-none focus:ring-2 focus:ring-[#C9A227]"
            aria-label={`${value} ${value === 1 ? 'estrela' : 'estrelas'}`}
          >
            <Star className={`h-5 w-5 ${value <= rating ? 'fill-[#C9A227] text-[#C9A227]' : 'text-stone-300'}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Conte como foi sua experiência..."
        className="w-full resize-y rounded-lg border border-[#D9D3C8] bg-white px-3 py-2 text-sm text-stone-900 outline-none focus:border-[#C9A227] focus:ring-1 focus:ring-[#C9A227]"
      />
      <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#E8E5DF] bg-white px-3 py-2">
        <input type="checkbox" checked={isAnonymous} onChange={(event) => setIsAnonymous(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#4B161B]" />
        <span className="text-xs text-stone-700"><strong>Avaliar anonimamente</strong><span className="mt-0.5 block text-[10px] text-stone-500">Desmarcado: seu nome e sua foto cadastrada podem aparecer. Marcado: ambos ficam ocultos. A plataforma mantém sua identidade apenas para segurança e moderação.</span></span>
      </label>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] text-stone-500">{comment.length}/1000</span>
        <button
          type="button"
          onClick={submit}
          disabled={isPending || rating === 0 || comment.trim().length < 10}
          className="rounded-lg bg-[#4B161B] px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Enviando...' : 'Enviar avaliação'}
        </button>
      </div>
      {feedback && (
        <div role="status" className={`rounded-lg border px-3 py-2 text-xs ${feedback.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>
          {feedback.text}{' '}
          {feedback.login && <Link className="font-bold underline" href={`/login?redirect=${encodeURIComponent(`/guia/${businessSlug}#comentarios`)}`}>Entrar</Link>}
        </div>
      )}
    </div>
  );
}
