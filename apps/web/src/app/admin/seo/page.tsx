import React from 'react';
import Link from 'next/link';
import { getSeoCenterDataAction } from '@/app/actions/admin-seo-center';
import { MIN_BUSINESSES_CITY_CATEGORY_INDEXABLE, MIN_BUSINESSES_CITY_INDEXABLE } from '@/lib/seo/directory-seo';
import { seoStatusFor } from '@/lib/seo/seo-score';

export const metadata = {
  title: 'SEO Center · Admin CM',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

const STATUS_STYLE: Record<string, string> = {
  incompleto: 'bg-rose-100 text-rose-800',
  basico: 'bg-amber-100 text-amber-800',
  bom: 'bg-sky-100 text-sky-800',
  muito_bom: 'bg-emerald-100 text-emerald-800',
  completo: 'bg-emerald-200 text-emerald-900',
};

function Card({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: string; tone?: 'warn' }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
      <p className={`mt-1 text-2xl font-extrabold ${tone === 'warn' ? 'text-amber-700' : 'text-[#2a0a10]'}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

export default async function AdminSeoCenterPage() {
  const result = await getSeoCenterDataAction();

  if (!result.success) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        <h1 className="text-lg font-bold">SEO Center</h1>
        <p className="mt-2">{result.error}</p>
      </div>
    );
  }

  const { data } = result;
  const t = data.totals;
  const overall = seoStatusFor(data.averageScore);

  return (
    <div className="space-y-6">
      <div className="border-b border-[#C9A227]/30 pb-4">
        <span className="rounded-full border border-[#C9A227]/40 bg-[#3B0B14] px-2.5 py-0.5 text-xs font-bold text-[#C9A227]">
          Presença digital · Painel Admin
        </span>
        <h1 className="mt-2 font-serif text-2xl font-bold text-[#1f1914]">SEO Center</h1>
        <p className="mt-1 text-xs text-stone-500">
          Saúde de SEO das empresas publicadas. A pontuação é interna da Conexão e mede o quanto o cadastro está completo; não é uma
          nota do Google e não garante posição.
        </p>
      </div>

      {!data.seoColumnsAvailable ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-800">
          A migration 196 ainda não foi aplicada: a opção de noindex por empresa não está disponível.
        </p>
      ) : null}

      <section className="flex flex-wrap items-center gap-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Saúde SEO</p>
          <p className="text-5xl font-extrabold text-[#5d1523]">{data.averageScore}<span className="text-xl text-stone-400">/100</span></p>
        </div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS_STYLE[overall.status]}`}>{overall.statusLabel}</span>
        <p className="max-w-md text-xs text-stone-500">
          Média das {t.published} empresas publicadas. Cidades entram no Google com {MIN_BUSINESSES_CITY_INDEXABLE}+ empresas e
          cidade + categoria com {MIN_BUSINESSES_CITY_CATEGORY_INDEXABLE}+.
        </p>
      </section>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card label="Empresas publicadas" value={t.published} />
        <Card label="Indexáveis" value={t.indexable} />
        <Card label="Noindex" value={t.noindex} tone={t.noindex ? 'warn' : undefined} />
        <Card label="SEO bom ou melhor" value={t.complete} hint="Pontuação 85+" />
        <Card label="SEO incompleto" value={t.incomplete} hint="Pontuação abaixo de 70" tone={t.incomplete ? 'warn' : undefined} />
        <Card label="Cidades com empresas" value={t.cities} hint={`${t.indexableCities} indexáveis`} />
        <Card label="Cidade + categoria" value={t.indexableCategories} hint="Páginas indexáveis" />
        <Card label="Sem endereço (slug)" value={t.withoutSlug} tone={t.withoutSlug ? 'warn' : undefined} />
        <Card label="Sem descrição" value={t.withoutDescription} tone={t.withoutDescription ? 'warn' : undefined} />
        <Card label="Descrições repetidas" value={t.duplicateDescriptions} tone={t.duplicateDescriptions ? 'warn' : undefined} />
        <Card label="Sem logo" value={t.withoutLogo} tone={t.withoutLogo ? 'warn' : undefined} />
        <Card label="Sem capa" value={t.withoutCover} tone={t.withoutCover ? 'warn' : undefined} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="border-b border-stone-200 px-5 py-3">
          <h2 className="text-base font-bold text-stone-900">Empresas, da menor para a maior pontuação</h2>
        </div>
        {data.businesses.length === 0 ? (
          <p className="p-6 text-sm text-stone-500">Nenhuma empresa publicada ainda.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {data.businesses.map((business) => (
              <li key={business.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-stone-900">{business.name}</p>
                  <p className="text-xs text-stone-500">
                    {[business.category, business.city && business.state ? `${business.city} - ${business.state}` : business.city].filter(Boolean).join(' · ') || 'Sem categoria e cidade'}
                    {!business.indexable ? ' · noindex' : ''}
                    {business.duplicateDescription ? ' · descrição repetida' : ''}
                  </p>
                  {business.score.issues.length > 0 ? (
                    <p className="mt-2 text-xs leading-relaxed text-stone-600">
                      <span className="font-semibold">Faltam:</span>{' '}
                      {business.score.issues.slice(0, 4).map((i) => i.label).join('; ')}
                      {business.score.issues.length > 4 ? `; e mais ${business.score.issues.length - 4}` : ''}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_STYLE[business.score.status]}`}>
                    {business.score.score}/100 · {business.score.statusLabel}
                  </span>
                  <Link href={`/admin/empresas/${business.id}`} className="text-sm font-bold text-[#5d1523] hover:underline">
                    Melhorar perfil
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
