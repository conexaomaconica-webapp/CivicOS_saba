'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Building2, HeartOff, MapPin } from 'lucide-react';
import { removeMyFavoriteAction, type MemberFavoriteItem } from '@/lib/member/member-favorites-service';

const LOCAL_KEY = 'cm_directory_favorites';

export default function FavoritesList({ initialItems }: { initialItems: MemberFavoriteItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const remove = (slug: string) => {
    setError('');
    startTransition(async () => {
      const res = await removeMyFavoriteAction(slug);
      if (!res.success) {
        setError('Não foi possível remover agora. Tente novamente.');
        return;
      }
      setItems((current) => current.filter((item) => item.slug !== slug));
      try {
        // Mantém a lista local do navegador alinhada com a conta.
        const local: string[] = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
        localStorage.setItem(LOCAL_KEY, JSON.stringify(local.filter((s) => s !== slug)));
      } catch {
        // ignore
      }
    });
  };

  return (
    <>
      {error && <p className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800" role="alert">{error}</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-stone-50">
                {item.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.logo_url} alt={`Logomarca ${item.name}`} className="h-full w-full object-contain" />
                ) : (
                  <Building2 className="h-6 w-6 text-stone-400" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <Link href={`/guia/${item.slug}`} className="block truncate font-serif font-bold text-stone-900 hover:underline">
                  {item.name}
                </Link>
                {item.category_name && <p className="truncate text-xs text-stone-500">{item.category_name}</p>}
                {(item.city || item.state) && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-stone-500">
                    <MapPin className="h-3 w-3" aria-hidden />
                    {[item.city, item.state].filter(Boolean).join(' / ')}
                  </p>
                )}
              </div>
            </div>
            {item.short_description && <p className="line-clamp-2 text-xs text-stone-600">{item.short_description}</p>}
            <div className="mt-auto flex items-center justify-between gap-2">
              <Link href={`/guia/${item.slug}`} className="rounded-lg bg-[var(--member-primary)] px-3 py-2 text-xs font-bold text-[var(--member-primary-fg)]">
                Ver empresa
              </Link>
              <button
                type="button"
                onClick={() => remove(item.slug)}
                disabled={pending}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
              >
                <HeartOff className="h-4 w-4" aria-hidden />
                Remover
              </button>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
