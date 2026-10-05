'use client';

import { useState, useTransition } from 'react';
import { Heart } from 'lucide-react';
import { toggleConnectionLikeAction } from '@/app/actions/connections';

type Props = {
  connectionId: string;
  initialCount: number;
  initialLiked: boolean;
  /** Para onde voltar depois do login (curtir exige conta de membro). */
  loginRedirect: string;
};

/** Curtir uma conexão do mural. Qualquer pessoa vê a contagem; curtir exige estar logado. */
export function ConnectionLikeButton({ connectionId, initialCount, initialLiked, loginRedirect }: Props) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    setError('');
    // Atualização otimista; se o servidor recusar, volta ao estado anterior.
    const previous = { count, liked };
    setLiked(!liked);
    setCount(count + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await toggleConnectionLikeAction(connectionId);
      if (res.unauthorized) {
        window.location.href = `/login?redirect=${encodeURIComponent(loginRedirect)}`;
        return;
      }
      if (!res.success) {
        setLiked(previous.liked);
        setCount(previous.count);
        setError(res.error || 'Não foi possível curtir.');
        return;
      }
      setLiked(Boolean(res.liked));
      setCount(res.likeCount ?? previous.count);
    });
  };

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? 'Descurtir esta conexão' : 'Curtir esta conexão'}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold transition ${
          liked ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-stone-200 bg-white text-stone-600 hover:border-rose-300 hover:text-rose-700'
        }`}
      >
        <Heart className={`h-3.5 w-3.5 ${liked ? 'fill-rose-600 text-rose-600' : ''}`} />
        {count > 0 ? count : 'Curtir'}
      </button>
      {error && (
        <span className="mt-1 text-[10px] text-rose-700" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
