import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Heart } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { listMyFavoritesAction } from '@/lib/member/member-favorites-service';
import FavoritesList from './favorites-list';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Meus favoritos | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function MemberFavoritesPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fminha-conta%2Ffavoritos');

  const result = await listMyFavoritesAction();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[var(--member-primary)]">
            <Heart className="h-6 w-6 text-[var(--member-accent)]" aria-hidden />
            Meus favoritos
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            Empresas que você salvou no Guia. Elas ficam guardadas na sua conta e aparecem em qualquer aparelho.
          </p>
        </div>
        <Link href="/guia/empresas" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700">
          Explorar empresas
        </Link>
      </div>

      {!result.success && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.error}</div>}

      {result.success && result.items.length === 0 && (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
          Você ainda não favoritou nenhuma empresa. No Guia, toque no coração do cartão da empresa para salvá-la aqui.
        </div>
      )}

      {result.success && result.items.length > 0 && <FavoritesList initialItems={result.items} />}
    </div>
  );
}
