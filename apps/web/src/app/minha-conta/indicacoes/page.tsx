import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users } from 'lucide-react';
import { createServerSideClient } from '@/lib/supabase/server';
import { getMyReferralSummaryAction } from '@/app/actions/referrals';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Minhas indicações | Conexão Maçônica',
  robots: { index: false, follow: false },
};

export default async function MyReferralsPage() {
  const supabase = await createServerSideClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fminha-conta%2Findicacoes');

  const result = await getMyReferralSummaryAction();
  const summary = result.summary;

  return (
    <div>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-serif text-2xl font-bold text-[var(--member-primary)]">
              <Users className="h-6 w-6 text-[var(--member-accent)]" />
              Minhas indicações
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              Empresas que você indicou e o que aconteceu depois. Para indicar, abra a página de uma empresa e clique em <strong>Indicar</strong>.
            </p>
          </div>
          <Link href="/guia/empresas" className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold text-stone-700">
            Explorar empresas
          </Link>
        </div>

        {!result.success && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{result.error}</div>}

        {summary && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
                <p className="text-2xl font-bold text-[#3B0B14]">{summary.total}</p>
                <p className="text-xs text-stone-600">Pessoas que você indicou</p>
              </div>
              <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-xs">
                <p className="text-2xl font-bold text-[#3B0B14]">{summary.connections}</p>
                <p className="text-xs text-stone-600">Negócios confirmados</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-stone-200 bg-white p-4 shadow-xs sm:col-span-1">
                <p className="font-mono text-lg font-bold text-[#3B0B14]">{summary.code || '—'}</p>
                <p className="text-xs text-stone-600">Seu código de indicação</p>
              </div>
            </div>

            {summary.by_business.length === 0 ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
                Você ainda não tem indicações. Compartilhe o link de uma empresa e acompanhe aqui.
              </div>
            ) : (
              <ul className="space-y-3">
                {summary.by_business.map((row) => (
                  <li key={row.business_slug || row.business_name} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs">
                    <p className="font-serif text-base font-bold text-stone-900">
                      {row.business_slug ? <Link href={`/guia/${row.business_slug}`} className="hover:underline">{row.business_name}</Link> : row.business_name}
                    </p>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
                      <span><strong className="text-stone-900">{row.indications}</strong> indicação(ões)</span>
                      <span><strong className="text-stone-900">{row.contacts}</strong> chegaram ao contato</span>
                      <span><strong className="text-stone-900">{row.benefits}</strong> resgataram benefício</span>
                      <span><strong className="text-stone-900">{row.connections}</strong> negócio(s) confirmado(s)</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
